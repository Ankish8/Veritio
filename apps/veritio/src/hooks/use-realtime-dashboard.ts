'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mutate as globalMutate } from 'swr'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Broadcast-based real-time dashboard sync.
 *
 * Two sources of broadcast events on `dashboard:{organizationId}`:
 * 1. Client-initiated: project/study CRUD hooks call broadcastDashboardChange()
 *    after a successful mutation, which sends a broadcast to all org members.
 * 2. Server-initiated: a Postgres trigger on `studies` calls realtime.send()
 *    on the same channel for any INSERT/UPDATE/DELETE — covers mutations
 *    from cron jobs, event handlers, and any code path that doesn't go
 *    through the client hooks.
 *
 * Receivers revalidate all dashboard-related SWR caches on either event.
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
      .on('broadcast', { event: 'dashboard_change' }, () => {
        revalidateAll()
      })
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
