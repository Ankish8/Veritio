'use client'

/**
 * useFirstImpressionParticipants Hook
 *
 * Extracts participant data building, flagging, filtering, and sorting logic
 * from the participants list component for better maintainability.
 *
 * Integrates with segment filtering via useFilteredParticipantIds().
 */

import { useMemo, useState, useCallback } from 'react'
import type {
  FirstImpressionResultsResponse,
  FirstImpressionExposure,
  FirstImpressionResponse,
} from '@/services/results/first-impression'
import type { Participant, StudyFlowResponseRow } from '@veritio/study-types'
import type { ParticipantDemographicData } from '@veritio/study-types/study-flow-types'
import type { ParticipantRowData, FirstImpressionColumnId } from './column-definitions'
import { autoFlagFirstImpressionParticipants } from '@/lib/algorithms/first-impression-flagging'
import { useFilteredParticipantIds } from '@/stores/segment-store'
import { extractDemographicsFromMetadata } from '@/lib/utils/participant-display'
import { useExcludedParticipants } from '@/hooks/analysis'

/**
 * Extended row data with exposures and responses for detail panel
 */
export interface ExtendedRowData extends ParticipantRowData {
  exposures: FirstImpressionExposure[]
  responses: FirstImpressionResponse[]
  demographics: ParticipantDemographicData | null
  /** Study flow responses (screening, pre-study, post-study) */
  flowResponses: StudyFlowResponseRow[]
}

type SortField = FirstImpressionColumnId | null
type SortDirection = 'asc' | 'desc'

interface UseFirstImpressionParticipantsOptions {
  data: FirstImpressionResultsResponse
  statusFilter: string
}

/**
 * Hook for building, flagging, filtering, and sorting First Impression participants
 */
