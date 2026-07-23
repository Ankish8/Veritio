# Autosave Reliability Overhaul

Date: 2026-07-23

## Problem

Builder autosave currently has several independent correctness and latency problems:

- A save acknowledgement can mark edits made during the request as saved even though those edits were never sent.
- The scheduler observes only the dirty boolean. Once a store is dirty, later edits do not restart the debounce or reliably queue a follow-up save.
- Content and metadata are saved sequentially, increasing visible save time.
- Some study types write the same settings document from parallel requests, so the last response can overwrite newer flow settings.
- Dirty version information is not persisted for content stores. A reload can replace a locally persisted unsaved draft with older server data.
- Flow-store hydration is not part of the builder readiness gate, allowing late localStorage hydration to replace freshly loaded API data.
- Preview and launch flush content but not necessarily metadata through the same save pipeline.
- Aggregate status can hide a flow error behind a successful content status.
- Empty flow-question drafts are omitted from the request while the complete local state is acknowledged, producing a server/client mismatch.

## Goals

- Never acknowledge data that was not durably accepted by the API.
- Keep at most one save flight active for a builder.
- Coalesce typing and drag activity without allowing continuous editing to postpone persistence indefinitely.
- Save edits made during an active request immediately after that request completes.
- Preserve an unsaved draft across refreshes, crashes, offline periods, and transient failures.
- Use one complete save path for autosave, manual save, preview, and launch.
- Reduce request latency and eliminate duplicate writes without changing participant data contracts.
- Make errors visible, retryable, and recoverable without repetitive toast noise.

## Selected Architecture

### Latest-wins coordinator

A shared coordinator owns scheduling and flight control:

- trailing debounce: 500 ms after the latest edit;
- maximum wait: 2 seconds from the first pending edit;
- single flight: no overlapping save runs from autosave, keyboard shortcuts, preview, or launch;
- exact drain: after every response, re-check current dirty state and immediately schedule a follow-up when a newer revision exists;
- reconnect recovery: preserve dirty state offline and flush after the browser returns online;
- lifecycle flush: start a flush on `visibilitychange`/`pagehide`, while retaining the native unsaved-changes warning as the final guard;
- retry: API-level exponential backoff for transient errors, followed by coordinator-level retry while the draft remains dirty.

### Monotonic revisions and exact acknowledgements

Content and flow stores keep monotonic current and saved revisions. A save captures both the payload and the revision before sending. Success advances only the saved revision represented by that payload. If a newer edit exists, current revision remains ahead of saved revision and the UI stays dirty.

Metadata continues to use snapshot comparison, but success always records the exact sent snapshot. It never snapshots the newer current state after an older request succeeds.

### Reload recovery

Content stores persist current revision, saved revision, and the last acknowledged snapshot alongside their existing local draft data. During builder initialization:

- cached state is used only when its `studyId` matches the current study;
- a matching dirty cached draft is preserved and scheduled for save;
- clean or mismatched cached state is replaced with server data;
- initialization waits for metadata, flow, and content hydration before making the recovery decision.

### One save pipeline

`useBuilderSave` becomes the complete persistence operation. It saves dirty content/flow and dirty metadata concurrently, then acknowledges each domain independently with its exact sent state. Builder autosave, manual save, preview, and launch all call this same operation.

### Request de-duplication

- First Click content requests stop writing the study settings JSON; the existing study PATCH is the single settings write.
- Live Website content saves write settings through the fast content endpoint only when flow is clean. When flow is dirty, the single extended-settings PATCH owns the complete settings document.
- Independent content, flow-question, and metadata requests remain parallel.

### Status contract

Aggregate status priority is:

1. `saving` when any domain is in flight;
2. `error` when any dirty domain failed;
3. `idle` while acknowledged revisions trail current revisions;
4. `saved` only when every domain is clean.

`lastSavedAt` represents the most recent successful acknowledgement across content, flow, and metadata.

## Error Handling

- Validation/auth errors remain dirty and require a user edit, manual retry, or restored authorization.
- Network, rate-limit, and server failures use bounded exponential retry per request.
- After bounded request retries fail, the coordinator retains the local draft and retries later instead of marking it clean.
- Automatic failures update the header without toast spam; manual/preview/launch failures provide an actionable toast and block the requested transition.
- Partial request success does not produce a false global “Saved” state.

## Testing

Automated coverage will verify:

- edits made during an in-flight save remain dirty and trigger a second save;
- multiple rapid edits produce one trailing save;
- continuous edits are persisted by the maximum-wait deadline;
- concurrent save triggers join one flight;
- failures retain dirty state and retry;
- exact content, flow, and metadata acknowledgements never clean newer state;
- dirty persisted drafts survive rehydration and are not overwritten by server initialization;
- First Click and Live Website issue only one settings write;
- flow-question payload and acknowledged state match;
- aggregate errors and timestamps include flow state.

Live verification will use study `341e0b72-0278-4aa0-9939-3de1b56318fd` and cover:

1. rapid successive edits;
2. an edit during the visible saving state;
3. manual save;
4. refresh/reload persistence;
5. preview flush;
6. task-widget persistence in the participant study.

## Non-goals

- Replacing normalized study tables with a new snapshot/event-sourcing backend.
- Changing collaboration entitlements or using Yjs as a substitute for durable API persistence.
- Publishing invalid studies; launch validation remains authoritative.
