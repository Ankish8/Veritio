'use client'

/**
 * Results Content Client Wrapper
 *
 * Client component that receives server-fetched data and handles:
 * - Client-side state management
 * - Context providers (SegmentProvider)
 * - Response aggregations for SegmentProvider
 * - Client-side mutations (pause study)
 * - Routing to study-type-specific content components
 * - Real-time updates via unified real-time system
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { useAuthFetch } from '@/hooks'
import { useRealtimeResultsRefresh } from '@/hooks/use-realtime-results-refresh'
import { SegmentProvider } from '@/contexts/segment-context'
import { ResultsSkeleton } from '@/components/dashboard/skeletons'
import { YjsProvider } from '@/components/yjs'
import { useResultsPanels } from './hooks/use-results-panels'
import type { Participant, Study, StudySegment, StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'

import type { ResultsData } from './types'
import {
  isTreeTestResults,
  isSurveyResults,
  isPrototypeTestResults,
  isFirstClickResults,
  isFirstImpressionResults,
  isLiveWebsiteResults,
} from './types'

// Lazy-loaded content components
const CardSortResultsContent = dynamic(
  () => import('./card-sort-results-content').then((m) => ({ default: m.CardSortResultsContent })),
  { loading: () => <ResultsSkeleton /> }
)

const TreeTestResultsContent = dynamic(
  () => import('./tree-test-results-content').then((m) => ({ default: m.TreeTestResultsContent })),
  { loading: () => <ResultsSkeleton /> }
)

const SurveyResultsContent = dynamic(
  () => import('./survey-results-content').then((m) => ({ default: m.SurveyResultsContent })),
  { loading: () => <ResultsSkeleton /> }
)

const PrototypeTestResultsContent = dynamic(
  () =>
    import('./prototype-test-results-content').then((m) => ({
      default: m.PrototypeTestResultsContent,
    })),
  { loading: () => <ResultsSkeleton /> }
)

const FirstClickResultsContent = dynamic(
  () =>
    import('./first-click-results-content').then((m) => ({ default: m.FirstClickResultsContent })),
  { loading: () => <ResultsSkeleton /> }
)

const FirstImpressionResultsContent = dynamic(
  () =>
    import('./first-impression-results-content').then((m) => ({ default: m.FirstImpressionResultsContent })),
  { loading: () => <ResultsSkeleton /> }
)

const LiveWebsiteResultsContent = dynamic(
  () =>
    import('./live-website-results-content').then((m) => ({ default: m.LiveWebsiteResultsContent })),
  { loading: () => <ResultsSkeleton /> }
)

interface Props {
  projectId: string
  studyId: string
  study: Study
  project: { id: string; name: string }
  results: ResultsData
  savedSegments: StudySegment[]
  hasResponses: boolean
  /** SSR-fetched excluded participant IDs — prevents flash of unfiltered data */
  initialExcludedIds?: string[]
}

/** Shared wrapper providing YJS collaboration and segment filtering contexts. */
function ResultsProviderWrapper({
  studyId,
  participants,
  flowResponses,
  flowQuestions,
  responses,
  savedSegments,
  children,
}: {
  studyId: string
  participants: Participant[]
  flowResponses: StudyFlowResponseRow[]
  flowQuestions: StudyFlowQuestionRow[]
  responses: any[]
  savedSegments: StudySegment[]
  children: ReactNode
}) {
  return (
    <YjsProvider studyId={studyId}>
      <SegmentProvider
        participants={participants}
        flowResponses={flowResponses}
        flowQuestions={flowQuestions}
        responses={responses}
        savedSegments={savedSegments}
      >
        {children}
      </SegmentProvider>
    </YjsProvider>
  )
}

