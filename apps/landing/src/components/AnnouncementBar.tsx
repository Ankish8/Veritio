'use client'

import { useState, useSyncExternalStore } from 'react'

const KEY = 'ltd-bar-dismissed-v1'

// Read the persisted "dismissed" flag from localStorage without a setState-in-
// effect cascade. Server snapshot is `false` so SSR and the first client render
// both show the bar (hydration-safe); on the client it resolves to the stored
// value. There is no cross-tab subscription — the flag only changes via this
// component's own dismiss handler — so subscribe is a no-op.
function subscribe(): () => void {
  return () => {}
}
function getSnapshot(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
function getServerSnapshot(): boolean {
  return false
}

/**
 * Site-wide lifetime-deal announcement bar. Sits above the fixed nav; the layout
 * offset (nav top + body padding) is driven by the --ltd-bar-h CSS var so that
 * dismissing collapses the bar and removes the offset in one shot. A tiny inline
 * script in the root layout adds `ltd-bar-dismissed` before paint for returning
 * visitors, so there is no flash.
 */
export default function AnnouncementBar() {
  const persistedDismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [sessionDismissed, setSessionDismissed] = useState(false)

  if (persistedDismissed || sessionDismissed) return null

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
    document.documentElement.classList.add('ltd-bar-dismissed')
    setSessionDismissed(true)
  }

  return (
    <div className="ltd-bar" role="region" aria-label="Lifetime deal announcement">
      <span className="ltd-bar-msg">
        <strong>Lifetime deal</strong> · Own Veritio for life from $49.
        <span className="ltd-bar-sub"> Pay once, no subscription.</span>
      </span>
      <a className="ltd-bar-cta" href="/ltd">
        Get the deal <span aria-hidden="true">→</span>
      </a>
      <button className="ltd-bar-close" aria-label="Dismiss announcement" onClick={dismiss}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
    </div>
  )
}
