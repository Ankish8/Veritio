'use client'

import { memo, useMemo, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatTime } from '@/lib/utils'

import { CompletionDisplay, TimeDisplay, DeviceInfoDisplay } from '@/components/analysis/shared'

import {
  LazyBarChart,
  LazyBar,
  LazyXAxis,
  LazyYAxis,
  LazyTooltip,
  LazyResponsiveContainer,
  LazyLegend,
  ChartLoadingSkeleton,
  ChartWrapper,
} from '@/components/ui/lazy-charts'

import type { LiveWebsiteMetrics, LiveWebsiteTaskMetrics } from '@/services/results/live-website-overview'
import type { Participant } from '@veritio/study-types'

interface LiveWebsiteOverviewTabProps {
  metrics: LiveWebsiteMetrics
  participants: Participant[]
  taskMetrics: LiveWebsiteTaskMetrics[]
  trackingMode: string
}

const COLORS = {
  completed: '#22c55e',
  directSuccess: '#16a34a',
  indirectSuccess: '#86efac',
  selfReported: '#a3e635',
  abandoned: '#f59e0b',
  timedOut: '#ef4444',
  skipped: '#94a3b8',
}

function getScoreColor(score: number) {
  if (score >= 70) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 40) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function UsabilityScoreBadge({ score }: { score: number }) {
  if (score === 0) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-4xl font-bold text-muted-foreground tabular-nums">—</span>
        <span className="text-xs text-muted-foreground">Not enough data</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-4xl font-bold tabular-nums ${getScoreColor(score)}`}>{score}</span>
      <span className="text-xs text-muted-foreground">out of 100</span>
    </div>
  )
}

function SubRate({ color, label, rate }: { color: string; label: string; rate: number }) {
  return (
    <div className="flex justify-between items-center pl-3">
      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="text-xs font-medium">{(rate * 100).toFixed(1)}%</span>
    </div>
  )
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload || payload.length === 0) return null
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: entry.color }} />
          <span className="text-xs text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

function TaskPerformanceChart({ taskMetrics, trackingMode }: { taskMetrics: LiveWebsiteTaskMetrics[]; trackingMode: string }) {
  const hasCompletionMethod = trackingMode !== 'url_only' && taskMetrics.some(t => t.directSuccessCount > 0 || t.indirectSuccessCount > 0 || t.selfReportedCount > 0)

  const chartData = useMemo(() => {
    const pct = (count: number, total: number) => total > 0 ? (count / total) * 100 : 0

    return taskMetrics.map((task, index) => {
      const t = task.totalResponses
      return {
        name: `Task ${index + 1}`,
        fullName: task.taskTitle,
        ...(hasCompletionMethod ? {
          direct: pct(task.directSuccessCount, t),
          indirect: pct(task.indirectSuccessCount, t),
          selfReported: pct(task.selfReportedCount, t),
        } : {
          completed: pct(task.completedCount, t),
        }),
        abandoned: pct(task.abandonedCount, t),
        timedOut: pct(task.timedOutCount, t),
        skipped: pct(task.skippedCount, t),
      }
    })
  }, [taskMetrics, hasCompletionMethod])

  const chartHeight = Math.max(250, chartData.length * 40 + 80)

  if (taskMetrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No task data available
      </div>
    )
  }

  return (
    <ChartWrapper height={chartHeight} className="w-full" data-pdf-chart="task-performance">
      <Suspense fallback={<ChartLoadingSkeleton height={chartHeight} />}>
        <LazyResponsiveContainer width="100%" height="100%">
          <LazyBarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <LazyXAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value: number) => `${value}%`}
            />
            <LazyYAxis
              type="category"
              dataKey="name"
              width={60}
              tick={{ fontSize: 12 }}
            />
            <LazyTooltip
              formatter={(value: any, name: any) => [`${Number(value ?? 0).toFixed(1)}%`, name]}
              labelFormatter={(label: string, payload: any) =>
                payload?.[0]?.payload?.fullName ?? label
              }
            />
            <LazyLegend content={<CustomLegend />} />
            {hasCompletionMethod ? (
              <>
                <LazyBar dataKey="direct" name="Direct" stackId="a" fill={COLORS.directSuccess} isAnimationActive={false} />
                <LazyBar dataKey="indirect" name="Indirect" stackId="a" fill={COLORS.indirectSuccess} isAnimationActive={false} />
                <LazyBar dataKey="selfReported" name="Self-Reported" stackId="a" fill={COLORS.selfReported} isAnimationActive={false} />
              </>
            ) : (
              <LazyBar dataKey="completed" name="Completed" stackId="a" fill={COLORS.completed} isAnimationActive={false} />
            )}
            <LazyBar dataKey="abandoned" name="Abandoned" stackId="a" fill={COLORS.abandoned} isAnimationActive={false} />
            <LazyBar dataKey="timedOut" name="Timed Out" stackId="a" fill={COLORS.timedOut} isAnimationActive={false} />
            <LazyBar dataKey="skipped" name="Skipped" stackId="a" fill={COLORS.skipped} isAnimationActive={false} />
          </LazyBarChart>
        </LazyResponsiveContainer>
      </Suspense>
    </ChartWrapper>
  )
}

export const LiveWebsiteOverviewTab = memo(function LiveWebsiteOverviewTab({
  metrics,
  participants,
  taskMetrics,
  trackingMode,
}: LiveWebsiteOverviewTabProps) {
  const times = metrics.participantTaskTimes
  const hidePages = trackingMode === 'url_only'
  const hasTaskData = taskMetrics.some(t => t.totalResponses > 0)
  const hasCompletionMethod = taskMetrics.some(t => t.directSuccessCount > 0 || t.indirectSuccessCount > 0 || t.selfReportedCount > 0)

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Participants Section */}
      <section data-pdf-chart="overview-stats">
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
              <TimeDisplay
                avgMs={metrics.averageCompletionTimeMs}
                times={times}
              />
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

      {/* Performance Section */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Usability Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <UsabilityScoreBadge score={metrics.usabilityScore} />
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <span className="text-sm font-medium">{hasTaskData ? `${(metrics.overallSuccessRate * 100).toFixed(1)}%` : '—'}</span>
                </div>
                {hasTaskData && hasCompletionMethod && trackingMode !== 'url_only' && (
                  <>
                    <SubRate color={COLORS.directSuccess} label="Direct Success" rate={metrics.overallDirectSuccessRate} />
                    <SubRate color={COLORS.indirectSuccess} label="Indirect Success" rate={metrics.overallIndirectSuccessRate} />
                    <SubRate color={COLORS.selfReported} label="Self-Reported" rate={metrics.overallSelfReportedRate} />
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg. Time / Task</span>
                  <span className="text-sm font-medium">{hasTaskData ? formatTime(metrics.avgTimePerTask) : '—'}</span>
                </div>
                {!hidePages && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg. Pages / Task</span>
                    <span className="text-sm font-medium">{hasTaskData ? metrics.avgPagesPerTask.toFixed(1) : '—'}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Task Performance</CardTitle>
            <CardDescription>
              Completion rate breakdown by task
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TaskPerformanceChart taskMetrics={taskMetrics} trackingMode={trackingMode} />
          </CardContent>
        </Card>
      </div>

    </div>
  )
})
