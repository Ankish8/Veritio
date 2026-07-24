# Instant Builder Navigation

## Problem

Builder tab switches currently take roughly 1.3-1.7 seconds in production even
when every tab has already rendered. A warm builder reload takes roughly
0.8-1.5 seconds before the Details panel is usable.

The delay has three causes:

1. Builder navigation is derived from `useSearchParams()`. Each tab click calls
   `router.replace()`, which starts an App Router navigation on a
   `force-dynamic` page. The visible tab therefore waits for a new RSC response.
2. The view-transition wrapper makes the delayed update look like a long tab
   animation.
3. Every builder tab is force-mounted on initial load, so hidden editors,
   previews, and study-flow components compete with the visible tab during
   hydration.

The initial builder route also waits for study metadata, project metadata, Yjs
permission/token work, flow questions, and all study-specific content before
rendering the interactive shell.

## Goals

- Make a warm tab switch visibly complete in the same frame, with a target of
  less than 100 ms from click to active panel.
- Keep tab deep links, reload persistence, keyboard navigation, and the clean
  default URL.
- Preserve mounted state after a tab has been visited so editors and embedded
  previews do not reset.
- Make the Details-first setup page usable before collaboration and unrelated
  tab work finishes.
- Preserve the latest-change-wins autosave and Yjs synchronization guarantees.

## Design

### Local navigation with URL synchronization

Builder tabs are client UI state. Update the URL with
`window.history.replaceState()` instead of `router.replace()`. Next.js integrates
native history updates with `useSearchParams()`, so deep links continue to work
without issuing a server navigation.

Remove the document view-transition wrapper from builder tab clicks. The tab
control and underline still provide immediate selected-state feedback.

### Mount active and visited tabs only

On first render, mount only the active tab. When another tab becomes active,
mount it immediately and retain it in a per-study visited set. Inactive,
unvisited tabs have no component tree, so their dynamic bundles and effects do
not run during initial hydration.

Retain the existing hover/focus bundle prefetch. Restrict idle prefetch to the
current study type plus Study Flow rather than importing builders for all seven
study types.

### Remove the builder data waterfall

Start type-specific content loading as soon as study metadata is available,
without waiting for the project and collaboration bootstrap requests. Keep the
queries parallel and pass the completed snapshot into the existing store
initialization path.

The first implementation will keep server-owned initial data and autosave
contracts intact. If measurement shows the remaining setup-page wait is still
material, a follow-up can stream the metadata shell and hydrate tab-specific
data behind it. That larger split is deliberately excluded until the safer
navigation and mounting changes are measured.

### Entry-point prefetch

The project studies table already uses Next.js links. Add intent prefetch for
the exact builder URL on pointer enter and keyboard focus so the dynamic RSC
payload starts before the click without prefetching every visible study.

## Error handling

- A history update failure falls back to the current in-memory view; it must
  never block the selected tab.
- A dynamically loaded first-visit tab shows the existing tab skeleton.
- Prefetch failures remain non-blocking and are retried naturally by the
  dynamic import or route navigation.
- Autosave remains independent of tab selection. Switching tabs neither waits
  for a save nor cancels one.

## Verification

- Unit-test native-history URL updates for default and non-default tabs.
- Unit-test that tab changes do not call the Next router.
- Verify only the active tab mounts initially and visited tabs remain mounted.
- Run type-check, focused tests, lint on changed files, and a production build.
- Browser-test Details, Content, Study Flow, Settings, and Branding:
  - first visit,
  - repeat visit,
  - URL update,
  - direct deep link,
  - reload persistence,
  - no console errors.
- Repeat the production-style timing series and report median and range against
  the captured baseline.
