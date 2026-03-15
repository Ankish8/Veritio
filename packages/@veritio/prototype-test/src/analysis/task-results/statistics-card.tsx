'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@veritio/ui/components/card'
import { TooltipProvider } from '@veritio/ui/components/tooltip'
import { StatusBreakdownTable } from './status-breakdown-table'
import { SegmentedStatusBar } from './segmented-status-bar'
import { MetricProblemBadge, METRIC_BADGE_TOOLTIPS, type ProblemType } from './metric-problem-badge'
import { TimeBoxPlot } from './time-box-plot'
import type { PrototypeTaskMetrics, PrototypeStatusBreakdown } from '@veritio/prototype-test/algorithms/prototype-test-analysis'
import {
  PROTOTYPE_THRESHOLDS,
  getProblemIndicator,
} from '@veritio/prototype-test/lib/constants/prototype-thresholds'
import { cn } from '@veritio/ui'

interface StatisticsCardProps {
  taskMetrics: PrototypeTaskMetrics
  className?: string
}
export function StatisticsCard({
  taskMetrics,
  className,
}: StatisticsCardProps) {
  // Compute safe values with fallbacks for missing data
  const safeMetrics = useMemo(() => {
    const successRate = taskMetrics.successRate ?? 0
    const directRate = taskMetrics.directRate ?? 0
    const misclickRate = taskMetrics.misclickRate ?? 0
    const averageTimeMs = taskMetrics.averageTimeMs ?? 0
    const responseCount = taskMetrics.responseCount ?? 0

    // Use provided statusBreakdown or compute from counts
    const statusBreakdown: PrototypeStatusBreakdown = taskMetrics.statusBreakdown ?? {
      success: { direct: 0, indirect: 0, total: taskMetrics.successCount ?? 0 },
      failure: { direct: 0, indirect: 0, total: taskMetrics.failureCount ?? 0 },
      abandoned: { direct: 0, indirect: 0, total: taskMetrics.abandonedCount ?? 0 },
      skipped: { direct: 0, indirect: 0, total: taskMetrics.skippedCount ?? 0 },
    }

    // Calculate problem indicators
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
      // Problem indicators
      successProblem,
      directnessProblem,
      misclickProblem,
      timeProblem,
    }
  }, [taskMetrics])

  // Format confidence interval for display
  const formatCI = (ci: { lowerBound: number; upperBound: number } | null | undefined) => {
    if (!ci) return null
    return `${ci.lowerBound.toFixed(0)}% - ${ci.upperBound.toFixed(0)}%`
  }

  return (
    <TooltipProvider>
      <Card className={cn('border-0 shadow-none', className)}>
        <CardContent className="pt-0 px-0">
          {/* Side-by-side layout with aligned heights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left section: Segmented status bar + Status breakdown table */}
            <div className="space-y-3">
              {/* Section title */}
              <h3 className="text-base font-semibold">Task success and failure</h3>

              {/* Content container with border styling */}
              <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
                {/* Segmented status bar (replaces simple green progress bar) */}
                <SegmentedStatusBar
                  statusBreakdown={safeMetrics.statusBreakdown}
                  responseCount={safeMetrics.responseCount}
                />

                {/* Status breakdown table */}
                <StatusBreakdownTable
                  statusBreakdown={safeMetrics.statusBreakdown}
                  responseCount={safeMetrics.responseCount}
                />
              </div>
            </div>

            {/* Right section: Enhanced Metrics cards */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Metrics</h3>

              {/* Metric cards */}
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
                  // Note: Paths are now embedded below in the same view
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

          {/* Time Distribution Box Plot - Full width below */}
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
function formatTime(ms: number): string {
  if (ms === 0) return '0s'
  if (ms < 1000) return `${Math.round(ms)}ms`

  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)

  if (remainingSeconds === 0) return `${minutes}m`
  return `${minutes}m ${remainingSeconds}s`
}

