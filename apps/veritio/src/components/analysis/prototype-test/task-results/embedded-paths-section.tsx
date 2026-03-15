'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Info, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { useFloatingActionBar } from '@/components/analysis/shared/floating-action-bar'
import {
  ParticipantDetailPanel,
} from '@/components/analysis/shared'
import { ParticipantDetailContent } from '../participants/participant-detail-content'
import { castJsonArray } from '@/lib/supabase/json-utils'
import { PathsTable } from '../paths/paths-table'
import { ResultFiltersDropdown } from '../paths/result-filters-dropdown'
import { usePrototypeTestTaskAttemptPaths, usePrototypeTestAttemptEvents } from '@/hooks'
import { usePathDetailPanel } from '@/hooks/use-path-detail-panel'
import {
  type ResultType,
  type AggregatedPathData,
  type IndividualPathData,
  ALL_RESULT_TYPES,
  filterByResultTypes,
  computeAggregatedPaths,
  computeIndividualPaths,
  buildVariantLabelMap,
} from '../paths/paths-utils'
import { enrichIndividualPathsWithEvents, reaggregatePathsFromIndividual } from '../paths/paths-data-utils'
import type { SuccessPathway } from '@veritio/study-types'
import { pathwayHasStateSteps } from '@veritio/prototype-test/lib/utils/pathway-migration'
import type {
  PrototypeTestTask,
  PrototypeTestFrame,
  PrototypeTestTaskAttempt,
  Participant,
  StudyFlowQuestionRow,
  StudyFlowResponseRow,
} from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'

interface EmbeddedPathsSectionProps {
  /** Study ID for fetching path data */
  studyId: string
  /** Currently selected task ID (from parent TaskResultsTab) */
  selectedTaskId: string | null
  /** All tasks for looking up task details */
  tasks: PrototypeTestTask[]
  /** All frames for path visualization */
  frames: PrototypeTestFrame[]
  /** All task attempts (already filtered by segment in parent) - lightweight version without path_taken */
  taskAttempts: PrototypeTestTaskAttempt[]
  /** All participants for index mapping */
  participants: Participant[]
  /** Flow questions for participant detail panel */
  flowQuestions?: StudyFlowQuestionRow[]
  /** Flow responses for participant detail panel */
  flowResponses?: StudyFlowResponseRow[]
  /** Participant display settings for showing names/emails instead of Participant N */
  displaySettings?: ParticipantDisplaySettings | null
  /** When true, renders as a standalone tab (no section header, no border-t, full height) */
  standalone?: boolean
}

