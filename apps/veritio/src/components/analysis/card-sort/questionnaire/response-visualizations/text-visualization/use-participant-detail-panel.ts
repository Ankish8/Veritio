/**
 * useParticipantDetailPanel Hook
 *
 * Manages the participant detail panel for text visualization.
 * Handles opening, closing, navigation, and exclusion toggling.
 */

import { useCallback, useMemo, useState } from 'react'
import { createElement } from 'react'
import { MessageSquare } from 'lucide-react'
import { useFloatingActionBar } from '@/components/analysis/shared/floating-action-bar'
import { ParticipantDetailPanel, QuestionResponseCard } from '@/components/analysis/shared'
import type { Participant, StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type { ParticipantDemographicData } from '@veritio/study-types/study-flow-types'
import { parseUrlTags } from '@/lib/utils/participant-display'

export interface TextResponseRow {
  participantId: string
  participantIndex: number
  identifier: string | null
  answer: string
  wordCount: number
  isExcluded: boolean
  responseId: string  // The study_flow_response.id for evidence marking
}

interface UseParticipantDetailPanelOptions {
  participantMap: Map<string, Participant & { stableIndex: number }>
  sortedRows: TextResponseRow[]
  flowQuestions?: StudyFlowQuestionRow[]
  flowResponses?: StudyFlowResponseRow[]
  excludedParticipantIds: Set<string>
  setExcludedParticipantIds: React.Dispatch<React.SetStateAction<Set<string>>>
}

interface UseParticipantDetailPanelReturn {
  openParticipantId: string | null
  hasPanelSupport: boolean
  handleParticipantClick: (row: TextResponseRow, rowIndex: number) => void
}

export function useParticipantDetailPanel({
  participantMap,
  sortedRows,
  flowQuestions,
  flowResponses,
  excludedParticipantIds,
  setExcludedParticipantIds,
}: UseParticipantDetailPanelOptions): UseParticipantDetailPanelReturn {
  const [openParticipantId, setOpenParticipantId] = useState<string | null>(null)
  const { openDynamicPanel, closePanel } = useFloatingActionBar()

  // Check if panel functionality is available
  const hasPanelSupport = Boolean(flowQuestions && flowResponses)

  // Get survey questions for detail panel
  const surveyQuestions = useMemo(() => {
    if (!flowQuestions) return []
    return flowQuestions
      .filter((q) => q.section === 'survey')
      .sort((a, b) => a.position - b.position)
  }, [flowQuestions])

  // Build responses by participant for detail panel
  const responsesByParticipant = useMemo(() => {
    if (!flowResponses) return new Map<string, StudyFlowResponseRow[]>()
    const map = new Map<string, StudyFlowResponseRow[]>()
    for (const response of flowResponses) {
      const existing = map.get(response.participant_id) || []
      existing.push(response)
      map.set(response.participant_id, existing)
    }
    return map
  }, [flowResponses])

  const handleParticipantClick = useCallback(
    (row: TextResponseRow, _rowIndex: number) => {
      // If flowQuestions/flowResponses not provided, don't open panel
      if (!flowQuestions || !flowResponses) return

      // Toggle behavior: if clicking on the same participant, close the panel
      if (openParticipantId === row.participantId) {
        closePanel()
        setOpenParticipantId(null)
        return
      }

      const participant = participantMap.get(row.participantId)
      if (!participant) return

      // Get participant's responses
      const participantResponses = responsesByParticipant.get(row.participantId) || []
      const responseMap = new Map<string, StudyFlowResponseRow>()
      for (const resp of participantResponses) {
        responseMap.set(resp.question_id, resp)
      }

      // Count answered survey questions
      const surveyResponses = participantResponses.filter((r) => {
        const q = surveyQuestions.find((sq) => sq.id === r.question_id)
        return (
          q &&
          r.response_value !== null &&
          r.response_value !== undefined &&
          r.response_value !== ''
        )
      })
      const questionsAnswered = surveyResponses.length
      const questionsTotal = surveyQuestions.length
      const questionsPercent =
        questionsTotal > 0 ? Math.round((questionsAnswered / questionsTotal) * 100) : 0

      // Calculate time taken
      const startedAt = new Date(participant.started_at || new Date())
      const completedAt = participant.completed_at ? new Date(participant.completed_at) : null
      const timeMs = completedAt ? completedAt.getTime() - startedAt.getTime() : null

      // Extract demographics
      const rawMetadata = participant.metadata
      const demographics =
        rawMetadata && typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)
          ? (rawMetadata as unknown as ParticipantDemographicData)
          : null

      const urlTags = parseUrlTags(participant.url_tags)

      // Find current position in sorted rows for navigation
      const currentIndex = sortedRows.findIndex((r) => r.participantId === row.participantId)
      const canNavigatePrev = currentIndex > 0
      const canNavigateNext = currentIndex < sortedRows.length - 1

      const handleNavigate = (direction: 'prev' | 'next') => {
        const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1
        if (newIndex >= 0 && newIndex < sortedRows.length) {
          // eslint-disable-next-line react-hooks/immutability
          handleParticipantClick(sortedRows[newIndex], newIndex)
        }
      }

      const handleToggleExclude = (exclude: boolean) => {
        setExcludedParticipantIds((prev) => {
          const newSet = new Set(prev)
          if (exclude) {
            newSet.add(row.participantId)
          } else {
            newSet.delete(row.participantId)
          }
          return newSet
        })
      }

      // Build panel content using createElement to avoid JSX in .ts file
      const questionResponseCards = surveyQuestions.map((q, index) => {
        const response = responseMap.get(q.id)
        return createElement(QuestionResponseCard, {
          key: q.id,
          question: q,
          response: response,
          index: index,
        })
      })

      const questionsSection = createElement(
        'div',
        { className: 'space-y-3' },
        createElement(
          'h3',
          {
            className:
              'text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2',
          },
          createElement(MessageSquare, { className: 'h-4 w-4' }),
          `Question Responses (${questionsAnswered} of ${questionsTotal})`
        ),
        surveyQuestions.length > 0
          ? createElement('div', { className: 'space-y-3' }, ...questionResponseCards)
          : createElement(
              'div',
              { className: 'text-center text-muted-foreground py-8 bg-muted/30 rounded-lg' },
              'No survey questions found'
            )
      )

      const content = createElement(ParticipantDetailPanel, {
        participantIndex: row.participantIndex,
        identifier: row.identifier,
        participantId: row.participantId,
        stats: {
          questionsAnswered,
          questionsTotal,
          completionPercent: questionsPercent,
          timeTakenMs: timeMs,
          status: participant.status || 'unknown',
          startedAt,
          completedAt,
        },
        demographics: demographics,
        urlTags: urlTags,
        isExcluded: excludedParticipantIds.has(row.participantId),
        onClose: () => {
          closePanel()
          setOpenParticipantId(null)
        },
        onNavigate: handleNavigate,
        canNavigatePrev,
        canNavigateNext,
        onToggleExclude: handleToggleExclude,
      }, questionsSection)

      // Track which participant is open for toggle behavior
      setOpenParticipantId(row.participantId)

      openDynamicPanel('participant-detail', {
        content,
        width: 'wide',
        hideHeader: true,
      })
    },
    [
      participantMap,
      responsesByParticipant,
      surveyQuestions,
      sortedRows,
      flowQuestions,
      flowResponses,
      closePanel,
      openDynamicPanel,
      openParticipantId,
      excludedParticipantIds,
      setExcludedParticipantIds,
    ]
  )

  return {
    openParticipantId,
    hasPanelSupport,
    handleParticipantClick,
  }
}
