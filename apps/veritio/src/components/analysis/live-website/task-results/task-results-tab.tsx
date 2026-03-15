'use client'

import { useState, useMemo } from 'react'
import { TaskSelector } from '../../prototype-test/task-results/task-selector'
import { TaskComparisonView } from './task-comparison-view'
import { PostTaskQuestions } from '../../prototype-test/task-results/post-task-questions'
import { SingleTaskView } from './single-task-view'
import { SegmentedControl, type SegmentedControlOption } from '@/components/ui/segmented-control'
import { castJsonArray } from '@/lib/supabase/json-utils'
import type { PostTaskQuestion, Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type { LiveWebsiteTaskMetrics } from '@/services/results/live-website-overview'
import type {
  LiveWebsiteTask,
  LiveWebsitePostTaskResponse,
  LiveWebsiteResponse,
  LiveWebsiteEvent,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'

type ViewMode = 'single' | 'compare'

const VIEW_MODE_OPTIONS: SegmentedControlOption<ViewMode>[] = [
  { value: 'single', label: 'Single Task' },
  { value: 'compare', label: 'Compare All' },
]

export interface TaskResultsVariantComparison {
  primaryName: string
  compareName: string
  primaryTaskMetrics: LiveWebsiteTaskMetrics[]
  compareTaskMetrics: LiveWebsiteTaskMetrics[]
  primaryResponses: LiveWebsiteResponse[]
  compareResponses: LiveWebsiteResponse[]
  primaryEvents: LiveWebsiteEvent[]
  compareEvents: LiveWebsiteEvent[]
  primaryParticipants: Participant[]
  compareParticipants: Participant[]
  primaryPostTaskResponses: LiveWebsitePostTaskResponse[]
  comparePostTaskResponses: LiveWebsitePostTaskResponse[]
}

interface TaskResultsTabProps {
  tasks: LiveWebsiteTask[]
  taskMetrics: LiveWebsiteTaskMetrics[]
  getPostTaskResponses: (taskId: string) => LiveWebsitePostTaskResponse[]
  trackingMode: string
  responses: LiveWebsiteResponse[]
  events: LiveWebsiteEvent[]
  participants: Participant[]
  defaultTimeLimitSeconds?: number | null
  displaySettings?: ParticipantDisplaySettings | null
  variantComparison?: TaskResultsVariantComparison
}

export function TaskResultsTab({
  tasks,
  taskMetrics,
  getPostTaskResponses,
  trackingMode,
  responses,
  events,
  participants,
  defaultTimeLimitSeconds,
  displaySettings,
  variantComparison,
}: TaskResultsTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('single')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    taskMetrics.length > 0 ? taskMetrics[0].taskId : null
  )

  const selectedTaskMetrics = useMemo(() => {
    return taskMetrics.find(t => t.taskId === selectedTaskId) ?? null
  }, [taskMetrics, selectedTaskId])

  const selectorTasks = useMemo(() => {
    return taskMetrics.map(t => ({ taskId: t.taskId, title: t.taskTitle }))
  }, [taskMetrics])

  const postTaskResponses = useMemo(() => {
    if (!selectedTaskId) return []
    return getPostTaskResponses(selectedTaskId)
  }, [selectedTaskId, getPostTaskResponses])

  const selectedTaskQuestions = useMemo(() => {
    if (!selectedTaskId) return []
    const task = tasks.find(t => t.id === selectedTaskId)
    if (!task) return []
    return castJsonArray<PostTaskQuestion>(task.post_task_questions as any)
  }, [selectedTaskId, tasks])

  function handleTaskSelectFromComparison(taskId: string) {
    setSelectedTaskId(taskId)
    setViewMode('single')
  }

  if (taskMetrics.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="font-medium text-lg mb-2">No Tasks</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This live website test has no tasks defined. Add tasks in the builder to see results here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {viewMode === 'single' ? (
          <TaskSelector
            tasks={selectorTasks}
            selectedTaskId={selectedTaskId}
            onTaskSelect={setSelectedTaskId}
            hideLabel
          />
        ) : (
          <div />
        )}

        {taskMetrics.length > 1 && (
          <SegmentedControl
            options={VIEW_MODE_OPTIONS}
            value={viewMode}
            onValueChange={v => setViewMode(v as ViewMode)}
            size="default"
          />
        )}
      </div>

      {viewMode === 'compare' && (
        <TaskComparisonView
          taskMetrics={taskMetrics}
          trackingMode={trackingMode}
          onTaskSelect={handleTaskSelectFromComparison}
        />
      )}

      {viewMode === 'single' && selectedTaskMetrics && selectedTaskId && variantComparison && (() => {
        const primaryMetrics = variantComparison.primaryTaskMetrics.find(t => t.taskId === selectedTaskId)
        const compareMetrics = variantComparison.compareTaskMetrics.find(t => t.taskId === selectedTaskId)
        const selectedTask = tasks.find(t => t.id === selectedTaskId)!
        return (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                {variantComparison.primaryName} &middot; {variantComparison.primaryParticipants.length} participants
              </h3>
              {primaryMetrics && (
                <SingleTaskView
                  metrics={primaryMetrics}
                  trackingMode={trackingMode}
                  taskId={selectedTaskId}
                  responses={variantComparison.primaryResponses}
                  events={variantComparison.primaryEvents}
                  participants={variantComparison.primaryParticipants}
                  task={selectedTask}
                  defaultTimeLimitSeconds={defaultTimeLimitSeconds}
                  displaySettings={displaySettings}
                  compact
                />
              )}
            </div>
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                {variantComparison.compareName} &middot; {variantComparison.compareParticipants.length} participants
              </h3>
              {compareMetrics && (
                <SingleTaskView
                  metrics={compareMetrics}
                  trackingMode={trackingMode}
                  taskId={selectedTaskId}
                  responses={variantComparison.compareResponses}
                  events={variantComparison.compareEvents}
                  participants={variantComparison.compareParticipants}
                  task={selectedTask}
                  defaultTimeLimitSeconds={defaultTimeLimitSeconds}
                  displaySettings={displaySettings}
                  compact
                />
              )}
            </div>
          </div>
        )
      })()}

      {viewMode === 'single' && selectedTaskMetrics && selectedTaskId && !variantComparison && (
        <>
          <SingleTaskView
            metrics={selectedTaskMetrics}
            trackingMode={trackingMode}
            taskId={selectedTaskId}
            responses={responses}
            events={events}
            participants={participants}
            task={tasks.find(t => t.id === selectedTaskId)!}
            defaultTimeLimitSeconds={defaultTimeLimitSeconds}
            displaySettings={displaySettings}
          />

          {selectedTaskQuestions.length > 0 && postTaskResponses.length > 0 && (
            <PostTaskQuestions
              responses={postTaskResponses as unknown as Record<string, unknown>[]}
              questions={selectedTaskQuestions}
            />
          )}
        </>
      )}

      {viewMode === 'single' && !selectedTaskMetrics && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Select a task above to view its statistics.
          </p>
        </div>
      )}
    </div>
  )
}
