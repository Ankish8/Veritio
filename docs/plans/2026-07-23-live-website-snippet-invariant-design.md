# Live Website Snippet-ID Invariant

## Problem

Live website studies can be persisted with `mode: "reverse_proxy"` or
`mode: "snippet"` while `snippetId` is missing. The participant player only
constructs the instrumented proxy URL when both the tracking mode and snippet ID
are present, so an invalid study silently opens the target website directly and
never injects the task widget.

The invalid state is currently possible because new studies default to Auto Mode
without generating an ID, the builder only generates an ID when switching modes,
and validation does not reject the mismatch.

## Design

Treat the snippet ID as a required invariant for every companion tracking mode:

- `reverse_proxy` and `snippet` must have a valid snippet ID.
- `url_only` does not require one, but may retain an existing ID for safe mode
  switching.

Enforce the invariant at every trust boundary:

1. A shared utility defines companion modes, validates snippet IDs, and creates
   cryptographically random IDs.
2. New live website studies receive an ID during backend initialization.
3. The live website save endpoint repairs a missing or invalid ID before
   persistence and returns the canonical saved settings to the client.
4. The builder repairs legacy state on load and mode selection.
5. Preview and launch validation reject any invalid companion-mode configuration.
6. The participant player shows a configuration error instead of silently opening
   an uninstrumented target site if invalid data reaches it.
7. A database migration backfills all existing affected studies.

## Data Flow

The backend remains the canonical enforcement point. Builder-generated IDs provide
immediate UX, while save-time normalization guarantees correctness for all clients.
The returned canonical settings are applied to the builder store so generated or
repaired values cannot diverge between browser state and persisted state.

Existing studies are repaired once by migration. Runtime normalization remains in
place for defense in depth and future import or integration paths.

## Error Handling

Missing or malformed IDs are repaired when a trusted mutation can safely persist a
canonical value. Read-only participant execution never invents a temporary ID,
because that ID would not match backend task and event routes. It renders a clear
configuration error and prevents an untracked session instead.

## Verification

Regression coverage must prove:

- companion modes create or normalize an ID;
- Observer Mode does not require one;
- study initialization persists an ID;
- the save endpoint returns canonical repaired settings;
- validation blocks invalid preview or launch;
- the participant URL builder never silently falls back to a direct URL;
- the backfill migration repairs existing rows without changing unrelated studies.

After automated checks, verify the user-created production study through its
builder and participant preview: the persisted study must have a snippet ID, the
opened URL must use the proxy worker, and the task widget must be visible and able
to start and complete the configured task.
