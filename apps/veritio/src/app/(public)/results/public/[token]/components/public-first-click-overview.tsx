'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HelpCircle, CheckCircle2, XCircle, TriangleAlert, Clock, SkipForward, Target } from 'lucide-react'
import { CompletionDisplay, TimeDisplay, DeviceInfoDisplay } from '@/components/analysis/shared'
import { TaskPerformanceChart } from '@/components/analysis/first-click/task-performance-chart'
import { SuccessRateCIChart } from '@/components/analysis/first-click/overview/success-rate-ci-chart'
import { cn, formatTime } from '@/lib/utils'
import type { Participant } from '@veritio/study-types'
import type { FirstClickMetrics, TaskMetric } from '@/services/results/first-click'

interface PublicFirstClickOverviewProps {
  metrics: FirstClickMetrics
  participants: Participant[]
  responses: any[]
}

function PublicTaskOverviewCard({ task, index }: { task: TaskMetric; index: number }) {
  const successCount = Math.round((task.successRate / 100) * task.responseCount)
  const skippedCount = Math.round((task.skipRate / 100) * task.responseCount)
  const failureCount = Math.max(0, task.responseCount - successCount - skippedCount)
  const total = task.responseCount || 1

  return (
    <div className="rounded-lg border border-border/60 bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="shrink-0 inline-flex items-center justify-center h-7 w-auto min-w-7 px-2 rounded-md bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h3 className="font-medium text-base leading-snug">{task.instruction}</h3>
          </div>
        </div>
        <SuccessRateBadge rate={task.successRate} />
      </div>

      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-4">
        <MetricTile
          icon={<Clock className="h-4 w-4" />}
          label="Avg. Time"
          value={formatTime(task.avgTimeToClickMs)}
        />
        <MetricTile
          icon={<Clock className="h-4 w-4" />}
          label="Median"
          value={formatTime(task.medianTimeToClickMs)}
        />
        <MetricTile
          icon={<Target className="h-4 w-4" />}
          label="AOIs Hit"
          value={String(task.aoiHits.filter(a => a.hitCount > 0).length)}
        />
        <MetricTile
          icon={<SkipForward className="h-4 w-4" />}
          label="Skip Rate"
          value={`${task.skipRate.toFixed(0)}%`}
          warn={task.skipRate > 20}
        />
      </div>

      <div className="space-y-1.5">
        <SegmentedMiniBar
          success={successCount}
          failure={failureCount}
          skipped={skippedCount}
          total={total}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground tabular-nums">
            {task.responseCount} responses
          </span>
          <span className="text-muted-foreground/40">|</span>
          {successCount > 0 && (
            <span className="text-xs font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
              {successCount} success
            </span>
          )}
          {failureCount > 0 && (
            <span className="text-xs font-medium tabular-nums text-red-600 dark:text-red-400">
              {failureCount} incorrect
            </span>
          )}
          {skippedCount > 0 && (
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {skippedCount} skipped
            </span>
          )}
        </div>
      </div>

      {task.aoiHits.some(a => a.hitCount > 0) && (
        <div className="pt-3 border-t border-border/40">
          <p className="text-xs text-muted-foreground mb-2">Area of Interest Hits:</p>
          <div className="flex flex-wrap gap-2">
            {task.aoiHits
              .filter(aoi => aoi.hitCount > 0)
              .sort((a, b) => b.hitPercent - a.hitPercent)
              .slice(0, 5)
              .map(aoi => (
                <Badge key={aoi.aoiId} variant="secondary" className="text-xs">
                  {aoi.aoiName}: {aoi.hitPercent.toFixed(0)}%
                </Badge>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SuccessRateBadge({ rate }: { rate: number }) {
  if (rate >= 70) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {rate.toFixed(0)}%
      </span>
    )
  }
  if (rate >= 40) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 text-sm font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
        <TriangleAlert className="h-3.5 w-3.5" />
        {rate.toFixed(0)}%
      </span>
    )
  }
  return (
    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-2.5 py-1 text-sm font-semibold text-red-700 dark:text-red-400 tabular-nums">
      <XCircle className="h-3.5 w-3.5" />
      {rate.toFixed(0)}%
    </span>
  )
}

function MetricTile({
  icon,
  label,
  value,
  warn,
}: {
  icon: React.ReactNode
  label: string
  value: string
  warn?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-md border px-3 py-2',
        warn
          ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20'
          : 'border-border/50 bg-muted/30'
      )}
    >
      <span className={cn(
        'shrink-0',
        warn ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
      )}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground leading-none">{label}</div>
        <div className="text-base font-semibold tabular-nums leading-snug">{value}</div>
      </div>
    </div>
  )
}

function SegmentedMiniBar({
  success,
  failure,
  skipped,
  total,
}: {
  success: number
  failure: number
  skipped: number
  total: number
}) {
  if (total === 0) return null

  const segments = [
    { count: success, color: 'bg-emerald-500' },
    { count: failure, color: 'bg-red-400' },
    { count: skipped, color: 'bg-slate-300 dark:bg-slate-600' },
  ].filter(s => s.count > 0)

  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted gap-px">
      {segments.map((seg, i) => (
        <div
          key={i}
          className={cn('h-full rounded-full', seg.color)}
          style={{ width: `${(seg.count / total) * 100}%` }}
        />
      ))}
    </div>
  )
}

