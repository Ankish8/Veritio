# Study Participant Hard Delete

## Goal

Researchers can permanently delete one or more selected participants from a
study's Participants list. Deletion removes every record and recording that
belongs to those participant responses in that study. If a response originated
from the reusable Panel, the Panel profile and its global notes, tags, and
demographics remain intact.

## User Experience

- Add a destructive `Delete` action beside the existing `Exclude` and `Include`
  bulk actions.
- Always require confirmation, even for a single participant.
- State clearly that responses, analysis data, recordings, and transcripts are
  permanently removed and cannot be restored.
- State clearly that reusable Panel profiles are not deleted.
- Keep the current selection when deletion fails so the researcher can retry.
- Clear the selection and refresh participant, analysis, recording, and study
  count data only after the server confirms deletion.

## API and Authorization

Add an editor-protected bulk endpoint:

`POST /api/studies/:studyId/participants/bulk-delete`

The request accepts 1–500 UUIDs. The existing study permission middleware
restricts the operation to owners, admins, and editors. The service first
resolves the requested IDs against the route's study ID, rejects a request that
contains no matching participants, and never deletes a participant from another
study.

## Deletion Order and Consistency

Use a hybrid operation:

1. Fetch the study-scoped participants and their recording metadata.
2. Permanently remove each participant recording prefix from Cloudflare R2 and
   abort any active multipart upload. R2 deletion is idempotent, so a retry is
   safe.
3. Call a PostgreSQL function that removes all relational data in one
   transaction.

Media is deleted before database rows. If media deletion fails, database
deletion does not begin. If the database transaction fails after media deletion,
the participant records remain visible and the researcher can retry; the retry
sees already-absent R2 objects as success. This favors privacy and avoids
untracked media objects.

The database function explicitly deletes study-specific Panel incentive and
participation rows, recording children and recordings, all response/attempt/
event/analysis rows keyed by participant, and finally the participant rows.
Foreign-key cascades remain useful safeguards, but the operation does not assume
that every legacy constraint is configured identically.

The function returns the IDs actually deleted. It does not touch
`panel_participants`, `panel_participant_notes`, or `panel_participant_tags`.

## Client Refresh

Expose one deletion callback to the shared participants list base so every study
type gets the same control and confirmation dialog. After success, revalidate
all study-scoped SWR keys plus study/dashboard count keys and refresh the current
route. Show a success toast with the server-confirmed count. Surface the server
error without optimistic removal.

## Verification

- Service tests cover study scoping, R2 cleanup, transaction invocation,
  idempotent missing media, and abort-on-media-failure behavior.
- Endpoint tests cover schema limits, editor authorization wiring, not-found
  behavior, and response counts.
- Component tests cover confirmation copy, pending state, success selection
  clearing, and failure selection preservation.
- Run focused Vitest suites and monorepo type-check.
- In the live local app, delete a disposable test participant and verify the
  Participants, Analysis, and Recordings views plus a full reload. Do not delete
  existing production-backed participant data during QA.
