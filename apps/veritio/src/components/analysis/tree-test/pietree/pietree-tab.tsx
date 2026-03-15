'use client'

import { useState, useMemo, memo } from 'react'
import { Card } from '@/components/ui/card'
import { TaskSelector } from '../task-results/task-selector'
import { TaskBreadcrumb } from '../task-results/task-breadcrumb'
import { PietreeControls, type PietreeLayout } from './pietree-controls'
import { PietreeLegend } from './pietree-legend'
import { PietreeVisualization } from './pietree-visualization'
import type { TreeNode, Task } from '@veritio/study-types'
import type { TreeTestResponse } from '@/lib/algorithms/tree-test-analysis'
import { useTaskAnalysis } from '../shared/use-task-analysis'

interface PietreeTabProps {
  tasks: Task[]
  nodes: TreeNode[]
  responses: TreeTestResponse[]
  initialSelectedTaskId?: string | null
  onSelectedTaskIdChange?: (taskId: string | null) => void
}

/**
 * Pietree Tab Component
 *
 * Main container for the Pie Tree visualization tab.
 * Includes task selector, layout toggle, legend, and the visualization.
 *
 * Wrapped in React.memo to prevent re-renders when switching between sub-tabs.
 */
export const PietreeTab = memo(function PietreeTab({
  tasks,
  nodes,
  responses,
  initialSelectedTaskId,
  onSelectedTaskIdChange,
}: PietreeTabProps) {
  const [layout, setLayout] = useState<PietreeLayout>('horizontal')

  const {
    selectedTaskId,
    selectedTask,
    taskIndex,
    correctNodeIds,
    correctPathBreadcrumb,
    taskResponses,
    selectorTasks,
    handleTaskSelect,
  } = useTaskAnalysis({
    tasks,
    nodes,
    responses,
    initialSelectedTaskId,
    onSelectedTaskIdChange,
  })

  // Dynamic height: more nodes = taller visualization to prevent label overlap
  const visualizationHeight = useMemo(
    () => Math.min(Math.max(500, nodes.length * 50), 1200),
    [nodes.length]
  )

  // Handle empty state
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="font-medium text-lg mb-2">No Tasks</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This tree test has no tasks defined. Add tasks in the builder to see the pie tree visualization.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Task selector with label */}
      <TaskSelector
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

      {/* Main visualization card - responsive layout */}
      {selectedTask && (
        <Card className="p-3 sm:p-4 border-0 shadow-none">
          <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
            {/* Legend - stacked on mobile, side on desktop */}
            <div className="flex-shrink-0 lg:w-56 lg:border-r border-stone-100 lg:pr-4 pb-3 lg:pb-0 border-b lg:border-b-0">
              <PietreeLegend />
            </div>

            {/* Visualization area with layout toggle inside */}
            <div className="flex-1 min-w-0 relative">
              {/* Layout toggle - positioned inside card top-right */}
              <div className="absolute top-0 right-0 z-10">
                <PietreeControls
                  layout={layout}
                  onLayoutChange={setLayout}
                />
              </div>

              {/* Visualization with scroll - responsive height */}
              <div className="overflow-auto max-h-[500px] sm:max-h-[600px] lg:max-h-[700px]">
                <PietreeVisualization
                  nodes={nodes}
                  responses={taskResponses}
                  correctNodeIds={correctNodeIds}
                  layout={layout}
                  height={visualizationHeight}
                  nodeSpacing={55}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* No selection state */}
      {!selectedTask && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Select a task to view its pie tree visualization.
          </p>
        </div>
      )}
    </div>
  )
})
