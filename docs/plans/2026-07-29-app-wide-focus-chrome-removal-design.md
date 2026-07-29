# App-wide Focus Chrome Removal

## Goal

Remove visible focus and selection chrome across the Veritio application. Buttons,
tabs, inputs, textareas, and custom interactive controls must not gain an outline
or Tailwind focus ring when clicked, focused, or keyboard-navigated.

## Scope

The change applies at the main application's global stylesheet so it covers all
dashboard, participant, public-results, admin, and PDF-render routes, including
native controls and controls that do not use the shared UI primitives.

Only focus-generated chrome is removed. The following states remain unchanged:

- Normal input, card, table, and control borders
- Active tab underlines, selected backgrounds, and pressed states
- Validation and destructive error borders
- Structural shadows and rings that are visible without focus

## Approach

Replace the existing universal keyboard-focus outline with a global focus reset.
The reset removes native outlines and neutralizes Tailwind's focus ring variables
on focused elements without setting `box-shadow: none`, which would incorrectly
remove ordinary component shadows.

Keeping the rule global avoids duplicated edits across the app-local and shared UI
component libraries and also covers future controls by default.

## Verification

- Run the focused stylesheet regression test.
- Run the Veritio type check or the narrowest configured static check that covers
  the stylesheet import.
- Verify in the browser that a tab, button, text input, and textarea show no
  focus border or ring after mouse and keyboard focus.
- Confirm that the active tab indicator, normal field border, and validation
  border remain visible.