export function PublicFirstClickOverview({
  metrics,
  participants,
  responses
}: PublicFirstClickOverviewProps) {
  const times = useMemo(() => {
    return responses
      .filter((r: any) => r.time_to_click_ms && r.time_to_click_ms > 0 && !r.is_skipped)
      .map((r: any) => r.time_to_click_ms as number)
  }, [responses])

  const timeMessage = useMemo(() => {
    if (!responses || responses.length === 0) {
      return "No completion time data available."
    }
    if (times.length === 0) return "Waiting for completion time data."
    return null
  }, [responses, times])

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Participants Section */}
      <section>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Participants</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <CompletionDisplay
                completed={metrics.completedParticipants}
                total={metrics.totalParticipants}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Time taken</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeDisplay avgMs={metrics.averageCompletionTimeMs} times={times} />
              {timeMessage && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {timeMessage}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Device Info</CardTitle>
            </CardHeader>
            <CardContent>
              <DeviceInfoDisplay participants={participants as any} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Performance Metrics Section */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className="text-sm font-medium">{metrics.overallSuccessRate.toFixed(1)}%</span>
              </div>
              {metrics.overallSuccessCI && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">95% CI</span>
                  <span className={cn('text-sm font-medium',
                    metrics.overallSuccessCI.lowerBound > 70
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : metrics.overallSuccessCI.upperBound < 50
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                  )}>
                    {metrics.overallSuccessCI.lowerBound.toFixed(1)}% - {metrics.overallSuccessCI.upperBound.toFixed(1)}%
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg. Time to Click</span>
                <span className="text-sm font-medium">{(metrics.averageCompletionTimeMs / 1000).toFixed(1)}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Responses</span>
                <span className="text-sm font-medium">
                  {metrics.taskMetrics.reduce((sum, t) => sum + t.responseCount, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tasks</span>
                <span className="text-sm font-medium">{metrics.taskMetrics.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Task Performance</CardTitle>
            <CardDescription>Success rate breakdown by task</CardDescription>
          </CardHeader>
          <CardContent>
            <TaskPerformanceChart tasks={metrics.taskMetrics} />
          </CardContent>
        </Card>
      </div>

      {/* Success Rate by Task with CI */}
      {metrics.taskMetrics.length >= 2 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Success Rate by Task</CardTitle>
              <CardDescription>
                Per-task success rates with 95% Wilson score confidence intervals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SuccessRateCIChart taskMetrics={metrics.taskMetrics} />
            </CardContent>
          </Card>
        </section>
      )}

      {/* Task Overview Section */}
      <section>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Task Overview</h2>
        <div className="space-y-3">
          {metrics.taskMetrics.map((task, index) => (
            <PublicTaskOverviewCard
              key={task.taskId}
              task={task}
              index={index}
            />
          ))}
          {metrics.taskMetrics.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-border/60 bg-card">
              <HelpCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No tasks configured for this study.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