export function ResultsContentClient({
  projectId,
  studyId,
  study,
  project,
  results: initialResults,
  savedSegments,
  hasResponses: initialHasResponses,
  initialExcludedIds,
}: Props) {
  const authFetch = useAuthFetch()

  // Initialize client state with server data
  const [results, setResults] = useState<ResultsData>(initialResults)
  const [projectName] = useState(project.name)
  const [hasResponses, setHasResponses] = useState(initialHasResponses)

  // Real-time: subscribe to participant changes -> router.refresh() -> fresh server data
  // Only poll when study is actively collecting (live/paused), not when completed
  const isCollecting = study.status === 'live' || study.status === 'paused'
  useRealtimeResultsRefresh(studyId, isCollecting)

  // Sync fresh server data into state when router.refresh() delivers new props.
  // Uses participant count + study status as a change fingerprint to avoid
  // resetting state on every render (initialResults is a new object each time).
  const serverFingerprint = `${initialResults.participants?.length ?? 0}-${(initialResults as any).study?.status}`
  const prevFingerprintRef = useRef(serverFingerprint)

  useEffect(() => {
    if (serverFingerprint !== prevFingerprintRef.current) {
      prevFingerprintRef.current = serverFingerprint
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(initialResults)
      setHasResponses(initialHasResponses)
    }
  }, [serverFingerprint, initialResults, initialHasResponses])

  // Register floating action bar panels (comments)
  useResultsPanels(study)

  // Normalize flow data once — avoids repeating `|| []` in every provider branch
  const flowResponses: StudyFlowResponseRow[] = useMemo(() => {
    if ('flowResponses' in results) return (results as any).flowResponses || []
    return []
  }, [results])

  const flowQuestions: StudyFlowQuestionRow[] = useMemo(() => {
    if ('flowQuestions' in results) return (results as any).flowQuestions || []
    return []
  }, [results])

  // Aggregate tree test responses per participant with study-specific fields
  const aggregatedTreeTestResponses = useMemo(() => {
    if (!isTreeTestResults(results)) return []

    const totalTasks = results.tasks?.length || 0

    const responsesByParticipant = new Map<string, typeof results.responses>()
    for (const response of results.responses) {
      const existing = responsesByParticipant.get(response.participant_id) || []
      existing.push(response)
      responsesByParticipant.set(response.participant_id, existing)
    }

    return Array.from(responsesByParticipant.entries()).map(([participant_id, responses]) => {
      let totalTimeMs = 0
      let correctCount = 0
      let directCount = 0
      let completedCount = 0

      for (const r of responses) {
        totalTimeMs += r.total_time_ms || 0
        if (r.is_correct) correctCount++
        if (r.is_direct) directCount++
        if (!r.is_skipped) completedCount++
      }

      return {
        participant_id,
        total_time_ms: totalTimeMs,
        totalTasks,
        correctTaskCount: correctCount,
        directTaskCount: directCount,
        completedTaskCount: completedCount,
      }
    })
  }, [results])

  // Aggregate survey responses for SegmentProvider
  const aggregatedSurveyResponses = useMemo(() => {
    if (!isSurveyResults(results)) return []

    const totalQuestions = results.flowQuestions?.filter(
      (q: any) => q.section !== 'screening'
    ).length || 0

    const responseCountByParticipant = new Map<string, number>()
    for (const response of results.flowResponses || []) {
      const question = results.flowQuestions?.find((q: any) => q.id === response.question_id)
      if (question && question.section !== 'screening') {
        const count = responseCountByParticipant.get(response.participant_id) || 0
        responseCountByParticipant.set(response.participant_id, count + 1)
      }
    }

    return results.participants.map((p: any) => ({
      participant_id: p.id,
      total_time_ms:
        p.completed_at && p.started_at
          ? new Date(p.completed_at).getTime() - new Date(p.started_at).getTime()
          : null,
      questionsAnsweredCount: responseCountByParticipant.get(p.id) || 0,
      totalQuestions,
    }))
  }, [results])

  // Aggregate prototype test responses per participant
  const aggregatedPrototypeTestResponses = useMemo(() => {
    if (!isPrototypeTestResults(results)) return []

    const totalTasks = results.tasks?.length || 0

    const dataByParticipant = new Map<string, {
      totalTimeMs: number
      successfulCount: number
      completedCount: number
      totalMisclicks: number
    }>()

    const taskAttempts = results.taskAttempts ?? []
    for (const attempt of taskAttempts) {
      const pid = (attempt as any).participant_id
      const existing = dataByParticipant.get(pid) || {
        totalTimeMs: 0,
        successfulCount: 0,
        completedCount: 0,
        totalMisclicks: 0,
      }

      existing.totalTimeMs += (attempt as any).total_time_ms || 0
      existing.completedCount++
      if ((attempt as any).is_successful) existing.successfulCount++
      existing.totalMisclicks += (attempt as any).misclick_count || 0

      dataByParticipant.set(pid, existing)
    }

    return Array.from(dataByParticipant.entries()).map(([participant_id, data]) => ({
      participant_id,
      total_time_ms: data.totalTimeMs,
      totalTasks,
      successfulTaskCount: data.successfulCount,
      completedTaskCount: data.completedCount,
      totalMisclicks: data.totalMisclicks,
    }))
  }, [results])

  // Aggregate first-click responses per participant
  const aggregatedFirstClickResponses = useMemo(() => {
    if (!isFirstClickResults(results)) return []

    const totalTasks = results.tasks?.length || 0

    const dataByParticipant = new Map<string, {
      totalTimeMs: number
      correctCount: number
      completedCount: number
    }>()

    for (const response of results.responses) {
      const pid = (response as any).participant_id
      const existing = dataByParticipant.get(pid) || {
        totalTimeMs: 0,
        correctCount: 0,
        completedCount: 0,
      }

      existing.totalTimeMs += (response as any).time_to_click_ms || 0
      if (!(response as any).is_skipped) {
        existing.completedCount++
        if ((response as any).is_correct) existing.correctCount++
      }

      dataByParticipant.set(pid, existing)
    }

    return Array.from(dataByParticipant.entries()).map(([participant_id, data]) => ({
      participant_id,
      total_time_ms: data.totalTimeMs,
      totalTasks,
      correctClickCount: data.correctCount,
      completedTaskCount: data.completedCount,
    }))
  }, [results])

  // Aggregate first impression responses per participant (using sessions)
  const aggregatedFirstImpressionResponses = useMemo(() => {
    if (!isFirstImpressionResults(results)) return []

    const totalQuestionsPerDesign = results.designs.reduce(
      (max, d) => Math.max(max, d.questions?.length || 0),
      0
    )

    return results.sessions.map((session: any) => {
      const assignedDesignIds: string[] = []
      if (session.assigned_design_id) {
        assignedDesignIds.push(session.assigned_design_id)
      }
      if (session.design_sequence && Array.isArray(session.design_sequence)) {
        for (const id of session.design_sequence) {
          if (!assignedDesignIds.includes(id)) {
            assignedDesignIds.push(id)
          }
        }
      }

      const participantResponses = results.responses.filter(
        (r: any) => r.participant_id === session.participant_id
      )

      const designCount = assignedDesignIds.length || 1
      const totalQuestions = totalQuestionsPerDesign * designCount

      return {
        participant_id: session.participant_id,
        total_time_ms: session.total_time_ms || 0,
        deviceType: session.device_type || null,
        assignedDesignIds,
        responsesAnswered: participantResponses.length,
        totalQuestions,
      }
    })
  }, [results])

  // Aggregate live website responses per participant
  const aggregatedLiveWebsiteResponses = useMemo(() => {
    if (!isLiveWebsiteResults(results)) return []

    const totalTasks = results.tasks?.length || 0

    const dataByParticipant = new Map<string, {
      totalTimeMs: number
      successfulCount: number
      completedCount: number
      abandonedCount: number
    }>()

    for (const response of results.responses) {
      const pid = response.participant_id
      const existing = dataByParticipant.get(pid) || {
        totalTimeMs: 0,
        successfulCount: 0,
        completedCount: 0,
        abandonedCount: 0,
      }

      existing.totalTimeMs += response.duration_ms || 0
      if (response.status === 'completed') {
        existing.completedCount++
        existing.successfulCount++
      }
      if (response.status === 'abandoned') existing.abandonedCount++

      dataByParticipant.set(pid, existing)
    }

    return Array.from(dataByParticipant.entries()).map(([participant_id, data]) => ({
      participant_id,
      total_time_ms: data.totalTimeMs,
      totalTasks,
      successfulTaskCount: data.successfulCount,
      completedTaskCount: data.completedCount,
      abandonedTaskCount: data.abandonedCount,
    }))
  }, [results])

  // Client-side mutation: End study (set status to completed)
  const handleEndStudy = useCallback(async () => {
    const response = await authFetch(`/api/studies/${studyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    if (!response.ok) {
      throw new Error('Failed to end study')
    }

    setResults((prev) => prev ? {
      ...prev,
      study: { ...prev.study, status: 'completed' },
    } as ResultsData : prev)
  }, [authFetch, studyId])

  const sharedContentProps = {
    projectId,
    projectName,
    studyId,
    hasResponses,
    onEndStudy: handleEndStudy,
    initialExcludedIds,
  }

  // Route to appropriate content component based on study type

  if (isSurveyResults(results)) {
    return (
      <ResultsProviderWrapper
        studyId={studyId}
        participants={results.participants}
        flowResponses={flowResponses}
        flowQuestions={flowQuestions}
        responses={aggregatedSurveyResponses}
        savedSegments={savedSegments}
      >
        <SurveyResultsContent results={results} {...sharedContentProps} />
      </ResultsProviderWrapper>
    )
  }

  if (isTreeTestResults(results)) {
    return (
      <ResultsProviderWrapper
        studyId={studyId}
        participants={results.participants as unknown as Participant[]}
        flowResponses={flowResponses}
        flowQuestions={flowQuestions}
        responses={aggregatedTreeTestResponses}
        savedSegments={savedSegments}
      >
        <TreeTestResultsContent results={results} {...sharedContentProps} />
      </ResultsProviderWrapper>
    )
  }

  if (isPrototypeTestResults(results)) {
    return (
      <ResultsProviderWrapper
        studyId={studyId}
        participants={results.participants}
        flowResponses={flowResponses}
        flowQuestions={flowQuestions}
        responses={aggregatedPrototypeTestResponses}
        savedSegments={savedSegments}
      >
        <PrototypeTestResultsContent results={results} {...sharedContentProps} />
      </ResultsProviderWrapper>
    )
  }

  if (isFirstClickResults(results)) {
    return (
      <ResultsProviderWrapper
        studyId={studyId}
        participants={results.participants}
        flowResponses={flowResponses}
        flowQuestions={flowQuestions}
        responses={aggregatedFirstClickResponses}
        savedSegments={savedSegments}
      >
        <FirstClickResultsContent results={results} {...sharedContentProps} />
      </ResultsProviderWrapper>
    )
  }

  if (isFirstImpressionResults(results)) {
    return (
      <ResultsProviderWrapper
        studyId={studyId}
        participants={results.participants}
        flowResponses={flowResponses}
        flowQuestions={flowQuestions}
        responses={aggregatedFirstImpressionResponses}
        savedSegments={savedSegments}
      >
        <FirstImpressionResultsContent results={results} {...sharedContentProps} />
      </ResultsProviderWrapper>
    )
  }

  if (isLiveWebsiteResults(results)) {
    return (
      <ResultsProviderWrapper
        studyId={studyId}
        participants={results.participants}
        flowResponses={flowResponses}
        flowQuestions={flowQuestions}
        responses={aggregatedLiveWebsiteResponses}
        savedSegments={savedSegments}
      >
        <LiveWebsiteResultsContent results={results} {...sharedContentProps} />
      </ResultsProviderWrapper>
    )
  }

  // Card Sort Results (default)
  return (
    <ResultsProviderWrapper
      studyId={studyId}
      participants={results.participants}
      flowResponses={flowResponses}
      flowQuestions={flowQuestions}
      responses={results.responses}
      savedSegments={savedSegments}
    >
      <CardSortResultsContent results={results} {...sharedContentProps} />
    </ResultsProviderWrapper>
  )
}
