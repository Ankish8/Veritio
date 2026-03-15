'use client'

import { useMemo } from 'react'
import { HelpCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  MetricProblemBadge,
  type ProblemType,
} from '@/components/analysis/prototype-test/task-results/metric-problem-badge'
import { formatTime } from '@/components/analysis/shared/format-time'
import {
  FIRST_CLICK_THRESHOLDS,
  FIRST_CLICK_BADGE_TOOLTIPS,
  getProblemIndicator,
} from '@/lib/constants/first-click-thresholds'
import { cn } from '@/lib/utils'
import type { TaskMetric } from '@/services/results/first-click'

const STATUS_COLORS = {
  success: 'bg-emerald-500',
  fail: 'bg-red-400',
  skip: 'bg-stone-300 dark:bg-stone-600',
} as const

function SegmentedBar({ metric }: { metric: TaskMetric }) {
  const { responseCount, successCount, failCount, skipCount } = metric
  if (responseCount === 0) return null

  const segments = [
    { key: 'success', count: successCount, color: STATUS_COLORS.success },
    { key: 'fail', count: failCount, color: STATUS_COLORS.fail },
    { key: 'skip', count: skipCount, color: STATUS_COLORS.skip },
  ].filter(s => s.count > 0)

  return (
    <div className="flex h-3 w-full rounded-full overflow-hidden">
      {segments.map((seg) => (
        <div
          key={seg.key}
          className={cn(seg.color, 'transition-all')}
          style={{ width: `${(seg.count / responseCount) * 100}%` }}
        />
      ))}
    </div>
  )
}

function StatusTable({ metric }: { metric: TaskMetric }) {
  const { responseCount, successCount, failCount, skipCount } = metric

  const pct = (count: number) =>
    responseCount > 0 ? Math.round((count / responseCount) * 100) : 0

  const rows = [
    { label: 'Success', color: 'bg-emerald-500', count: successCount },
    { label: 'Fail', color: 'bg-red-400', count: failCount },
    { label: 'Skipped', color: 'bg-stone-300 dark:bg-stone-600', count: skipCount },
  ]

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-muted-foreground">
          <th className="text-left py-2 font-medium">Result</th>
          <th className="text-center py-2 font-medium w-20">Count</th>
          <th className="text-right py-2 font-medium w-16">%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b last:border-0">
            <td className="py-2.5">
              <div className="flex items-center gap-2">
                <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', row.color)} />
                <span className="font-medium">{row.label}</span>
              </div>
            </td>
            <td className="py-2.5 text-center tabular-nums">{row.count}</td>
            <td className="py-2.5 text-right tabular-nums">{pct(row.count)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MetricCardEnhanced({
  title,
  description,
  value,
  problemType,
  problemTooltip,
}: {
  title: string
  description: string
  value: string
  problemType?: ProblemType
  problemTooltip?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-lg border bg-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm">{title}</h4>
          {problemType && (
            <MetricProblemBadge type={problemType} tooltip={problemTooltip} />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="text-right">
        <span className="text-lg font-bold tabular-nums">{value}</span>
      </div>
    </div>
  )
}

interface FirstClickStatisticsCardProps {
  taskMetrics: TaskMetric
  className?: string
}

export function FirstClickStatisticsCard({
  taskMetrics,
  className,
}: FirstClickStatisticsCardProps) {
  const computed = useMemo(() => {
    const successRate = taskMetrics.successRate ?? 0
    const avgTimeMs = taskMetrics.avgTimeToClickMs ?? 0
    const missRate = taskMetrics.missRate ?? 0

    return {
      successRate,
      avgTimeMs,
      missRate,
      successProblem: getProblemIndicator(successRate, FIRST_CLICK_THRESHOLDS.successRate),
      timeProblem: getProblemIndicator(avgTimeMs, FIRST_CLICK_THRESHOLDS.avgTimeMs),
      missProblem: getProblemIndicator(missRate, FIRST_CLICK_THRESHOLDS.missRate),
    }
  }, [taskMetrics])

  return (
    <TooltipProvider>
      <Card className={cn('border-0 shadow-none', className)}>
        <CardContent className="pt-0 px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-semibold">Task success and failure</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">Breakdown of participant outcomes. Success = clicked within the correct area of interest. Fail = clicked outside. Skipped = did not click.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
                <SegmentedBar metric={taskMetrics} />
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Success
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400" /> Fail
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-600" /> Skipped
                  </span>
                </div>
                <StatusTable metric={taskMetrics} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-semibold">Metrics</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">Key performance indicators for this task. Problem badges (yellow/red) appear when metrics fall outside acceptable thresholds.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-2">
                <MetricCardEnhanced
                  title="Success Rate"
                  description="Percentage who clicked within the correct area"
                  value={`${computed.successRate.toFixed(0)}%`}
                  problemType={computed.successProblem}
                  problemTooltip={FIRST_CLICK_BADGE_TOOLTIPS.success.low}
                />
                <MetricCardEnhanced
                  title="Avg. Time to Click"
                  description="Average time before the first click"
                  value={formatTime(computed.avgTimeMs)}
                  problemType={computed.timeProblem}
                  problemTooltip={FIRST_CLICK_BADGE_TOOLTIPS.time.high}
                />
                <MetricCardEnhanced
                  title="Miss Rate"
                  description="Non-skipped clicks outside all areas of interest"
                  value={`${computed.missRate.toFixed(0)}%`}
                  problemType={computed.missProblem}
                  problemTooltip={FIRST_CLICK_BADGE_TOOLTIPS.miss.high}
                />
                {taskMetrics.clickAccuracy && (
                  <MetricCardEnhanced
                    title="Click Accuracy"
                    description="How close clicks land to the target center"
                    value={`${Math.round(taskMetrics.clickAccuracy.meanScore)}`}
                    problemType={getProblemIndicator(taskMetrics.clickAccuracy.meanScore, FIRST_CLICK_THRESHOLDS.clickAccuracy)}
                    problemTooltip={FIRST_CLICK_BADGE_TOOLTIPS.clickAccuracy.low}
                  />
                )}
                {taskMetrics.spatialStats && (
                  <MetricCardEnhanced
                    title="Spatial Dispersion"
                    description="Standard deviation of click positions (SDD)"
                    value={`${(taskMetrics.spatialStats.sdd * 100).toFixed(1)}%`}
                    problemType={getProblemIndicator(taskMetrics.spatialStats.sdd, FIRST_CLICK_THRESHOLDS.sdd)}
                    problemTooltip={FIRST_CLICK_BADGE_TOOLTIPS.sdd.high}
                  />
                )}
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