export function useFirstImpressionParticipants({
  data,
  statusFilter,
}: UseFirstImpressionParticipantsOptions) {
  const { excludedIds, toggleExclude, bulkToggleExclude } = useExcludedParticipants(data.study.id)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Get filtered participant IDs from segment store
  const filteredParticipantIds = useFilteredParticipantIds()

  // Calculate total questions across all designs
  const totalQuestions = useMemo(() => {
    return data.designs.reduce((sum, d) => sum + (d.questions?.length || 0), 0)
  }, [data.designs])

  // Build participant data from sessions, exposures, and responses
  const items = useMemo<ExtendedRowData[]>(() => {
    const participantMap: Record<string, ExtendedRowData> = {}

    // Initialize from participants
    data.participants.forEach((p: Participant, index: number) => {
      // Extract demographics from metadata (handles nested and legacy formats)
      const demographics = extractDemographicsFromMetadata(p.metadata)

      participantMap[p.id] = {
        participant: p,
        index,
        status: p.status || 'unknown',
        totalTimeMs: 0,
        designNames: [],
        exposureTimeMs: 0,
        responsesAnswered: 0,
        totalQuestions,
        responseRate: 0,
        deviceType: null,
        qualityFlags: [],
        identifier: p.identifier_value || null,
        urlTags: (p.url_tags && typeof p.url_tags === 'object' && !Array.isArray(p.url_tags))
          ? p.url_tags as Record<string, string>
          : null,
        viewportWidth: null,
        viewportHeight: null,
        startedAt: p.started_at || null,
        completedAt: p.completed_at || null,
        questionTimeMs: 0,
        isExcluded: excludedIds.has(p.id),
        designsViewed: 0,
        exposures: [],
        responses: [],
        demographics,
        flowResponses: [],
      }
    })

    // Add flow responses per participant (screening, pre-study, post-study)
    data.flowResponses.forEach((response: StudyFlowResponseRow) => {
      const row = participantMap[response.participant_id]
      if (row) {
        row.flowResponses.push(response)
      }
    })

    // Aggregate from sessions (device info, timing)
    data.sessions.forEach((session) => {
      const row = participantMap[session.participant_id]
      if (!row) return
      row.totalTimeMs = session.total_time_ms || 0
      row.deviceType = session.device_type || null
      row.viewportWidth = session.viewport_width || null
      row.viewportHeight = session.viewport_height || null
    })

    // Build design names from exposures
    const exposuresByParticipant = new Map<string, typeof data.exposures>()
    data.exposures.forEach((exposure) => {
      const existing = exposuresByParticipant.get(exposure.participant_id) || []
      existing.push(exposure)
      exposuresByParticipant.set(exposure.participant_id, existing)
    })

    exposuresByParticipant.forEach((exposures, participantId) => {
      const row = participantMap[participantId]
      if (!row) return

      const sortedExposures = [...exposures].sort(
        (a, b) => a.exposure_sequence - b.exposure_sequence
      )

      const designNames: string[] = []
      const seenDesignIds = new Set<string>()
      let totalExposureTime = 0
      let totalQuestionTime = 0

      sortedExposures.forEach((exp) => {
        totalExposureTime += exp.actual_display_ms || 0

        if (exp.questions_started_at && exp.questions_completed_at) {
          const qStart = new Date(exp.questions_started_at).getTime()
          const qEnd = new Date(exp.questions_completed_at).getTime()
          totalQuestionTime += qEnd - qStart
        }

        if (!row.viewportWidth && exp.viewport_width) {
          row.viewportWidth = exp.viewport_width
          row.viewportHeight = exp.viewport_height
        }

        if (!seenDesignIds.has(exp.design_id)) {
          seenDesignIds.add(exp.design_id)
          const design = data.designs.find((d) => d.id === exp.design_id)
          designNames.push(design?.name || `Design ${(design?.position ?? 0) + 1}`)
        }
      })

      row.designNames = designNames
      row.designsViewed = seenDesignIds.size
      row.exposureTimeMs = totalExposureTime
      row.questionTimeMs = totalQuestionTime
      row.exposures = sortedExposures
    })

    // Add responses per participant
    data.responses.forEach((response) => {
      const row = participantMap[response.participant_id]
      if (row) {
        row.responses.push(response)
      }
    })

    // Count responses per participant
    const responsesByParticipant = new Map<string, number>()
    data.responses.forEach((response) => {
      const count = responsesByParticipant.get(response.participant_id) || 0
      responsesByParticipant.set(response.participant_id, count + 1)
    })

    responsesByParticipant.forEach((count, participantId) => {
      const row = participantMap[participantId]
      if (!row) return
      row.responsesAnswered = count
      row.responseRate = totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0
    })

    return Object.values(participantMap)
  }, [data, totalQuestions, excludedIds])

  // Apply quality flagging
  const itemsWithFlags = useMemo(() => {
    const flagData = items.map((item) => ({
      participantId: item.participant.id,
      totalTimeMs: item.totalTimeMs,
      exposureCount: item.designsViewed,
      responsesAnswered: item.responsesAnswered,
      totalQuestions: item.totalQuestions,
    }))

    const flagMap = autoFlagFirstImpressionParticipants(flagData)

    return items.map((item) => ({
      ...item,
      qualityFlags: flagMap.get(item.participant.id) || [],
    }))
  }, [items])

  // Filter by status and segment
  const filteredItems = useMemo(() => {
    let items = itemsWithFlags

    // Apply status filter
    if (statusFilter === 'included') {
      items = items.filter((item) => !item.isExcluded)
    } else if (statusFilter === 'excluded') {
      items = items.filter((item) => item.isExcluded)
    } else if (statusFilter !== 'all') {
      items = items.filter((item) => item.status === statusFilter && !item.isExcluded)
    }

    // Apply segment filter (from segment store)
    if (filteredParticipantIds !== null) {
      items = items.filter((item) => filteredParticipantIds.has(item.participant.id))
    }

    return items
  }, [itemsWithFlags, statusFilter, filteredParticipantIds])

  // Sort items
  const sortedItems = useMemo(() => {
    if (!sortField) return filteredItems

    return [...filteredItems].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'participant':
          comparison = a.index - b.index
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'designShown':
          comparison = (a.designNames[0] || '').localeCompare(b.designNames[0] || '')
          break
        case 'exposureTime':
          comparison = a.exposureTimeMs - b.exposureTimeMs
          break
        case 'responseRate':
          comparison = a.responsesAnswered - b.responsesAnswered
          break
        case 'totalTime':
          comparison = a.totalTimeMs - b.totalTimeMs
          break
        case 'device':
          comparison = (a.deviceType || '').localeCompare(b.deviceType || '')
          break
        case 'identifier':
          comparison = (a.identifier || '').localeCompare(b.identifier || '')
          break
        case 'viewport':
          comparison = (a.viewportWidth || 0) - (b.viewportWidth || 0)
          break
        case 'startedAt':
          comparison = (a.startedAt || '').localeCompare(b.startedAt || '')
          break
        case 'completedAt':
          comparison = (a.completedAt || '').localeCompare(b.completedAt || '')
          break
        case 'questionTime':
          comparison = a.questionTimeMs - b.questionTimeMs
          break
        default:
          comparison = 0
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredItems, sortField, sortDirection])

  // Toggle sort
  const handleSort = useCallback((field: FirstImpressionColumnId) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        setSortField(null)
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }, [sortField, sortDirection])

  // Get sort icon state
  const getSortState = useCallback((field: FirstImpressionColumnId) => {
    if (sortField !== field) return 'none'
    return sortDirection
  }, [sortField, sortDirection])

  return {
    sortedItems,
    totalQuestions,
    sortField,
    sortDirection,
    handleSort,
    getSortState,
    toggleExclude,
    bulkToggleExclude,
  }
}
