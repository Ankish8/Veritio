'use client'

import { useMemo } from 'react'
import type { ParticipantFlag } from '@/lib/algorithms/participant-flagging'
import { autoFlagParticipants } from '@/lib/algorithms/participant-flagging'

export interface ParticipantRow {
  participant: {
    id: string
    status: string
    started_at: string
    completed_at: string | null
  }
  response: {
    id: string
    participant_id: string
    card_placements: Record<string, string>
    total_time_ms?: number | null
  } | null
  flags: ParticipantFlag[]
  isExcluded: boolean
  categoriesCreated: number
  cardsPlaced: number
}

interface UseParticipantRowsDataProps {
  participants: Array<{
    id: string
    status: string
    started_at: string
    completed_at: string | null
  }>
  responses: Array<{
    id?: string
    participant_id: string
    card_placements: Record<string, string> | unknown
    total_time_ms?: number | null
  }>
  cards: Array<{ id: string; label: string }>
  excludedParticipantIds: Set<string>
}

interface UseParticipantRowsDataReturn {
  participantRows: ParticipantRow[]
  stats: {
    total: number
    completed: number
    flagged: number
    excluded: number
    includedInAnalysis: number
  }
}

/** Computes participant rows with auto-flags, response data, and aggregate stats. */
export function useParticipantRowsData({
  participants,
  responses,
  cards,
  excludedParticipantIds,
}: UseParticipantRowsDataProps): UseParticipantRowsDataReturn {
  const typedResponses = useMemo(() => {
    const safe = Array.isArray(responses) ? responses : []
    return safe.map(r => ({
      id: r.id || r.participant_id,
      participant_id: r.participant_id,
      card_placements: (r.card_placements || {}) as Record<string, string>,
      total_time_ms: r.total_time_ms ?? null,
    }))
  }, [responses])

  const safeParticipants = useMemo(() => Array.isArray(participants) ? participants : [], [participants])
  const safeCards = useMemo(() => Array.isArray(cards) ? cards : [], [cards])

  const flags = useMemo(() => {
    return autoFlagParticipants(typedResponses, safeCards)
  }, [typedResponses, safeCards])

  const flagMap = useMemo(() => {
    const map = new Map<string, ParticipantFlag[]>()
    for (const result of flags) {
      map.set(result.participantId, result.flags)
    }
    return map
  }, [flags])

  const responseMap = useMemo(() => {
    const map = new Map<string, typeof typedResponses[0]>()
    for (const response of typedResponses) {
      map.set(response.participant_id, response)
    }
    return map
  }, [typedResponses])

  const participantRows: ParticipantRow[] = useMemo(() => {
    return safeParticipants.map((participant) => {
      const response = responseMap.get(participant.id) || null
      const participantFlags = flagMap.get(participant.id) || []
      const placements = (response?.card_placements || {}) as Record<string, string>
      const categoriesCreated = new Set(Object.values(placements)).size
      const cardsPlaced = Object.keys(placements).length

      return {
        participant,
        response,
        flags: participantFlags,
        isExcluded: excludedParticipantIds.has(participant.id),
        categoriesCreated,
        cardsPlaced,
      }
    })
  }, [safeParticipants, responseMap, flagMap, excludedParticipantIds])

  const stats = useMemo(() => {
    const total = participantRows.length
    const completed = participantRows.filter((r) => r.participant.status === 'completed').length
    const flagged = participantRows.filter((r) => r.flags.length > 0).length
    const excluded = participantRows.filter((r) => r.isExcluded).length
    const includedInAnalysis = completed - excluded

    return { total, completed, flagged, excluded, includedInAnalysis }
  }, [participantRows])

  return { participantRows, stats }
}
