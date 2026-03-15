import { useState, useMemo, useCallback } from 'react'
import type { TreeTestResponse, Participant } from '@/lib/algorithms/tree-test-analysis'
import type { ParticipantSummary } from '../participants/tree-test-participants-list'
import type { IndividualPathData } from './paths-types'

interface UseParticipantDetailArgs {
  participants: Participant[]
  responses: TreeTestResponse[]
  participantIndexMap: Map<string, number>
  individualData: IndividualPathData[]
}

/**
 * Manages participant detail dialog state, navigation, and summary computation
 * for the paths analysis tab.
 */
export function useParticipantDetail({
  participants,
  responses,
  participantIndexMap,
  individualData,
}: UseParticipantDetailArgs) {
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null)

  const handleParticipantClick = useCallback((participantId: string) => {
    setSelectedParticipantId(participantId)
  }, [])

  const handleClose = useCallback(() => {
    setSelectedParticipantId(null)
  }, [])

  const selectedParticipantSummary = useMemo((): ParticipantSummary | null => {
    if (!selectedParticipantId) return null

    const participant = participants.find(p => p.id === selectedParticipantId)
    if (!participant) return null

    const participantResponses = responses.filter(r => r.participant_id === selectedParticipantId)
    const successCount = participantResponses.filter(r => r.is_correct === true).length
    const directCount = participantResponses.filter(r => r.is_direct === true).length
    const totalTime = participantResponses.reduce((sum, r) => sum + (r.total_time_ms || 0), 0)
    const participantIndex = participantIndexMap.get(selectedParticipantId) ?? 0

    return {
      participant,
      responses: participantResponses,
      successCount,
      directCount,
      totalTime,
      participantIndex,
      isExcluded: false,
      identifier: null,
      demographics: null,
      urlTags: null,
      flowResponses: [],
    }
  }, [selectedParticipantId, participants, responses, participantIndexMap])

  const selectedParticipantIndex = useMemo(() => {
    if (!selectedParticipantId) return -1
    return individualData.findIndex(d => d.participantId === selectedParticipantId)
  }, [selectedParticipantId, individualData])

  const canNavigatePrev = selectedParticipantIndex > 0
  const canNavigateNext = selectedParticipantIndex < individualData.length - 1

  const handleNavigateParticipant = useCallback((direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev'
      ? selectedParticipantIndex - 1
      : selectedParticipantIndex + 1

    if (newIndex >= 0 && newIndex < individualData.length) {
      setSelectedParticipantId(individualData[newIndex].participantId)
    }
  }, [selectedParticipantIndex, individualData])

  return {
    selectedParticipantSummary,
    canNavigatePrev,
    canNavigateNext,
    handleParticipantClick,
    handleClose,
    handleNavigateParticipant,
  }
}
