'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Task, TreeNode } from '@veritio/study-types'
import type { TreeTestResponse } from '@/lib/algorithms/tree-test-analysis'
import { TaskBreadcrumb } from '../task-results/task-breadcrumb'
import { useTaskAnalysis } from '../shared/use-task-analysis'
import { FirstClickHeader } from './first-click-header'
import { FirstClickSummaryBar } from './first-click-summary'
import { FirstClickTable } from './first-click-table'
import { computeExtendedFirstClickData, computeFirstClickSummary } from './first-click-utils'

interface FirstClickTabProps {
  tasks: Task[]
  nodes: TreeNode[]
  responses: TreeTestResponse[]
  initialSelectedTaskId?: string | null
  onSelectedTaskIdChange?: (taskId: string | null) => void
}

export function FirstClickTab({
  tasks,
  nodes,
  responses,
  initialSelectedTaskId = null,
  onSelectedTaskIdChange,
}: FirstClickTabProps) {
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

  const extendedFirstClickData = useMemo(
    () => computeExtendedFirstClickData(taskResponses, nodes, correctNodeIds),
    [taskResponses, nodes, correctNodeIds]
  )

  const summary = useMemo(
    () => computeFirstClickSummary(taskResponses, nodes, correctNodeIds),
    [taskResponses, nodes, correctNodeIds]
  )

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <FirstClickHeader
          tasks={selectorTasks}
          selectedTaskId={selectedTaskId}
          onTaskSelect={handleTaskSelect}
        />

        {selectedTask && (
          <TaskBreadcrumb
            taskNumber={taskIndex + 1}
            taskQuestion={selectedTask.question}
            breadcrumbPath={correctPathBreadcrumb}
          />
        )}

        {selectedTask && (
          <Card className="p-4 overflow-visible border-0 shadow-none">
            <FirstClickSummaryBar summary={summary} />
            <FirstClickTable data={extendedFirstClickData} />
          </Card>
        )}

        {!selectedTask && tasks.length > 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Select a task to view first click analysis.</p>
          </Card>
        )}

        {tasks.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No tasks available for this study.</p>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}
