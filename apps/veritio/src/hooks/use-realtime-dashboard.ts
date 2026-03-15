'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mutate as globalMutate } from 'swr'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Broadcast-based real-time dashboard sync.
 *
 * Why Broadcast instead of postgres_changes?
 * - The app uses Better Auth (not Supabase Auth), so the browser Supabase
 *   client only has an anon-key JWT with no user `sub` claim.
 * - The `projects` table RLS checks org membership via `request.jwt.claims ->> 'sub'`,
 *   which fails for the anon key → postgres_changes events are silently dropped.
 * - Broadcast channels are pure WebSocket (no RLS), so they work with any JWT.
 *
 * How it works:
 * 1. All clients join a broadcast channel scoped to their org.
 * 2. When a client mutates data (create/update/delete), it calls
 *    `broadcastDashboardChange()` which sends a broadcast to all org members.
 * 3. Receivers revalidate all dashboard-related SWR caches.
 *
 * Additionally subscribes to `studies` postgres_changes since the studies
 * table has a permissive RLS policy (`USING (true)`).
 */

let _broadcastChannel: RealtimeChannel | null = null

/**
 * Broadcast a dashboard change to all org members.
 * Call this after a successful create/update/delete API call.
 */
export function broadcastDashboardChange(type: 'project' | 'study' = 'project') {
  if (_broadcastChannel) {
    _broadcastChannel.send({
      type: 'broadcast',
      event: 'dashboard_change',
      payload: { type, ts: Date.now() },
    }).catch(() => {})
  }
}

export function useRealtimeDashboard(organizationId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  const revalidateAll = useCallback(() => {
    globalMutate(
      (key) =>
        typeof key === 'string' &&
        (key.startsWith('/api/projects') ||
          key.startsWith('/api/dashboard/stats') ||
          key.startsWith('/api/sidebar/')),
      undefined,
      { revalidate: true }
    )
  }, [])

  useEffect(() => {
    if (!organizationId) return

    const supabase = supabaseRef.current

    const channel = supabase
      .channel(`dashboard:${organizationId}`)
      // --- Broadcast: works with anon key (no RLS) ---
      .on('broadcast', { event: 'dashboard_change' }, () => {
        revalidateAll()
      })
      // --- Studies postgres_changes: works because studies RLS is USING (true) ---
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'studies',
        },
        () => {
          revalidateAll()
        }
      )
      .subscribe()

    channelRef.current = channel
    _broadcastChannel = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      _broadcastChannel = null
    }
  }, [organizationId, revalidateAll])
}
