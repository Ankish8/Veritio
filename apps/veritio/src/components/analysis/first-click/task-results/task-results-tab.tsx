'use client'

import { useState, useMemo } from 'react'
import { TaskSelector } from '@/components/analysis/prototype-test/task-results/task-selector'
import { PostTaskQuestions } from '@/components/analysis/prototype-test/task-results/post-task-questions'
import { FirstClickStatisticsCard } from './statistics-card'
import { AoiBreakdown } from './aoi-breakdown'
import { PercentileCards } from './percentile-cards'
import { BeeswarmSection } from './beeswarm-section'
import { ClickAccuracyCard } from './click-accuracy-card'
import { MisclickBreakdown } from './misclick-breakdown'
import type { FirstClickResultsResponse } from '@/services/results/first-click'
import type { PostTaskQuestion } from '@veritio/study-types'
import { castJsonArray } from '@/lib/supabase/json-utils'

interface TaskResultsTabProps {
  data: FirstClickResultsResponse
}

export function TaskResultsTab({ data }: TaskResultsTabProps) {
  const { metrics, tasks } = data

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    metrics.taskMetrics.length > 0 ? metrics.taskMetrics[0].taskId : null
  )

  const selectedMetric = metrics.taskMetrics.find((t) => t.taskId === selectedTaskId) ?? null
  const selectedTask = tasks.find((t: any) => t.id === selectedTaskId) ?? null
  const taskIndex = metrics.taskMetrics.findIndex((t) => t.taskId === selectedTaskId)

  const selectorTasks = useMemo(() => {
    return metrics.taskMetrics.map((t) => ({
      taskId: t.taskId,
      title: t.instruction,
    }))
  }, [metrics.taskMetrics])

  const postTaskQuestions = selectedTask
    ? castJsonArray<PostTaskQuestion>(selectedTask.post_task_questions)
    : []

  const adaptedPostTaskResponses = useMemo(() => {
    const postTaskResponses = data.postTaskResponses || []
    if (!selectedTaskId) return []
    return postTaskResponses
      .filter((r: any) => r.task_id === selectedTaskId)
      .map((r: any) => ({
        questionId: r.question_id,
        value: r.value,
        responseTimeMs: r.response_time_ms,
      }))
  }, [data.postTaskResponses, selectedTaskId])

  if (metrics.taskMetrics.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="font-medium text-lg mb-2">No Tasks</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This first-click test has no tasks defined. Add tasks in the builder to see results here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TaskSelector
        tasks={selectorTasks}
        selectedTaskId={selectedTaskId}
        onTaskSelect={setSelectedTaskId}
        hideLabel
      />

      {selectedMetric && selectedTask && (
        <>
          <h3 className="text-base font-medium">
            {taskIndex + 1}. {selectedMetric.instruction}
          </h3>

          <FirstClickStatisticsCard taskMetrics={selectedMetric} />

          {selectedMetric.timePercentiles && (
            <PercentileCards percentiles={selectedMetric.timePercentiles} />
          )}

          <BeeswarmSection taskId={selectedMetric.taskId} studyId={data.study.id} />

          {selectedMetric.clickAccuracy && (
            <ClickAccuracyCard accuracy={selectedMetric.clickAccuracy} />
          )}

          {selectedMetric.misclickCategories && (
            <MisclickBreakdown categories={selectedMetric.misclickCategories} />
          )}

          <AoiBreakdown metric={selectedMetric} />

          <PostTaskQuestions
            responses={adaptedPostTaskResponses}
            questions={postTaskQuestions}
          />
        </>
      )}

      {!selectedMetric && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Select a task above to view its statistics.
          </p>
        </div>
      )}
    </div>
  )
}
