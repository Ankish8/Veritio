'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAuthFetchInstance } from '@/lib/swr'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface ParticipantStats {
  total: number
  completed: number
  inProgress: number
  abandoned: number
  screened: number
  /** Percentage 0-100 of total participants that finished */
  completionRate: number
  /** Mean completion time across completed participants, null when none */
  averageDurationSeconds: number | null
  lastResponseAt: string | null
}

const EMPTY_STATS: ParticipantStats = {
  total: 0,
  completed: 0,
  inProgress: 0,
  abandoned: 0,
  screened: 0,
  completionRate: 0,
  averageDurationSeconds: null,
  lastResponseAt: null,
}

/** Derived fields must stay consistent with the counts we bump optimistically. */
function withCompletionRate(stats: ParticipantStats): ParticipantStats {
  return {
    ...stats,
    completionRate:
      stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
  }
}

interface UseRealtimeParticipantsOptions {
  enabled?: boolean
}

interface ParticipantBroadcastPayload {
  id: string
  study_id: string
  completed_at: string | null
  old_completed_at: string | null
  status: string | null
  old_status: string | null
}

/** Resync window after a broadcast, long enough to coalesce a burst of events. */
const RESYNC_DEBOUNCE_MS = 800

/**
 * Real-time participant stats via Supabase Realtime broadcast channels.
 * Server-side: a Postgres trigger on `participants` calls realtime.send()
 * on `participants:{studyId}` for every INSERT/UPDATE/DELETE.
 * Initial counts come from `/api/studies/{studyId}/stats` (service_role).
 *
 * Counts are bumped optimistically so the UI reacts instantly, then a debounced
 * refetch resyncs the fields a broadcast cannot derive (average duration, last
 * response) and corrects any drift.
 */
export function useRealtimeParticipants(
  studyId: string,
  options: UseRealtimeParticipantsOptions = {}
) {
  const { enabled = true } = options

  const [stats, setStats] = useState<ParticipantStats>(EMPTY_STATS)
  // Starts true so consumers can render a placeholder instead of a bogus zero.
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())
  const isCleaningUpRef = useRef(false)
  const resyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const authFetch = getAuthFetchInstance()
      const res = await authFetch(`/api/studies/${studyId}/stats`)
      if (!res.ok) throw new Error('failed')
      const json = await res.json()
      const participantStats = json.participantStats ?? {}
      setStats({
        total: participantStats.total ?? 0,
        completed: participantStats.completed ?? 0,
        inProgress: participantStats.inProgress ?? 0,
        abandoned: participantStats.abandoned ?? 0,
        screened: participantStats.screened ?? 0,
        completionRate: json.completionRate ?? 0,
        averageDurationSeconds: json.averageDurationSeconds ?? null,
        lastResponseAt: json.lastResponseAt ?? null,
      })
      setError(null)
    } catch {
      setError('Failed to load participant statistics')
    } finally {
      setIsLoading(false)
    }
  }, [studyId])

  const scheduleResync = useCallback(() => {
    if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current)
    resyncTimerRef.current = setTimeout(() => {
      resyncTimerRef.current = null
      if (isCleaningUpRef.current) return
      fetchStats()
    }, RESYNC_DEBOUNCE_MS)
  }, [fetchStats])

  useEffect(() => {
    if (!enabled || !studyId) {
      // Never leave a disabled hook reporting "still loading" — consumers use
      // that flag to suppress rendering and would suppress forever.
      setIsLoading(false)
      return
    }

    isCleaningUpRef.current = false

    const supabase = supabaseRef.current

    fetchStats()

    const channel = supabase
      .channel(`participants:${studyId}`)
      .on('broadcast', { event: 'INSERT' }, () => {
        setStats((prev) =>
          withCompletionRate({
            ...prev,
            total: prev.total + 1,
            inProgress: prev.inProgress + 1,
          })
        )
        scheduleResync()
      })
      .on('broadcast', { event: 'UPDATE' }, ({ payload }) => {
        const p = payload as ParticipantBroadcastPayload
        if (p.completed_at && !p.old_completed_at) {
          setStats((prev) =>
            withCompletionRate({
              ...prev,
              completed: prev.completed + 1,
              inProgress: Math.max(0, prev.inProgress - 1),
            })
          )
        }
        scheduleResync()
      })
      .on('broadcast', { event: 'DELETE' }, ({ payload }) => {
        const p = payload as ParticipantBroadcastPayload
        const wasCompleted = !!p.completed_at
        setStats((prev) =>
          withCompletionRate({
            ...prev,
            total: Math.max(0, prev.total - 1),
            completed: wasCompleted ? Math.max(0, prev.completed - 1) : prev.completed,
            inProgress: !wasCompleted ? Math.max(0, prev.inProgress - 1) : prev.inProgress,
          })
        )
        scheduleResync()
      })
      .subscribe((status) => {
        if (isCleaningUpRef.current) return

        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setError(null)
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setIsConnected(false)
          if (status === 'CHANNEL_ERROR') {
            setError('Lost connection to real-time updates')
          }
        }
      })

    channelRef.current = channel

    return () => {
      isCleaningUpRef.current = true

      if (resyncTimerRef.current) {
        clearTimeout(resyncTimerRef.current)
        resyncTimerRef.current = null
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
    }
  }, [studyId, enabled, fetchStats, scheduleResync])

  const refresh = useCallback(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    isLoading,
    isConnected,
    error,
    refresh,
  }
}
