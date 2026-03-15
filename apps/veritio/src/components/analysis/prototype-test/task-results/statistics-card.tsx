'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import { StatusBreakdownTable } from './status-breakdown-table'
import { SegmentedStatusBar } from './segmented-status-bar'
import { MetricProblemBadge, METRIC_BADGE_TOOLTIPS, type ProblemType } from './metric-problem-badge'
import { TimeBoxPlot } from './time-box-plot'
import type { PrototypeTaskMetrics, PrototypeStatusBreakdown } from '@/lib/algorithms/prototype-test-analysis'
import {
  PROTOTYPE_THRESHOLDS,
  getProblemIndicator,
} from '@/lib/constants/prototype-thresholds'
import { cn } from '@/lib/utils'
import { formatTime } from '@/components/analysis/shared/format-time'

interface StatisticsCardProps {
  taskMetrics: PrototypeTaskMetrics
  className?: string
}

export function StatisticsCard({
  taskMetrics,
  className,
}: StatisticsCardProps) {
  const safeMetrics = useMemo(() => {
    const successRate = taskMetrics.successRate ?? 0
    const directRate = taskMetrics.directRate ?? 0
    const misclickRate = taskMetrics.misclickRate ?? 0
    const averageTimeMs = taskMetrics.averageTimeMs ?? 0
    const responseCount = taskMetrics.responseCount ?? 0

    const statusBreakdown: PrototypeStatusBreakdown = taskMetrics.statusBreakdown ?? {
      success: { direct: 0, indirect: 0, total: taskMetrics.successCount ?? 0 },
      failure: { direct: 0, indirect: 0, total: taskMetrics.failureCount ?? 0 },
      abandoned: { direct: 0, indirect: 0, total: taskMetrics.abandonedCount ?? 0 },
      skipped: { direct: 0, indirect: 0, total: taskMetrics.skippedCount ?? 0 },
    }

    const successProblem = getProblemIndicator(successRate, PROTOTYPE_THRESHOLDS.successRate)
    const directnessProblem = getProblemIndicator(directRate, PROTOTYPE_THRESHOLDS.directnessRate)
    const misclickProblem = getProblemIndicator(misclickRate, PROTOTYPE_THRESHOLDS.misclickRate)
    const timeProblem = getProblemIndicator(averageTimeMs, PROTOTYPE_THRESHOLDS.avgTimeMs)

    return {
      successRate,
      directRate,
      misclickRate,
      averageTimeMs,
      responseCount,
      statusBreakdown,
      successCI: taskMetrics.successCI,
      directnessCI: taskMetrics.directnessCI,
      timeBoxPlot: taskMetrics.timeBoxPlot,
      successProblem,
      directnessProblem,
      misclickProblem,
      timeProblem,
    }
  }, [taskMetrics])

  const formatCI = (ci: { lowerBound: number; upperBound: number } | null | undefined) => {
    if (!ci) return null
    return `${ci.lowerBound.toFixed(0)}% - ${ci.upperBound.toFixed(0)}%`
  }

  return (
    <TooltipProvider>
      <Card className={cn('border-0 shadow-none', className)}>
        <CardContent className="pt-0 px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Task success and failure</h3>

              <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
                <SegmentedStatusBar
                  statusBreakdown={safeMetrics.statusBreakdown}
                  responseCount={safeMetrics.responseCount}
                />

                <StatusBreakdownTable
                  statusBreakdown={safeMetrics.statusBreakdown}
                  responseCount={safeMetrics.responseCount}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-semibold">Metrics</h3>

              <div className="space-y-2">
                <MetricCardEnhanced
                  title="Success Rate"
                  description="Percentage who completed the task successfully"
                  value={`${safeMetrics.successRate.toFixed(0)}%`}
                  problemType={safeMetrics.successProblem}
                  problemTooltip={METRIC_BADGE_TOOLTIPS.success.low}
                  confidenceInterval={
                    safeMetrics.responseCount > 5
                      ? formatCI(safeMetrics.successCI)
                      : null
                  }
                />

                <MetricCardEnhanced
                  title="Directness"
                  description="Completed without backtracking"
                  value={`${safeMetrics.directRate.toFixed(0)}%`}
                  problemType={safeMetrics.directnessProblem}
                  problemTooltip={METRIC_BADGE_TOOLTIPS.directness.low}
                  confidenceInterval={
                    safeMetrics.responseCount > 5
                      ? formatCI(safeMetrics.directnessCI)
                      : null
                  }
                />

                <MetricCardEnhanced
                  title="Avg. Time"
                  description="Average time to complete the task"
                  value={formatTime(safeMetrics.averageTimeMs)}
                  problemType={safeMetrics.timeProblem}
                  problemTooltip={METRIC_BADGE_TOOLTIPS.time.high}
                />

                <MetricCardEnhanced
                  title="Misclicks"
                  description="Clicks on non-interactive areas"
                  value={`${safeMetrics.misclickRate.toFixed(0)}%`}
                  problemType={safeMetrics.misclickProblem}
                  problemTooltip={METRIC_BADGE_TOOLTIPS.misclicks.high}
                />
              </div>
            </div>
          </div>

          {safeMetrics.timeBoxPlot && safeMetrics.responseCount > 1 && (
            <div className="mt-8 pt-6 border-t">
              <TimeBoxPlot boxPlot={safeMetrics.timeBoxPlot} />
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

function MetricCardEnhanced({
  title,
  description,
  value,
  problemType,
  problemTooltip,
  confidenceInterval,
}: {
  title: string
  description: string
  value: string
  problemType?: ProblemType
  problemTooltip?: string
  confidenceInterval?: string | null
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
        <p className="text-xs text-muted-foreground mt-0.5">
          {description}
        </p>
        {confidenceInterval && (
          <p className="text-xs text-muted-foreground/70 mt-1">
            95% CI: {confidenceInterval}
          </p>
        )}
      </div>
      <div className="text-right">
        <span className="text-lg font-bold tabular-nums">{value}</span>
      </div>
    </div>
  )
}


