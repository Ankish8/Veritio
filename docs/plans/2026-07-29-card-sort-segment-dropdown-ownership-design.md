# Card Sort Segment Dropdown Ownership

## Goal

Keep the participant segment selector in each card-sort analysis panel header
while ensuring that opening the visible selector creates exactly one usable menu.
No menu may appear at the viewport origin or intercept interaction from a hidden
analysis panel.

## Root Cause

Card-sort analysis builds one controlled dropdown element and renders it in
several tab panels. Similarity Matrix is kept mounted while inactive so its
expensive visualization does not reload. Every rendered dropdown receives the
same `segmentDropdownOpen` boolean, so opening the visible panel's selector also
opens the hidden Similarity Matrix selector. Radix portals both menu contents;
the hidden selector has a zero-size trigger and its menu falls back to the
top-left of the viewport.

Other study analysis views render their segment selector once in a shared tab
header and do not have this duplicate-owner pattern.

## Approved Design

- Preserve the current per-panel selector placement and filtering behavior.
- Extract the card-sort selector into a component that owns its own open state.
- Render a distinct selector component in every panel that needs the action.
- Keep the selected segment, saved segments, and filtering callbacks shared at
  the analysis level so changing a segment still updates every sub-tab.
- Keep Create segment and View all segments behavior unchanged.
- Do not change the shared dropdown primitive or disable portals globally.

## Alternatives Considered

- Move one selector into the shared sub-tab toolbar. This removes duplicate
  instances but changes the established page layout.
- Hide or suppress dropdown portals for inactive tabs. This treats the symptom,
  couples overlay behavior to tab CSS, and remains fragile for future mounted
  panels.

## Verification

- Add a component regression test that renders two selector instances, opens
  one, and asserts that only one menu content is open.
- Verify All included participants, a saved segment, Create segment, and View
  all segments still invoke the correct callbacks.
- Run the focused Vitest file and a narrow TypeScript/static check for the
  changed files.
- In the browser, open the selector on Cards, Categories, Standardization Grid,
  and Similarity Matrix. Each click must show one menu beside its trigger, the
  top-left duplicate must be absent, and menu items must be clickable.
