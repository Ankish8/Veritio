# Card Sort Recording and Finished Actions

## Goal

Keep the participant's **Finished** action visible and usable throughout a
recorded card-sort session without losing recording, upload, error, or
think-aloud feedback.

## Root cause

The card-sort player renders recording state twice:

- `CardSortHeader` renders an inline recording status immediately before the
  **Finished** button.
- `RecordingOverlays` renders a second fixed top-right status at `z-50`.

The fixed status overlaps the header's rightmost action, which sits at `z-10`.
When every card has been sorted, the page correctly enables **Finished**, but
the duplicate fixed status visually covers it.

## Approved design

- Render recording state exactly once, inside `CardSortHeader`.
- Keep **Finished** as the rightmost, non-shrinking primary action.
- Keep instructions, recording status, and **Finished** in a responsive action
  group. Compact secondary labels at narrow widths before allowing the primary
  action to be obscured.
- Preserve the recording status states: recording, paused, uploading with
  progress, and recording error.
- Preserve the think-aloud audio-level visualization beside the inline
  recording status.
- Keep `RecordingOverlays` responsible only for the think-aloud prompt, which
  may still float independently because it is transient and dismissible.
- Do not change card-sort validation, submission, recording shutdown, upload,
  or persistence behavior.

## Implementation

1. Extend the header's recording view model with error and audio-level state.
2. Make the header action group responsive and ensure the **Finished** button
   cannot shrink or be covered.
3. Remove the fixed recording indicator from the card-sort overlay component,
   leaving the think-aloud prompt intact.
4. Update desktop and mobile card-sort views to pass the complete recording
   display state to the header.
5. Add component regression coverage proving that a recording session renders
   one status and one visible **Finished** action, including narrow layouts.

## Verification

- Run focused Vitest coverage for the header and overlay components.
- Run TypeScript and ESLint checks for the changed files.
- Verify locally in Chrome at desktop and mobile widths with recording active:
  instructions remain available, recording is shown once, and **Finished**
  remains visible and clickable.
- Verify upload, paused, error, and think-aloud prompt states do not introduce a
  new overlap.
- Deploy the verified commit and repeat the recorded card-sort check against
  production.
