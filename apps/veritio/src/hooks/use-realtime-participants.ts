'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAuthFetchInstance } from '@/lib/swr'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface ParticipantStats {
  total: number
  completed: number
  inProgress: number
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

/**
 * Real-time participant count via Supabase Realtime broadcast channels.
 * Server-side: a Postgres trigger on `participants` calls realtime.send()
 * on `participants:{studyId}` for every INSERT/UPDATE/DELETE.
 * Initial counts come from `/api/studies/{studyId}/stats` (Motia, service_role).
 */
export function useRealtimeParticipants(
  studyId: string,
  options: UseRealtimeParticipantsOptions = {}
) {
  const { enabled = true } = options

  const [stats, setStats] = useState<ParticipantStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
  })
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())
  const isCleaningUpRef = useRef(false)

  const fetchStats = useCallback(async () => {
    try {
      const authFetch = getAuthFetchInstance()
      const res = await authFetch(`/api/studies/${studyId}/stats`)
      if (!res.ok) throw new Error('failed')
      const json = await res.json()
      setStats({
        total: json.participantStats?.total ?? 0,
        completed: json.participantStats?.completed ?? 0,
        inProgress: json.participantStats?.inProgress ?? 0,
      })
      setError(null)
    } catch {
      setError('Failed to load participant statistics')
    }
  }, [studyId])

  useEffect(() => {
    if (!enabled || !studyId) return

    isCleaningUpRef.current = false

    const supabase = supabaseRef.current

    fetchStats()

    const channel = supabase
      .channel(`participants:${studyId}`)
      .on('broadcast', { event: 'INSERT' }, () => {
        setStats((prev) => ({
          total: prev.total + 1,
          completed: prev.completed,
          inProgress: prev.inProgress + 1,
        }))
      })
      .on('broadcast', { event: 'UPDATE' }, ({ payload }) => {
        const p = payload as ParticipantBroadcastPayload
        if (p.completed_at && !p.old_completed_at) {
          setStats((prev) => ({
            total: prev.total,
            completed: prev.completed + 1,
            inProgress: Math.max(0, prev.inProgress - 1),
          }))
        }
      })
      .on('broadcast', { event: 'DELETE' }, ({ payload }) => {
        const p = payload as ParticipantBroadcastPayload
        const wasCompleted = !!p.completed_at
        setStats((prev) => ({
          total: Math.max(0, prev.total - 1),
          completed: wasCompleted ? Math.max(0, prev.completed - 1) : prev.completed,
          inProgress: !wasCompleted ? Math.max(0, prev.inProgress - 1) : prev.inProgress,
        }))
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

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
    }
  }, [studyId, enabled, fetchStats])

  const refresh = useCallback(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    isConnected,
    error,
    refresh,
  }
}
