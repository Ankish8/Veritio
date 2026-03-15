'use client'

/**
 * useResultsData
 *
 * Hook for fetching study results data based on study type.
 * Handles loading state, errors, and study-type-specific endpoints.
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuthFetch } from '@/hooks'
import type { StudySegment } from '@veritio/study-types'
import type { ResultsData } from './types'
import { isTreeTestResults, isSurveyResults, isPrototypeTestResults, isFirstClickResults, isFirstImpressionResults, isLiveWebsiteResults } from './types'

export interface UseResultsDataReturn {
  results: ResultsData | null
  projectName: string
  savedSegments: StudySegment[]
  isLoading: boolean
  error: string | null
  hasResponses: boolean
  aggregatedTreeTestResponses: Array<{ participant_id: string; total_time_ms: number }>
  aggregatedSurveyResponses: Array<{ participant_id: string; total_time_ms: number | null }>
  aggregatedPrototypeTestResponses: Array<{ participant_id: string; total_time_ms: number }>
  aggregatedFirstClickResponses: Array<{ participant_id: string; total_time_ms: number }>
  handlePauseStudy: () => Promise<void>
}

export function useResultsData(projectId: string, studyId: string): UseResultsDataReturn {
  const authFetch = useAuthFetch()
  const [results, setResults] = useState<ResultsData | null>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [savedSegments, setSavedSegments] = useState<StudySegment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Aggregate tree test responses per participant
  const aggregatedTreeTestResponses = useMemo(() => {
    if (!results || !isTreeTestResults(results)) return []

    const timeByParticipant = new Map<string, number>()
    for (const response of results.responses) {
      const currentTime = timeByParticipant.get(response.participant_id) || 0
      timeByParticipant.set(response.participant_id, currentTime + (response.total_time_ms || 0))
    }
    return Array.from(timeByParticipant.entries()).map(([participant_id, total_time_ms]) => ({
      participant_id,
      total_time_ms,
    }))
  }, [results])

  // Aggregate survey responses for SegmentProvider
  const aggregatedSurveyResponses = useMemo(() => {
    if (!results || !isSurveyResults(results)) return []

    return results.participants.map((p) => ({
      participant_id: p.id,
      total_time_ms:
        p.completed_at && p.started_at
          ? new Date(p.completed_at).getTime() - new Date(p.started_at).getTime()
          : null,
    }))
  }, [results])

  // Aggregate prototype test responses per participant
  const aggregatedPrototypeTestResponses = useMemo(() => {
    if (!results || !isPrototypeTestResults(results)) return []

    const timeByParticipant = new Map<string, number>()
    // Defensive check: taskAttempts may be undefined in edge cases
    const taskAttempts = results.taskAttempts ?? []
    for (const attempt of taskAttempts) {
      const currentTime = timeByParticipant.get(attempt.participant_id) || 0
      timeByParticipant.set(attempt.participant_id, currentTime + (attempt.total_time_ms || 0))
    }
    return Array.from(timeByParticipant.entries()).map(([participant_id, total_time_ms]) => ({
      participant_id,
      total_time_ms,
    }))
  }, [results])

  // Aggregate first-click responses per participant
  const aggregatedFirstClickResponses = useMemo(() => {
    if (!results || !isFirstClickResults(results)) return []

    const timeByParticipant = new Map<string, number>()
    for (const response of results.responses) {
      const currentTime = timeByParticipant.get(response.participant_id) || 0
      timeByParticipant.set(response.participant_id, currentTime + (response.time_to_click_ms || 0))
    }
    return Array.from(timeByParticipant.entries()).map(([participant_id, total_time_ms]) => ({
      participant_id,
      total_time_ms,
    }))
  }, [results])

  // Fetch results data
  useEffect(() => {
    let isCancelled = false

    const fetchResults = async () => {
      try {
        // Fetch project name and study type in parallel
        const [projectRes, studyRes] = await Promise.all([
          authFetch(`/api/projects/${projectId}`),
          authFetch(`/api/studies/${studyId}`),
        ])

        if (isCancelled) return

        if (projectRes.ok) {
          const project = await projectRes.json()
          setProjectName(project.name || 'Project')
        }

        if (!studyRes.ok) {
          throw new Error('Failed to load study')
        }
        const study = await studyRes.json()

        // Fetch appropriate results endpoint based on study type
        let endpoint: string
        if (study.study_type === 'tree_test') {
          endpoint = `/api/studies/${studyId}/tree-test-results`
        } else if (study.study_type === 'survey') {
          endpoint = `/api/studies/${studyId}/survey-results`
        } else if (study.study_type === 'prototype_test') {
          // Use lightweight overview endpoint for faster initial load
          endpoint = `/api/studies/${studyId}/prototype-test-results/overview`
        } else if (study.study_type === 'first_click') {
          endpoint = `/api/studies/${studyId}/first-click-results`
        } else {
          endpoint = `/api/studies/${studyId}/results`
        }

        const response = await authFetch(endpoint)

        if (isCancelled) return

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to load results')
        }

        const data = await response.json()
        setResults(data)
        setError(null)

        // Fetch saved segments
        const segmentsRes = await authFetch(`/api/studies/${studyId}/segments`)
        if (!isCancelled && segmentsRes.ok) {
          const segmentsData = await segmentsRes.json()
          setSavedSegments(segmentsData)
        }
      } catch (err) {
        if (isCancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load results')
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchResults()

    return () => {
      isCancelled = true
    }
  }, [studyId, projectId, authFetch])

  // Pause study handler
  const handlePauseStudy = useCallback(async () => {
    const response = await authFetch(`/api/studies/${studyId}/pause`, {
      method: 'POST',
    })
    if (!response.ok) {
      throw new Error('Failed to pause study')
    }
    if (results) {
      setResults({
        ...results,
        study: { ...results.study, status: 'paused' },
      } as ResultsData)
    }
  }, [authFetch, studyId, results])

  // Check if we have responses
  const hasResponses = useMemo(() => {
    if (!results) return false
    if (isTreeTestResults(results)) {
      return results.metrics.completedParticipants > 0
    }
    if (isSurveyResults(results)) {
      return results.stats.completedParticipants > 0
    }
    if (isPrototypeTestResults(results)) {
      return results.metrics.completedParticipants > 0
    }
    if (isFirstClickResults(results)) {
      return results.metrics.completedParticipants > 0
    }
    if (isFirstImpressionResults(results)) {
      return results.metrics.completedParticipants > 0
    }
    if (isLiveWebsiteResults(results)) {
      return results.metrics.completedParticipants > 0
    }
    return (results.stats?.completedParticipants ?? 0) > 0
  }, [results])

  return {
    results,
    projectName,
    savedSegments,
    isLoading,
    error,
    hasResponses,
    aggregatedTreeTestResponses,
    aggregatedSurveyResponses,
    aggregatedPrototypeTestResponses,
    aggregatedFirstClickResponses,
    handlePauseStudy,
  }
}
