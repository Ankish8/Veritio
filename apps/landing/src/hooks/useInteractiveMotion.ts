'use client'

import { useSyncExternalStore } from 'react'

// Feature-detect whether the interactive/animated demos should run: true on the
// client unless the user prefers reduced motion. Uses useSyncExternalStore so
// the value is read from the browser without a setState-in-effect cascade, while
// staying hydration-safe — the server snapshot is `false`, so SSR and the first
// client render agree (static fallback), then it flips to `true` on the client.
// Also live-updates if the OS reduced-motion preference changes.

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return !window.matchMedia(QUERY).matches
}

function getServerSnapshot(): boolean {
  return false
}

export function useInteractiveMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
