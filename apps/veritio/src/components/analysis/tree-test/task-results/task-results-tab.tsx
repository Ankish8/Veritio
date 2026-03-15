'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { GitCompare } from 'lucide-react'
import { TaskSelector } from './task-selector'
import { TaskBreadcrumb } from './task-breadcrumb'
import { StatisticsCard } from './statistics-card'
import type { TaskMetrics } from '@/lib/algorithms/tree-test-analysis'

interface TaskResultsTabProps {
  taskMetrics: TaskMetrics[]
  initialSelectedTaskId?: string | null
  onSelectedTaskIdChange?: (taskId: string | null) => void
  onCompareTasksClick?: () => void
}

/**
 * Main Task Results tab container.
 * Shows task-by-task statistics with selector, breadcrumb, and visualizations.
 */
export function TaskResultsTab({
  taskMetrics,
  initialSelectedTaskId,
  onSelectedTaskIdChange,
  onCompareTasksClick,
}: TaskResultsTabProps) {
  // Track selected task
  const [internalSelectedTaskId, setInternalSelectedTaskId] = useState<string | null>(
    initialSelectedTaskId ?? (taskMetrics.length > 0 ? taskMetrics[0].taskId : null)
  )

  // Use internal state for selection
  const selectedTaskId = internalSelectedTaskId

  // Handle task selection
  const handleTaskSelect = useCallback((taskId: string) => {
    setInternalSelectedTaskId(taskId)
    onSelectedTaskIdChange?.(taskId)
  }, [onSelectedTaskIdChange])

  // Get selected task metrics
  const selectedTask = useMemo(() => {
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
      question: t.question,
    }))
  }, [taskMetrics])

  // Handle empty state
  if (taskMetrics.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="font-medium text-lg mb-2">No Tasks</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This tree test has no tasks defined. Add tasks in the builder to see results here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="space-y-4">
        {/* Section title */}
        <h2 className="text-lg font-semibold">Task by task statistics</h2>

        {/* Task selector */}
        <TaskSelector
          tasks={selectorTasks}
          selectedTaskId={selectedTaskId}
          onTaskSelect={handleTaskSelect}
        />
      </div>

      {/* Task header with breadcrumb and compare button */}
      {selectedTask && (
        <div className="flex items-start justify-between gap-4">
          <TaskBreadcrumb
            taskNumber={taskIndex + 1}
            taskQuestion={selectedTask.question}
            breadcrumbPath={selectedTask.correctPathBreadcrumb ?? []}
          />

          {taskMetrics.length > 1 && (
            <Button
              variant="outline"
              onClick={onCompareTasksClick}
              className="shrink-0"
            >
              <GitCompare className="h-4 w-4 mr-1.5" />
              Compare tasks
            </Button>
          )}
        </div>
      )}

      {/* Statistics card */}
      {selectedTask && (
        <StatisticsCard taskMetrics={selectedTask} />
      )}

      {/* No selection state */}
      {!selectedTask && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Select a task above to view its statistics.
          </p>
        </div>
      )}
    </div>
  )
}
