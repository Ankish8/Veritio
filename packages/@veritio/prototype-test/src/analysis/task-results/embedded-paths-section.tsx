'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Info, Loader2 } from 'lucide-react'
import { Card } from '@veritio/ui/components/card'
import { Checkbox } from '@veritio/ui/components/checkbox'
import { Label } from '@veritio/ui/components/label'
import { Skeleton } from '@veritio/ui/components/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@veritio/ui/components/tooltip'
import { useFloatingActionBar } from '@veritio/analysis-shared/components/floating-action-bar'
import {
  ParticipantDetailPanel,
} from '@veritio/analysis-shared'
import { ParticipantDetailContent } from '../participants/participant-detail-content'
import { castJsonArray } from '@veritio/core/database'
import { PathsTable } from '../paths/paths-table'
import { ResultFiltersDropdown } from '../paths/result-filters-dropdown'
import { usePrototypeTestTaskAttemptPaths } from '@veritio/prototype-test/hooks'
import {
  type ResultType,
  ALL_RESULT_TYPES,
  filterByResultTypes,
  computeAggregatedPaths,
  computeIndividualPaths,
} from '../paths/paths-utils'
import type {
  PrototypeTestTask,
  PrototypeTestFrame,
  PrototypeTestTaskAttempt,
  Participant,
  StudyFlowQuestion,
  StudyFlowResponse,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { ParticipantDisplaySettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'

interface EmbeddedPathsSectionProps {
  studyId: string
  selectedTaskId: string | null
  tasks: PrototypeTestTask[]
  frames: PrototypeTestFrame[]
  taskAttempts: PrototypeTestTaskAttempt[]
  participants: Participant[]
  flowQuestions?: StudyFlowQuestion[]
  flowResponses?: StudyFlowResponse[]
  displaySettings?: ParticipantDisplaySettings | null
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
}: EmbeddedPathsSectionProps) {
  // State
  const [selectedResultTypes, setSelectedResultTypes] = useState<Set<ResultType>>(
    new Set(ALL_RESULT_TYPES)
  )
  const [showAllParticipants, setShowAllParticipants] = useState(false)
  const [showThumbnails, setShowThumbnails] = useState(false)
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null)

  // Floating panel
  const { openDynamicPanel, closePanel } = useFloatingActionBar()
  const isClosingRef = useRef(false)

  // Lazy load path_taken data (excluded from lightweight overview for performance)
  const { taskAttemptPaths, isLoading: pathsLoading } = usePrototypeTestTaskAttemptPaths(studyId)

  // Merge path_taken data into task attempts
  const taskAttemptsWithPaths = useMemo(() => {
    if (pathsLoading || taskAttemptPaths.length === 0) return taskAttempts

    // Create a map of id -> path_taken for quick lookup
    const pathMap = new Map(taskAttemptPaths.map(p => [p.id, p.path_taken]))

    // Merge path_taken into task attempts
    return taskAttempts.map(attempt => ({
      ...attempt,
      path_taken: pathMap.get(attempt.id) ?? attempt.path_taken,
    }))
  }, [taskAttempts, taskAttemptPaths, pathsLoading])

  // Get selected task
  const selectedTask = useMemo(() => {
    return tasks.find(t => t.id === selectedTaskId) ?? null
  }, [tasks, selectedTaskId])

  // Create frame map
  const frameMap = useMemo(() => {
    return new Map(frames.map(f => [f.id, f]))
  }, [frames])

  // Get goal frame IDs for selected task (success_frame_ids is the goal)
  const goalFrameIds = useMemo(() => {
    if (!selectedTask) return new Set<string>()
    const ids = castJsonArray<string>(selectedTask.success_frame_ids)
    return new Set(ids)
  }, [selectedTask])

  // Filter attempts for selected task (using merged data with path_taken)
  const taskFilteredAttempts = useMemo(() => {
    if (!selectedTaskId) return []
    return taskAttemptsWithPaths.filter(a => a.task_id === selectedTaskId)
  }, [taskAttemptsWithPaths, selectedTaskId])

  // Apply result type filters
  const filteredAttempts = useMemo(() => {
    return filterByResultTypes(taskFilteredAttempts, selectedResultTypes)
  }, [taskFilteredAttempts, selectedResultTypes])

  // Create participant index map (1-based)
  const participantIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    participants.forEach((p, index) => {
      map.set(p.id, index + 1)
    })
    return map
  }, [participants])

  // Total unique participants for percentage calculation (not attempt count)
  const totalParticipants = useMemo(() => {
    const uniqueParticipants = new Set(taskFilteredAttempts.map(a => a.participant_id))
    return uniqueParticipants.size
  }, [taskFilteredAttempts])

  // Compute aggregated path data
  const aggregatedData = useMemo(() => {
    return computeAggregatedPaths(filteredAttempts, frameMap, totalParticipants)
  }, [filteredAttempts, frameMap, totalParticipants])

  // Compute individual path data
  const individualData = useMemo(() => {
    return computeIndividualPaths(filteredAttempts, frameMap, participantIndexMap)
  }, [filteredAttempts, frameMap, participantIndexMap])

  // Handle participant click
  const handleParticipantClick = useCallback((participantId: string) => {
    setSelectedParticipantId(participantId)
  }, [])

  // Close panel handler
  const handlePanelClose = useCallback(() => {
    if (isClosingRef.current) return
    isClosingRef.current = true
    closePanel()
    setSelectedParticipantId(null)
    setTimeout(() => {
      isClosingRef.current = false
    }, 0)
  }, [closePanel])

  // Get selected participant data
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

    // Compute stats
    const tasksSuccessful = participantAttempts.filter(a => a.outcome === 'success').length
    const tasksSkipped = participantAttempts.filter(a => a.outcome === 'skipped').length
    const totalTimeMs = participantAttempts.reduce((sum, a) => sum + (a.total_time_ms || 0), 0)
    const avgClicks = participantAttempts.length > 0
      ? participantAttempts.reduce((sum, a) => sum + (a.click_count || 0), 0) / participantAttempts.length
      : 0

    // Behavioral metrics
    const totalMisclicks = participantAttempts.reduce((sum, a) => sum + (a.misclick_count || 0), 0)
    const totalBacktracks = participantAttempts.reduce((sum, a) => sum + (a.backtrack_count || 0), 0)
    const directPathCount = participantAttempts.filter(a => a.is_direct === true).length
    const avgTimeToFirstClick = participantAttempts.length > 0
      ? participantAttempts.reduce((sum, a) => sum + (a.time_to_first_click_ms || 0), 0) / participantAttempts.length
      : null

    // Count questions answered
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

  // Navigation in individual mode
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

  // Open panel when participant is selected
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
          studyId={studyId}
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

  // Don't render if no task selected
  if (!selectedTaskId || !selectedTask) {
    return null
  }

  // Loading state while fetching path data
  if (pathsLoading) {
    return (
      <div className="space-y-4 pt-6 border-t">
        <SectionHeader />
        <Card className="p-8 border-0 shadow-none">
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading participant paths...</span>
          </div>
        </Card>
      </div>
    )
  }

  // Empty state for no attempts
  if (taskFilteredAttempts.length === 0) {
    return (
      <div className="space-y-4 pt-6 border-t">
        <SectionHeader />
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
      <div className="space-y-4 pt-6 border-t">
        {/* Section header with controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left: Title and filter */}
          <div className="flex items-center gap-3">
            <SectionHeader />
            <ResultFiltersDropdown
              selectedTypes={selectedResultTypes}
              onSelectedTypesChange={setSelectedResultTypes}
            />
          </div>

          {/* Right: Checkboxes */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="embedded-show-all-participants"
                checked={showAllParticipants}
                onCheckedChange={(checked) =>
                  setShowAllParticipants(checked === true)
                }
              />
              <Label
                htmlFor="embedded-show-all-participants"
                className="text-sm cursor-pointer whitespace-nowrap"
              >
                Show all participants
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="embedded-show-thumbnails"
                checked={showThumbnails}
                onCheckedChange={(checked) =>
                  setShowThumbnails(checked === true)
                }
              />
              <Label
                htmlFor="embedded-show-thumbnails"
                className="text-sm cursor-pointer whitespace-nowrap"
              >
                Show thumbnails
              </Label>
            </div>
          </div>
        </div>

        {/* Main content: Table */}
        <Card className="p-4 overflow-visible border-0 shadow-none">
          <PathsTable
            aggregatedData={aggregatedData}
            individualData={individualData}
            showAllParticipants={showAllParticipants}
            showThumbnails={showThumbnails}
            frameMap={frameMap}
            goalFrameIds={goalFrameIds}
            onParticipantClick={handleParticipantClick}
            displaySettings={displaySettings}
            participants={participants}
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