export function EmbeddedPathsSection({
  studyId,
  selectedTaskId,
  tasks,
  frames,
  taskAttempts,
  participants,
  flowQuestions = [],
  flowResponses = [],
  displaySettings,
  standalone = false,
}: EmbeddedPathsSectionProps) {
  const [selectedResultTypes, setSelectedResultTypes] = useState<Set<ResultType>>(
    new Set(ALL_RESULT_TYPES)
  )
  const [showAllParticipants, setShowAllParticipants] = useState(false)
  const [showThumbnails, setShowThumbnails] = useState(false)
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null)

  const { openDynamicPanel, closePanel } = useFloatingActionBar()
  const isClosingRef = useRef(false)

  const { setContext: setPathDetailContext, openAggregatedPathDetail, openIndividualPathDetail } = usePathDetailPanel()

  const { taskAttemptPaths, isLoading: pathsLoading } = usePrototypeTestTaskAttemptPaths(studyId)
  const { navEvents, stateEvents, componentInstances, componentVariants, isLoading: eventsLoading } = usePrototypeTestAttemptEvents(studyId)

  const taskAttemptsWithPaths = useMemo(() => {
    if (pathsLoading || taskAttemptPaths.length === 0) return taskAttempts

    const pathMap = new Map(taskAttemptPaths.map(p => [p.id, p.path_taken]))
    const snapshotMap = new Map(taskAttemptPaths.map(p => [p.id, p.success_pathway_snapshot]))

    return taskAttempts.map(attempt => ({
      ...attempt,
      path_taken: pathMap.get(attempt.id) ?? attempt.path_taken,
      success_pathway_snapshot: snapshotMap.get(attempt.id) ?? null,
    }))
  }, [taskAttempts, taskAttemptPaths, pathsLoading])

  const selectedTask = useMemo(() => {
    return tasks.find(t => t.id === selectedTaskId) ?? null
  }, [tasks, selectedTaskId])

  const frameMap = useMemo(() => {
    return new Map(frames.map(f => [f.id, f]))
  }, [frames])

  const goalFrameIds = useMemo(() => {
    if (!selectedTask) return new Set<string>()
    const ids = castJsonArray<string>(selectedTask.success_frame_ids)
    return new Set(ids)
  }, [selectedTask])

  const taskFilteredAttempts = useMemo(() => {
    if (!selectedTaskId) return []
    return taskAttemptsWithPaths.filter(a => a.task_id === selectedTaskId)
  }, [taskAttemptsWithPaths, selectedTaskId])

  const filteredAttempts = useMemo(() => {
    return filterByResultTypes(taskFilteredAttempts, selectedResultTypes)
  }, [taskFilteredAttempts, selectedResultTypes])

  const participantIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    participants.forEach((p, index) => {
      map.set(p.id, index + 1)
    })
    return map
  }, [participants])

  const totalParticipants = useMemo(() => {
    return new Set(taskFilteredAttempts.map(a => a.participant_id)).size
  }, [taskFilteredAttempts])

  const _aggregatedData = useMemo(() => {
    return computeAggregatedPaths(filteredAttempts, frameMap, totalParticipants)
  }, [filteredAttempts, frameMap, totalParticipants])

  const individualData = useMemo(() => {
    return computeIndividualPaths(filteredAttempts, frameMap, participantIndexMap)
  }, [filteredAttempts, frameMap, participantIndexMap])

  const hasAnyV3Steps = useMemo(() => {
    const pathway = selectedTask?.success_pathway as SuccessPathway | null
    if (!pathway) return false
    return pathwayHasStateSteps(pathway)
  }, [selectedTask])

  const variantLabelMap = useMemo(() => {
    const pathway = selectedTask?.success_pathway as SuccessPathway | null
    if (!pathway) return { labels: new Map<string, string>(), componentNames: new Map<string, string>() }
    return buildVariantLabelMap(pathway)
  }, [selectedTask])

  const displayIndividualData = useMemo(() => {
    return enrichIndividualPathsWithEvents(
      individualData, taskAttemptPaths, navEvents, stateEvents,
      frameMap, goalFrameIds, variantLabelMap
    )
  }, [individualData, taskAttemptPaths, navEvents, stateEvents, frameMap, goalFrameIds, variantLabelMap])

  // Re-aggregate from enriched individual data so grouping uses rich path keys.
  // This avoids duplicate keys when multiple frame-only groups collapse to the same rich path.
  const displayAggregatedData = useMemo(() => {
    return reaggregatePathsFromIndividual(displayIndividualData, totalParticipants)
  }, [displayIndividualData, totalParticipants])

  useEffect(() => {
    setPathDetailContext({
      frameMap,
      goalFrameIds,
      componentInstances,
      componentVariants,
      sortedAggregated: displayAggregatedData,
      sortedIndividual: displayIndividualData,
      taskAttempts,
      participants,
      displaySettings,
    })
  }, [frameMap, goalFrameIds, componentInstances, componentVariants, displayAggregatedData, displayIndividualData, taskAttempts, participants, displaySettings, setPathDetailContext])

  const handleAggregatedPathClick = useCallback((path: AggregatedPathData, index: number) => {
    openAggregatedPathDetail(path, index)
  }, [openAggregatedPathDetail])

  const handleIndividualPathClick = useCallback((path: IndividualPathData, index: number) => {
    openIndividualPathDetail(path, index)
  }, [openIndividualPathDetail])

  const handleParticipantClick = useCallback((participantId: string) => {
    setSelectedParticipantId(participantId)
  }, [])

  const handlePanelClose = useCallback(() => {
    if (isClosingRef.current) return
    isClosingRef.current = true
    closePanel()
    setSelectedParticipantId(null)
    setTimeout(() => {
      isClosingRef.current = false
    }, 0)
  }, [closePanel])

  const selectedParticipantData = useMemo(() => {
    if (!selectedParticipantId) return null

    const participant = participants.find(p => p.id === selectedParticipantId)
    if (!participant) return null

    const participantAttempts = taskAttempts.filter(
      a => a.participant_id === selectedParticipantId
    )
    const participantFlowResponses = flowResponses.filter(
      r => r.participant_id === selectedParticipantId
    )
    const participantIndex = participantIndexMap.get(selectedParticipantId) ?? 0

    const tasksSuccessful = participantAttempts.filter(a => a.outcome === 'success').length
    const tasksSkipped = participantAttempts.filter(a => a.outcome === 'skipped').length
    const totalTimeMs = participantAttempts.reduce((sum, a) => sum + (a.total_time_ms || 0), 0)
    const avgClicks = participantAttempts.length > 0
      ? participantAttempts.reduce((sum, a) => sum + (a.click_count || 0), 0) / participantAttempts.length
      : 0

    const totalMisclicks = participantAttempts.reduce((sum, a) => sum + (a.misclick_count || 0), 0)
    const totalBacktracks = participantAttempts.reduce((sum, a) => sum + (a.backtrack_count || 0), 0)
    const directPathCount = participantAttempts.filter(a => a.is_direct === true).length
    const avgTimeToFirstClick = participantAttempts.length > 0
      ? participantAttempts.reduce((sum, a) => sum + (a.time_to_first_click_ms || 0), 0) / participantAttempts.length
      : null

    const flowResponseCount = participantFlowResponses.length
    const postTaskResponseCount = participantAttempts.reduce((sum, a) => {
      const responses = a.post_task_responses as unknown[] | null
      return sum + (Array.isArray(responses) ? responses.length : 0)
    }, 0)

    const totalFlowQuestions = flowQuestions.length
    const totalPostTaskQuestions = tasks.reduce((sum, t) => {
      const questions = t.post_task_questions as unknown[] | null
      return sum + (Array.isArray(questions) ? questions.length : 0)
    }, 0)

    return {
      participant,
      participantIndex,
      attempts: participantAttempts,
      flowResponses: participantFlowResponses,
      tasksSuccessful,
      tasksSkipped,
      totalTimeMs,
      avgClicks,
      totalMisclicks,
      totalBacktracks,
      directPathCount,
      avgTimeToFirstClick,
      questionsAnswered: flowResponseCount + postTaskResponseCount,
      totalQuestions: totalFlowQuestions + totalPostTaskQuestions,
    }
  }, [selectedParticipantId, participants, taskAttempts, flowResponses, flowQuestions, tasks, participantIndexMap])

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

  useEffect(() => {
    if (!selectedParticipantData || isClosingRef.current) return

    const { participant, participantIndex, attempts, flowResponses: pFlowResponses } = selectedParticipantData

    const startedAt = new Date(participant.started_at || new Date())
    const completedAt = participant.completed_at ? new Date(participant.completed_at) : null

    const content = (
      <ParticipantDetailPanel
        participantIndex={participantIndex}
        identifier={participant.identifier_value || null}
        participantId={participant.id}
        stats={{
          questionsAnswered: selectedParticipantData.questionsAnswered,
          questionsTotal: selectedParticipantData.totalQuestions,
          completionPercent: selectedParticipantData.totalQuestions > 0
            ? Math.round((selectedParticipantData.questionsAnswered / selectedParticipantData.totalQuestions) * 100)
            : 0,
          timeTakenMs: selectedParticipantData.totalTimeMs,
          status: participant.status || 'unknown',
          startedAt,
          completedAt,
        }}
        demographics={null}
        urlTags={null}
        isExcluded={false}
        onClose={handlePanelClose}
        onNavigate={handleNavigateParticipant}
        canNavigatePrev={canNavigatePrev}
        canNavigateNext={canNavigateNext}
      >
        <ParticipantDetailContent
          tasksSuccessful={selectedParticipantData.tasksSuccessful}
          tasksSkipped={selectedParticipantData.tasksSkipped}
          totalTasks={tasks.length}
          totalTimeMs={selectedParticipantData.totalTimeMs}
          avgClicks={selectedParticipantData.avgClicks}
          totalMisclicks={selectedParticipantData.totalMisclicks}
          totalBacktracks={selectedParticipantData.totalBacktracks}
          directPathCount={selectedParticipantData.directPathCount}
          avgTimeToFirstClick={selectedParticipantData.avgTimeToFirstClick}
          attempts={attempts}
          tasks={tasks}
          flowResponses={pFlowResponses}
          flowQuestions={flowQuestions}
        />
      </ParticipantDetailPanel>
    )

    openDynamicPanel('participant-detail', {
      content,
      width: 'wide',
      hideHeader: true,
    })
  }, [
    selectedParticipantData,
    tasks,
    flowQuestions,
    openDynamicPanel,
    handlePanelClose,
    handleNavigateParticipant,
    canNavigatePrev,
    canNavigateNext,
  ])

  if (!selectedTaskId || !selectedTask) {
    return null
  }

  if (pathsLoading || eventsLoading) {
    return (
      <div className={standalone ? 'space-y-4' : 'space-y-4 pt-6 border-t'}>
        {!standalone && <SectionHeader />}
        <Card className="p-8 border-0 shadow-none">
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading participant paths...</span>
          </div>
        </Card>
      </div>
    )
  }

  if (taskFilteredAttempts.length === 0) {
    return (
      <div className={standalone ? 'space-y-4' : 'space-y-4 pt-6 border-t'}>
        {!standalone && <SectionHeader />}
        <Card className="p-8 text-center border-dashed">
          <p className="text-muted-foreground">
            No participant paths recorded for this task.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={standalone ? 'space-y-4' : 'space-y-4 pt-6 border-t'}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            {!standalone && <SectionHeader />}
            <ResultFiltersDropdown
              selectedTypes={selectedResultTypes}
              onSelectedTypesChange={setSelectedResultTypes}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id={standalone ? 'standalone-show-all-participants' : 'embedded-show-all-participants'}
                checked={showAllParticipants}
                onCheckedChange={(checked) =>
                  setShowAllParticipants(checked === true)
                }
              />
              <Label
                htmlFor={standalone ? 'standalone-show-all-participants' : 'embedded-show-all-participants'}
                className="text-sm cursor-pointer whitespace-nowrap"
              >
                Show all participants
              </Label>
            </div>

            {!hasAnyV3Steps && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={standalone ? 'standalone-show-thumbnails' : 'embedded-show-thumbnails'}
                  checked={showThumbnails}
                  onCheckedChange={(checked) =>
                    setShowThumbnails(checked === true)
                  }
                />
                <Label
                  htmlFor={standalone ? 'standalone-show-thumbnails' : 'embedded-show-thumbnails'}
                  className="text-sm cursor-pointer whitespace-nowrap"
                >
                  Show thumbnails
                </Label>
              </div>
            )}
          </div>
        </div>

        <Card className="p-4 overflow-visible border-0 shadow-none">
          <PathsTable
            aggregatedData={displayAggregatedData}
            individualData={displayIndividualData}
            showAllParticipants={showAllParticipants}
            showThumbnails={hasAnyV3Steps ? false : showThumbnails}
            frameMap={frameMap}
            goalFrameIds={goalFrameIds}
            onParticipantClick={handleParticipantClick}
            displaySettings={displaySettings}
            participants={participants}
            maxHeight={standalone ? 'calc(100vh - 280px)' : '500px'}
            onAggregatedPathClick={handleAggregatedPathClick}
            onIndividualPathClick={handleIndividualPathClick}
          />
        </Card>
      </div>
    </TooltipProvider>
  )
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-2">
      <h3 className="text-base font-semibold text-foreground">
        Participant paths
      </h3>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Info className="h-4 w-4" />
            <span className="sr-only">About participant paths</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <p className="text-sm">
            The paths table shows you how participants navigated through your
            prototype for this task. If a large portion of participants took
            indirect routes (backtracking), it suggests certain parts of your
            prototype flow are confusing.
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
