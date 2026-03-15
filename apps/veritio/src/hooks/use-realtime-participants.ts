'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface ParticipantStats {
  total: number
  completed: number
  inProgress: number
}

interface UseRealtimeParticipantsOptions {
  /** Whether to enable real-time updates (default: true) */
  enabled?: boolean
}

/** Real-time participant count updates via Supabase Realtime. */
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
  // CRITICAL: Flag to prevent state updates during intentional cleanup
  // This prevents race conditions where removeChannel() fires CLOSED callback
  const isCleaningUpRef = useRef(false)

  const fetchStats = useCallback(async () => {
    try {
      const supabase = supabaseRef.current

      const { data: participants, error: fetchError } = await supabase
        .from('participants')
        .select('id, completed_at')
        .eq('study_id', studyId)

      if (fetchError) {
        throw fetchError
      }

      const total = participants?.length || 0
      const completed = participants?.filter((p) => p.completed_at).length || 0
      const inProgress = total - completed

      setStats({ total, completed, inProgress })
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
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participants',
          filter: `study_id=eq.${studyId}`,
        },
        () => {
          setStats((prev) => ({
            total: prev.total + 1,
            completed: prev.completed,
            inProgress: prev.inProgress + 1,
          }))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participants',
          filter: `study_id=eq.${studyId}`,
        },
        (payload) => {
          const newRecord = payload.new as { completed_at: string | null }
          const oldRecord = payload.old as { completed_at: string | null }

          if (newRecord.completed_at && !oldRecord.completed_at) {
            setStats((prev) => ({
              total: prev.total,
              completed: prev.completed + 1,
              inProgress: prev.inProgress - 1,
            }))
          }
        }
      )
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
