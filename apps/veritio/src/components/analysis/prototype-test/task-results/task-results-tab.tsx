'use client'

import { useState, useMemo, useRef } from 'react'
import { TaskSelector } from './task-selector'
import { StatisticsCard } from './statistics-card'
import { PostTaskQuestions } from './post-task-questions'
import { TaskComparisonView } from './task-comparison-view'
import { TaskResultsExport } from './task-results-export'
import { Button } from '@/components/ui/button'
import { LayoutGrid, LayoutList, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getScoreRangeLabel } from '@/lib/constants/prototype-thresholds'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type {
  PrototypeTestTask,
  PostTaskQuestion,
} from '@veritio/study-types'
import { castJsonArray } from '@/lib/supabase/json-utils'
import type { PrototypeTaskMetrics } from '@/lib/algorithms/prototype-test-analysis'

type ViewMode = 'single' | 'compare'

interface TaskResultsTabProps {
  tasks: PrototypeTestTask[]
  taskMetrics: PrototypeTaskMetrics[]
  getPostTaskResponses: (taskId: string) => Record<string, unknown>[]
  studyTitle?: string
  onNavigateToTab?: (tab: 'click-maps' | 'participants', filters?: object) => void
}

export function TaskResultsTab({
  tasks,
  taskMetrics,
  getPostTaskResponses,
  studyTitle = 'Prototype Test',
  onNavigateToTab: _onNavigateToTab,
}: TaskResultsTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('single')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    taskMetrics.length > 0 ? taskMetrics[0].taskId : null
  )
  const statisticsRef = useRef<HTMLDivElement>(null)

  const selectedTaskMetrics = useMemo(() => {
    return taskMetrics.find(t => t.taskId === selectedTaskId) ?? null
  }, [taskMetrics, selectedTaskId])

  const selectorTasks = useMemo(() => {
    return taskMetrics.map(t => ({
      taskId: t.taskId,
      title: t.taskTitle,
    }))
  }, [taskMetrics])

  const postTaskResponses = useMemo(() => {
    if (!selectedTaskId) return []
    return getPostTaskResponses(selectedTaskId)
  }, [selectedTaskId, getPostTaskResponses])

  const selectedTaskQuestions = useMemo(() => {
    if (!selectedTaskId) return []
    const task = tasks.find(t => t.id === selectedTaskId)
    if (!task) return []
    return castJsonArray<PostTaskQuestion>(task.post_task_questions)
  }, [selectedTaskId, tasks])

  function handleTaskSelectFromComparison(taskId: string) {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {viewMode === 'single' && (
          <TaskSelector
            tasks={selectorTasks}
            selectedTaskId={selectedTaskId}
            onTaskSelect={setSelectedTaskId}
            hideLabel
          />
        )}
        {viewMode === 'compare' && <div />}

        <div className="flex items-center gap-2">
          {viewMode === 'single' && selectedTaskMetrics && (
            <TaskScoreBadge score={selectedTaskMetrics.taskScore ?? 0} />
          )}

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

          {viewMode === 'single' && selectedTaskMetrics && (
            <TaskResultsExport
              taskMetrics={selectedTaskMetrics}
              studyTitle={studyTitle}
              captureRef={statisticsRef as React.RefObject<HTMLElement>}
            />
          )}
        </div>
      </div>

      {viewMode === 'compare' && (
        <TaskComparisonView
          taskMetrics={taskMetrics}
          onTaskSelect={handleTaskSelectFromComparison}
        />
      )}

      {viewMode === 'single' && (
        <>
          {selectedTaskMetrics && (
            <div ref={statisticsRef}>
              <StatisticsCard taskMetrics={selectedTaskMetrics} />
            </div>
          )}

          {selectedTaskMetrics && selectedTaskQuestions.length > 0 && postTaskResponses.length > 0 && (
            <PostTaskQuestions
              responses={postTaskResponses}
              questions={selectedTaskQuestions}
            />
          )}

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
