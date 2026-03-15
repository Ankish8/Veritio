'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Task, TreeNode } from '@veritio/study-types'
import type { TreeTestResponse } from '@/lib/algorithms/tree-test-analysis'
import { TaskBreadcrumb } from '../task-results/task-breadcrumb'
import { useTaskAnalysis } from '../shared/use-task-analysis'
import { DestinationsHeader } from './destinations-header'
import { DestinationsTable } from './destinations-table'
import { computeDestinationData } from './destinations-utils'

interface DestinationsTabProps {
  tasks: Task[]
  nodes: TreeNode[]
  responses: TreeTestResponse[]
  initialSelectedTaskId?: string | null
  onSelectedTaskIdChange?: (taskId: string | null) => void
}

/**
 * Destinations Analysis Tab
 *
 * Shows where participants ended up (their final selected node) for each task.
 * Features:
 * - Task selector to switch between tasks
 * - Two sections: correct destinations and incorrect destinations
 * - Shows breadcrumb path to each destination with participant counts
 * - Sortable tables by destination path or participant count
 */
export function DestinationsTab({
  tasks,
  nodes,
  responses,
  initialSelectedTaskId = null,
  onSelectedTaskIdChange,
}: DestinationsTabProps) {
  const {
    selectedTask,
    taskIndex,
    correctNodeIds,
    correctPathBreadcrumb,
    taskResponses,
    selectorTasks,
    selectedTaskId,
    handleTaskSelect,
  } = useTaskAnalysis({
    tasks,
    nodes,
    responses,
    initialSelectedTaskId,
    onSelectedTaskIdChange,
  })

  // Compute destination data
  const { correct: correctDestinations, incorrect: incorrectDestinations } = useMemo(() => {
    return computeDestinationData(taskResponses, nodes, correctNodeIds, taskResponses.length)
  }, [taskResponses, nodes, correctNodeIds])

  // Handle empty state
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="font-medium text-lg mb-2">No Tasks</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This tree test has no tasks defined. Add tasks in the builder to see destination analysis.
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header with title and task selector */}
        <DestinationsHeader
          tasks={selectorTasks}
          selectedTaskId={selectedTaskId}
          onTaskSelect={handleTaskSelect}
        />

        {/* Full task name and correct path */}
        {selectedTask && (
          <TaskBreadcrumb
            taskNumber={taskIndex + 1}
            taskQuestion={selectedTask.question}
            breadcrumbPath={correctPathBreadcrumb}
          />
        )}

        {/* Main content card with destinations table */}
        {selectedTask && (
          <Card className="p-4 border-0 shadow-none">
            <DestinationsTable
              correctDestinations={correctDestinations}
              incorrectDestinations={incorrectDestinations}
              totalResponses={taskResponses.length}
            />
          </Card>
        )}

        {/* No selection state */}
        {!selectedTask && tasks.length > 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Select a task to view destination analysis.
            </p>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}
