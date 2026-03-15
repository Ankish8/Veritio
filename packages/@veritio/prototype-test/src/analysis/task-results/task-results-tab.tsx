'use client'

import { useState, useMemo, useRef } from 'react'
import { TaskSelector } from './task-selector'
import { StatisticsCard } from './statistics-card'
import { PostTaskQuestions } from './post-task-questions'
import { TaskComparisonView } from './task-comparison-view'
import { TaskResultsExport } from './task-results-export'
import { EmbeddedPathsSection } from './embedded-paths-section'
import { AdvancedMetricsCard } from './advanced-metrics-card'
import { DwellTimeVisualization } from './dwell-time-visualization'
import { Button } from '@veritio/ui/components/button'
import { LayoutGrid, LayoutList, TrendingUp } from 'lucide-react'
import { cn } from '@veritio/ui'
import { getScoreRangeLabel } from '@veritio/prototype-test/lib/constants/prototype-thresholds'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import type {
  PrototypeTestTask,
  PrototypeTestTaskAttempt,
  PrototypeTestFrame,
  Participant,
  StudyFlowQuestion,
  StudyFlowResponse,
  PostTaskQuestion,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { ParticipantDisplaySettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { castJsonArray } from '@veritio/core/database'
import type { PrototypeTaskMetrics } from '@veritio/prototype-test/algorithms'
import { parseTaskAttempt } from '@veritio/prototype-test/algorithms'
import { usePrototypeTestNavigationEvents, useAdvancedMetrics, estimateOptimalPathLength } from '@veritio/prototype-test/hooks'

type ViewMode = 'single' | 'compare'

interface TaskResultsTabProps {
  studyId: string
  tasks: PrototypeTestTask[]
  taskMetrics: PrototypeTaskMetrics[]
  taskAttempts: PrototypeTestTaskAttempt[]
  frames: PrototypeTestFrame[]
  participants: Participant[]
  flowQuestions?: StudyFlowQuestion[]
  flowResponses?: StudyFlowResponse[]
  getPostTaskResponses: (taskId: string) => Record<string, unknown>[]
  studyTitle?: string
  displaySettings?: ParticipantDisplaySettings | null
  onNavigateToTab?: (tab: 'click-maps' | 'participants', filters?: object) => void
}
export function TaskResultsTab({
  studyId,
  tasks,
  taskMetrics,
  taskAttempts,
  frames,
  participants,
  flowQuestions = [],
  flowResponses = [],
  getPostTaskResponses,
  studyTitle = 'Prototype Test',
  displaySettings,
  onNavigateToTab,
}: TaskResultsTabProps) {
  // View mode: single task or comparison
  const [viewMode, setViewMode] = useState<ViewMode>('single')

  // Track selected task (for single task view)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    taskMetrics.length > 0 ? taskMetrics[0].taskId : null
  )

  // Ref for PNG export capture
  const statisticsRef = useRef<HTMLDivElement>(null)

  // Get selected task metrics
  const selectedTaskMetrics = useMemo(() => {
    return taskMetrics.find(t => t.taskId === selectedTaskId) ?? null
  }, [taskMetrics, selectedTaskId])

  // Get task index for display
  const taskIndex = useMemo(() => {
    return taskMetrics.findIndex(t => t.taskId === selectedTaskId)
  }, [taskMetrics, selectedTaskId])

  // Format tasks for selector
  const selectorTasks = useMemo(() => {
    return taskMetrics.map(t => ({
      taskId: t.taskId,
      title: t.taskTitle,
    }))
  }, [taskMetrics])

  // Get post-task responses for selected task
  const postTaskResponses = useMemo(() => {
    if (!selectedTaskId) return []
    return getPostTaskResponses(selectedTaskId)
  }, [selectedTaskId, getPostTaskResponses])

  // Get post-task question definitions for selected task
  const selectedTaskQuestions = useMemo(() => {
    if (!selectedTaskId) return []
    const task = tasks.find(t => t.id === selectedTaskId)
    if (!task) return []
    return castJsonArray<PostTaskQuestion>(task.post_task_questions)
  }, [selectedTaskId, tasks])

  // Get the selected task for advanced metrics
  const selectedTask = useMemo(() => {
    return tasks.find(t => t.id === selectedTaskId) || null
  }, [tasks, selectedTaskId])

  // Parse task attempts for the selected task
  const parsedTaskAttempts = useMemo(() => {
    if (!selectedTaskId) return []
    return taskAttempts
      .filter(a => a.task_id === selectedTaskId)
      .map(parseTaskAttempt)
  }, [taskAttempts, selectedTaskId])

  // Lazy load navigation events for advanced metrics
  const {
    navigationEvents,
    isLoading: navEventsLoading,
  } = usePrototypeTestNavigationEvents(viewMode === 'single' ? studyId : null)

  // Estimate optimal path length from task configuration
  const optimalPathLength = useMemo(() => {
    if (!selectedTask) return 2
    const successFrameIds = (selectedTask.success_frame_ids as string[] | null) || []
    const successPathway = selectedTask.success_pathway as { frames: string[] } | null
    return estimateOptimalPathLength(
      successFrameIds,
      successPathway,
      selectedTask.start_frame_id
    )
  }, [selectedTask])

  // Compute advanced metrics
  const { metrics: advancedMetrics } = useAdvancedMetrics({
    taskAttempts: parsedTaskAttempts,
    navigationEvents,
    optimalPathLength,
    frames: frames.map(f => ({ id: f.id, name: f.name, thumbnail_url: f.thumbnail_url })),
    taskId: selectedTaskId || undefined,
  })

  // Handle task selection from comparison view
  const handleTaskSelectFromComparison = (taskId: string) => {
    setSelectedTaskId(taskId)
    setViewMode('single')
  }

  // Handle empty state
  if (taskMetrics.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="font-medium text-lg mb-2">No Tasks</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This prototype test has no tasks defined. Add tasks in the builder to see results here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Compact header: Task selector (left) + View toggle & Export (right) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Task selector (only in single view) */}
        {viewMode === 'single' && (
          <TaskSelector
            tasks={selectorTasks}
            selectedTaskId={selectedTaskId}
            onTaskSelect={setSelectedTaskId}
            hideLabel
          />
        )}
        {viewMode === 'compare' && <div />}

        {/* Right: Task Score + View toggle + Export */}
        <div className="flex items-center gap-2">
          {/* Compact Task Score badge (only in single task view) */}
          {viewMode === 'single' && selectedTaskMetrics && (
            <TaskScoreBadge score={selectedTaskMetrics.taskScore ?? 0} />
          )}

          {/* View mode toggle */}
          {taskMetrics.length > 1 && (
            <div className="flex items-center rounded-lg border p-1">
              <Button
                variant={viewMode === 'single' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('single')}
              >
                <LayoutList className="h-4 w-4 mr-1.5" />
                Single Task
              </Button>
              <Button
                variant={viewMode === 'compare' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('compare')}
              >
                <LayoutGrid className="h-4 w-4 mr-1.5" />
                Compare All
              </Button>
            </div>
          )}

          {/* Export button (only in single task view) */}
          {viewMode === 'single' && selectedTaskMetrics && (
            <TaskResultsExport
              taskMetrics={selectedTaskMetrics}
              studyTitle={studyTitle}
              captureRef={statisticsRef as React.RefObject<HTMLElement>}
            />
          )}
        </div>
      </div>

      {/* Comparison View */}
      {viewMode === 'compare' && (
        <TaskComparisonView
          taskMetrics={taskMetrics}
          onTaskSelect={handleTaskSelectFromComparison}
        />
      )}

      {/* Single Task View */}
      {viewMode === 'single' && (
        <>
          {/* Wrap statistics and paths in ref for PNG export */}
          {selectedTaskMetrics && (
            <div ref={statisticsRef} className="space-y-6">
              {/* Statistics card */}
              <StatisticsCard taskMetrics={selectedTaskMetrics} />

              {/* Advanced Metrics Card (Lostness, Path Efficiency, Confusion Points) */}
              {advancedMetrics && (
                <AdvancedMetricsCard
                  lostness={advancedMetrics.lostness}
                  pathEfficiency={advancedMetrics.pathEfficiency}
                  confusionPoints={advancedMetrics.dwellTime.confusionPoints}
                />
              )}

              {/* Dwell Time Visualization */}
              {advancedMetrics && advancedMetrics.dwellTime.frameStats.length > 0 && (
                <DwellTimeVisualization dwellTimeAnalysis={advancedMetrics.dwellTime} />
              )}

              {/* Participant paths section (embedded from former Paths tab) */}
              <EmbeddedPathsSection
                studyId={studyId}
                selectedTaskId={selectedTaskId}
                tasks={tasks}
                frames={frames}
                taskAttempts={taskAttempts}
                participants={participants}
                flowQuestions={flowQuestions}
                flowResponses={flowResponses}
                displaySettings={displaySettings}
              />
            </div>
          )}

          {/* Post-task questions */}
          {selectedTaskMetrics && selectedTaskQuestions.length > 0 && postTaskResponses.length > 0 && (
            <PostTaskQuestions
              responses={postTaskResponses}
              questions={selectedTaskQuestions}
            />
          )}

          {/* No selection state */}
          {!selectedTaskMetrics && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Select a task above to view its statistics.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
function TaskScoreBadge({ score }: { score: number }) {
  const benchmarkLabel = getScoreRangeLabel(score)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm font-medium',
            benchmarkLabel === 'Excellent' && 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400',
            benchmarkLabel === 'Good' && 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400',
            benchmarkLabel === 'Fair' && 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400',
            benchmarkLabel === 'Poor' && 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
          )}>
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="tabular-nums font-bold">{score.toFixed(1)}</span>
            <span className="text-xs opacity-70">/10</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-xs">
            <p className="font-medium">Task Score: {benchmarkLabel}</p>
            <p className="text-muted-foreground">(Success × 3 + Directness) / 4</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
