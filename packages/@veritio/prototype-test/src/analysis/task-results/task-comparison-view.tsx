'use client'

import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@veritio/ui/components/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import { cn } from '@veritio/ui'
import {
  getMetricColorClass,
  getScoreRangeLabel,
} from '@veritio/prototype-test/lib/constants/prototype-thresholds'
import type { PrototypeTaskMetrics } from '@veritio/prototype-test/algorithms/prototype-test-analysis'

interface TaskComparisonViewProps {
  taskMetrics: PrototypeTaskMetrics[]
  onTaskSelect?: (taskId: string) => void
  className?: string
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
function getBgColorClass(color: 'green' | 'amber' | 'red'): string {
  switch (color) {
    case 'green':
      return 'bg-green-50 dark:bg-green-950/30'
    case 'amber':
      return 'bg-amber-50 dark:bg-amber-950/30'
    case 'red':
      return 'bg-red-50 dark:bg-red-950/30'
  }
}
function getTextColorClass(color: 'green' | 'amber' | 'red'): string {
  switch (color) {
    case 'green':
      return 'text-green-700 dark:text-green-400'
    case 'amber':
      return 'text-amber-700 dark:text-amber-400'
    case 'red':
      return 'text-red-700 dark:text-red-400'
  }
}
function MiniStatusBar({ metrics }: { metrics: PrototypeTaskMetrics }) {
  const directSuccess = metrics.statusBreakdown?.success.direct ?? 0
  const indirectSuccess = metrics.statusBreakdown?.success.indirect ?? 0
  const failure = metrics.failureCount ?? 0
  const skipped = metrics.skippedCount ?? 0
  const total = metrics.responseCount || 1

  const segments = [
    { value: directSuccess, color: 'bg-green-600' },
    { value: indirectSuccess, color: 'bg-green-400' },
    { value: failure, color: 'bg-red-500' },
    { value: skipped, color: 'bg-slate-400' },
  ]

  return (
    <div className="h-2 bg-stone-200 rounded-full overflow-hidden flex w-full min-w-[60px]">
      {segments.map((segment, index) => {
        const percentage = (segment.value / total) * 100
        if (percentage === 0) return null
        return (
          <div
            key={index}
            className={cn('h-full', segment.color)}
            style={{ width: `${percentage}%` }}
          />
        )
      })}
    </div>
  )
}
export function TaskComparisonView({
  taskMetrics,
  onTaskSelect,
  className,
}: TaskComparisonViewProps) {
  // Sort tasks by their original order (assuming taskId contains order info or use index)
  const sortedMetrics = useMemo(() => {
    return [...taskMetrics]
  }, [taskMetrics])

  if (taskMetrics.length === 0) {
    return (
      <div className={cn('rounded-lg border border-dashed p-8 text-center', className)}>
        <h3 className="font-medium text-lg mb-2">No Tasks</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This prototype test has no tasks defined. Add tasks in the builder to see results here.
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Task Comparison</h3>
          <p className="text-sm text-muted-foreground">
            Click a row to view task details
          </p>
        </div>

        {/* Table */}
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="min-w-[200px]">Task</TableHead>
                <TableHead className="text-center w-[100px]">Status</TableHead>
                <TableHead className="text-center w-[90px]">Success</TableHead>
                <TableHead className="text-center w-[90px]">Direct</TableHead>
                <TableHead className="text-center w-[80px]">Time</TableHead>
                <TableHead className="text-center w-[90px]">Misclicks</TableHead>
                <TableHead className="text-center w-[80px]">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMetrics.map((metrics, index) => {
                const successColor = getMetricColorClass('successRate', metrics.successRate)
                const directColor = getMetricColorClass('directnessRate', metrics.directRate)
                const timeColor = getMetricColorClass('avgTimeMs', metrics.averageTimeMs)
                const misclickColor = getMetricColorClass('misclickRate', metrics.misclickRate)
                const scoreColor = getMetricColorClass('taskScore', metrics.taskScore)

                return (
                  <TableRow
                    key={metrics.taskId}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-muted/50',
                      onTaskSelect && 'cursor-pointer'
                    )}
                    onClick={() => onTaskSelect?.(metrics.taskId)}
                  >
                    {/* Task name */}
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">
                          {index + 1}. {metrics.taskTitle}
                        </span>
                        {metrics.responseCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {metrics.responseCount} responses
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Mini status bar */}
                    <TableCell>
                      <MiniStatusBar metrics={metrics} />
                    </TableCell>

                    {/* Success rate */}
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              'inline-block px-2 py-1 rounded text-sm font-medium',
                              getBgColorClass(successColor),
                              getTextColorClass(successColor)
                            )}
                          >
                            {metrics.successRate.toFixed(0)}%
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {metrics.successCount} of {metrics.responseCount} succeeded
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    {/* Directness rate */}
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              'inline-block px-2 py-1 rounded text-sm font-medium',
                              getBgColorClass(directColor),
                              getTextColorClass(directColor)
                            )}
                          >
                            {metrics.directRate.toFixed(0)}%
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Completed without backtracking
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    {/* Average time */}
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              'inline-block px-2 py-1 rounded text-sm font-medium',
                              getBgColorClass(timeColor),
                              getTextColorClass(timeColor)
                            )}
                          >
                            {formatTime(metrics.averageTimeMs)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Average time to complete task
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    {/* Misclick rate */}
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              'inline-block px-2 py-1 rounded text-sm font-medium',
                              getBgColorClass(misclickColor),
                              getTextColorClass(misclickColor)
                            )}
                          >
                            {metrics.misclickRate.toFixed(0)}%
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Clicks on non-interactive areas
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    {/* Score */}
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              'inline-block px-2 py-1 rounded text-sm font-medium',
                              getBgColorClass(scoreColor),
                              getTextColorClass(scoreColor)
                            )}
                          >
                            {metrics.taskScore.toFixed(1)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {getScoreRangeLabel(metrics.taskScore)} - (Success × 3 + Directness) / 4
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Excellent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span>Acceptable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Needs Improvement</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
