'use client'

import { useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Polls for participant changes on a study and triggers `router.refresh()`
 * to re-run server components with fresh data.
 *
 * Why polling instead of Supabase Realtime postgres_changes?
 * The app uses Better Auth (not Supabase Auth), so the browser Supabase
 * client only has an anon-key JWT. The `participants` table RLS checks
 * org membership via `request.jwt.claims ->> 'sub'`, which fails for
 * the anon key → postgres_changes events are silently dropped.
 *
 * Participant completions come from a separate page (/s/[studyCode]),
 * so broadcast channels (used for dashboard sync) won't work here.
 *
 * Uses startTransition to prevent Suspense boundaries from showing
 * loading fallbacks during background refreshes (avoids visible blink).
 */
export function useRealtimeResultsRefresh(studyId: string, enabled = true) {
  const router = useRouter()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!studyId || !enabled) return

    intervalRef.current = setInterval(() => {
      startTransition(() => {
        router.refresh()
      })
    }, 10000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [studyId, enabled, router, startTransition])
}
