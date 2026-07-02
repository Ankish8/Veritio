'use client'

import { useEffect, useState } from 'react'

const KEY = 'ltd-bar-dismissed-v1'

/**
 * Site-wide lifetime-deal announcement bar. Sits above the fixed nav; the layout
 * offset (nav top + body padding) is driven by the --ltd-bar-h CSS var so that
 * dismissing collapses the bar and removes the offset in one shot. A tiny inline
 * script in the root layout adds `ltd-bar-dismissed` before paint for returning
 * visitors, so there is no flash.
 */
export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === '1') {
        setDismissed(true)
        document.documentElement.classList.add('ltd-bar-dismissed')
      }
    } catch {
      /* localStorage unavailable — just show the bar */
    }
  }, [])

  if (dismissed) return null

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
    document.documentElement.classList.add('ltd-bar-dismissed')
    setDismissed(true)
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
