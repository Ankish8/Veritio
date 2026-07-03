'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

/**
 * Client-side PostHog for the marketing site. Enables the full product
 * feature set for ad/landing analytics:
 *   - Pageviews (incl. SPA history navigations) + pageleave
 *   - Autocapture (clicks, inputs, form submits)
 *   - Session replay
 *   - Heatmaps / clickmaps
 *   - Web vitals (performance)
 *   - Exception (error) autocapture
 *
 * The project API key is public by design (it only allows event ingestion),
 * so shipping it in the client bundle via NEXT_PUBLIC_ is expected.
 *
 * Note: session replay must ALSO be toggled on in the PostHog project
 * settings (Settings -> Session Replay -> Record user sessions) — the client
 * config below opts in, but the server-side project setting is the master switch.
 */
export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    // No-op when unconfigured (e.g. local dev without the key) and never
    // double-init across fast-refresh / re-mounts.
    if (!key || posthog.__loaded) return

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      ui_host: 'https://us.posthog.com',
      defaults: '2025-05-24',
      // Explicit opt-ins (belt-and-suspenders on top of `defaults`):
      autocapture: true,
      capture_pageview: 'history_change',
      capture_pageleave: true,
      capture_performance: true,
      capture_exceptions: true,
      enable_heatmaps: true,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: false,
        maskInputOptions: { password: true, email: false },
      },
      persistence: 'localStorage+cookie',
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
