'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import { wilsonScoreCI } from '@/lib/algorithms/statistics'
import { formatTime } from '@/components/analysis/shared/format-time'
import { TaskStatusBreakdown } from './task-status-breakdown'
import { IndividualResponsesTable } from './individual-responses-table'
import { TimeBoxPlot } from '../../prototype-test/task-results/time-box-plot'
import type { Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type { LiveWebsiteTaskMetrics } from '@/services/results/live-website-overview'
import type {
  LiveWebsiteTask,
  LiveWebsiteResponse,
  LiveWebsiteEvent,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'

function MetricCardEnhanced({
  title,
  description,
  value,
  confidenceInterval,
}: {
  title: string
  description: string
  value: string
  confidenceInterval?: string | null
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-lg border bg-card">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        {confidenceInterval && (
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">{confidenceInterval}</p>
        )}
      </div>
      <div className="text-right">
        <span className="text-lg font-bold tabular-nums">{value}</span>
      </div>
    </div>
  )
}

interface SingleTaskViewProps {
  metrics: LiveWebsiteTaskMetrics
  trackingMode: string
  taskId: string
  responses: LiveWebsiteResponse[]
  events: LiveWebsiteEvent[]
  participants: Participant[]
  task: LiveWebsiteTask
  defaultTimeLimitSeconds?: number | null
  displaySettings?: ParticipantDisplaySettings | null
  compact?: boolean
}

export function SingleTaskView({
  metrics,
  trackingMode,
  taskId,
  responses,
  events,
  participants,
  task,
  defaultTimeLimitSeconds,
  displaySettings,
  compact,
}: SingleTaskViewProps) {
  const hasTimeLimit = task.time_limit_seconds != null || (defaultTimeLimitSeconds != null && defaultTimeLimitSeconds > 0)
  const showTimedOut = hasTimeLimit || metrics.timedOutCount > 0
  const statusCounts = useMemo<Record<string, number>>(() => ({
    completed: metrics.completedCount,
    abandoned: metrics.abandonedCount,
    timed_out: metrics.timedOutCount,
    skipped: metrics.skippedCount,
  }), [metrics.completedCount, metrics.abandonedCount, metrics.timedOutCount, metrics.skippedCount])

  const total = metrics.totalResponses
  const hasCompletionMethod = trackingMode !== 'url_only' && (metrics.directSuccessCount > 0 || metrics.indirectSuccessCount > 0 || metrics.selfReportedCount > 0)

  const successCIText = metrics.successCI && total > 5
    ? `95% CI: ${metrics.successCI.lowerBound.toFixed(1)}% – ${metrics.successCI.upperBound.toFixed(1)}%`
    : null

  const abandonRate = total > 0 ? metrics.abandonedCount / total : 0
  const abandonCIText = useMemo(() => {
    if (total <= 5) return null
    const ci = wilsonScoreCI(metrics.abandonedCount, total)
    return `95% CI: ${ci.lowerBound.toFixed(1)}% – ${ci.upperBound.toFixed(1)}%`
  }, [metrics.abandonedCount, total])

  const targetUrl = task.success_url || task.target_url || null

  return (
    <TooltipProvider>
      <Card className="border-0 shadow-none">
        <CardContent className="pt-0 px-0">
          <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-8 items-start`}>
            {/* Status breakdown */}
            <TaskStatusBreakdown
              metrics={metrics}
              trackingMode={trackingMode}
              showTimedOut={showTimedOut}
              statusCounts={statusCounts}
              total={total}
              hasCompletionMethod={hasCompletionMethod}
            />

            {/* Metrics */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Metrics</h3>

              <div className="space-y-2">
                <MetricCardEnhanced
                  title="Success Rate"
                  description="Percentage who completed the task"
                  value={`${(metrics.successRate * 100).toFixed(0)}%`}
                  confidenceInterval={successCIText}
                />

                <MetricCardEnhanced
                  title="Avg. Time"
                  description="Average time to complete the task"
                  value={formatTime(metrics.avgTimeMs)}
                />

                {trackingMode !== 'url_only' && (
                  <MetricCardEnhanced
                    title="Avg. Pages Visited"
                    description="Average unique pages visited per task"
                    value={metrics.avgPages.toFixed(1)}
                  />
                )}

                {trackingMode !== 'url_only' && (
                  <MetricCardEnhanced
                    title="Avg. Clicks"
                    description="Average clicks per participant on this task"
                    value={metrics.avgClicks > 0 ? metrics.avgClicks.toFixed(1) : '0'}
                  />
                )}

                <MetricCardEnhanced
                  title="Abandon Rate"
                  description="Percentage who abandoned the task"
                  value={`${(abandonRate * 100).toFixed(0)}%`}
                  confidenceInterval={abandonCIText}
                />
              </div>
            </div>
          </div>

          {/* Time distribution */}
          {total > 1 && metrics.timeBoxPlot && (
            <div className="mt-8 pt-6 border-t">
              <TimeBoxPlot boxPlot={metrics.timeBoxPlot} />
            </div>
          )}

          {/* Individual Responses — hidden in compact (side-by-side) mode */}
          {!compact && (
            <IndividualResponsesTable
              taskId={taskId}
              responses={responses}
              events={events}
              participants={participants}
              targetUrl={targetUrl}
              displaySettings={displaySettings}
            />
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
