'use client'

import { useMemo, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { CompletionDisplay, TimeDisplay, DeviceInfoDisplay } from '@/components/analysis/shared'
import { TaskPerformanceChart } from './task-performance-chart'
import { TaskOverviewCard } from './task-overview-card'
import { SuccessRateCIChart } from './overview/success-rate-ci-chart'
import { RidgelineSection } from './overview/ridgeline-section'
import type { FirstClickResultsResponse } from '@/services/results/first-click'
import { Button } from '@/components/ui/button'

const TASK_DISPLAY_LIMIT = 10

interface FirstClickOverviewProps {
  data: FirstClickResultsResponse
}

export function FirstClickOverview({ data }: FirstClickOverviewProps) {
  const [showAllTasks, setShowAllTasks] = useState(false)
  const { metrics, participants, responses } = data

  const times = useMemo(() => {
    return (responses as { time_to_click_ms?: number; is_skipped?: boolean }[])
      .filter(r => r.time_to_click_ms && r.time_to_click_ms > 0 && !r.is_skipped)
      .map(r => r.time_to_click_ms as number)
  }, [responses])

  const totalResponses = useMemo(
    () => metrics.taskMetrics.reduce((sum, t) => sum + t.responseCount, 0),
    [metrics.taskMetrics]
  )

  return (
    <div className="space-y-6 sm:space-y-8">
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

      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <MetricRow label="Success Rate" value={`${metrics.overallSuccessRate.toFixed(1)}%`} />
              {metrics.overallSuccessCI && (
                <MetricRow
                  label="95% CI"
                  value={`${metrics.overallSuccessCI.lowerBound.toFixed(1)}% - ${metrics.overallSuccessCI.upperBound.toFixed(1)}%`}
                  colorClass={
                    metrics.overallSuccessCI.lowerBound > 70
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : metrics.overallSuccessCI.upperBound < 50
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                  }
                />
              )}
              <MetricRow label="Avg. Time to Click" value={`${(metrics.averageCompletionTimeMs / 1000).toFixed(1)}s`} />
              <MetricRow label="Total Responses" value={String(totalResponses)} />
              <MetricRow label="Tasks" value={String(metrics.taskMetrics.length)} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Task Performance</CardTitle>
            <CardDescription>
              Success rate breakdown by task
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TaskPerformanceChart tasks={metrics.taskMetrics} />
          </CardContent>
        </Card>
      </div>

      {metrics.taskMetrics.length >= 2 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                Success Rate by Task
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">Per-task success rates with 95% Wilson score confidence intervals. Green = strong performance (lower CI bound &gt; 70%). Red = poor performance (upper CI bound &lt; 50%). Amber = inconclusive.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
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

      {metrics.taskMetrics.length >= 2 && (
        <RidgelineSection data={data} />
      )}

      <section>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Task Overview</h2>
        <div className="space-y-3">
          {(showAllTasks ? metrics.taskMetrics : metrics.taskMetrics.slice(0, TASK_DISPLAY_LIMIT)).map((task, index) => (
            <TaskOverviewCard
              key={task.taskId}
              task={task}
              index={index}
            />
          ))}
          {metrics.taskMetrics.length > TASK_DISPLAY_LIMIT && (
            <div className="text-center pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowAllTasks(!showAllTasks)}>
                {showAllTasks ? 'Show less' : `Show all ${metrics.taskMetrics.length} tasks`}
              </Button>
            </div>
          )}
          {metrics.taskMetrics.length === 0 && (
            <div className="text-center text-muted-foreground py-8 rounded-lg border border-border/60 bg-card">
              No tasks configured for this study.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function MetricRow({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium', colorClass)}>{value}</span>
    </div>
  )
}
