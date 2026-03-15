'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatTime } from '@/components/analysis/shared/format-time'
import type { LiveWebsiteTaskMetrics } from '@/services/results/live-website-overview'

interface TaskComparisonViewProps {
  taskMetrics: LiveWebsiteTaskMetrics[]
  trackingMode: string
  onTaskSelect?: (taskId: string) => void
  className?: string
}

type RateColor = 'green' | 'amber' | 'red'

function getColorForRate(rate: number, inverted = false): RateColor {
  const value = inverted ? 1 - rate : rate
  if (value >= 0.7) return 'green'
  if (value >= 0.4) return 'amber'
  return 'red'
}

const COLOR_CLASSES: Record<RateColor, { bg: string; text: string }> = {
  green: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400' },
  red: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400' },
}

function RateBadge({ rate, count, total, label, inverted }: {
  rate: number
  count: number
  total: number
  label: string
  inverted?: boolean
}) {
  const { bg, text } = COLOR_CLASSES[getColorForRate(rate, inverted)]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-block px-2 py-1 rounded text-sm font-medium', bg, text)}>
          {(rate * 100).toFixed(0)}%
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {count} of {total} {label}
      </TooltipContent>
    </Tooltip>
  )
}

const STATUS_BAR_SEGMENTS = [
  { key: 'completed', color: 'bg-green-500' },
  { key: 'abandoned', color: 'bg-red-500' },
  { key: 'timedOut', color: 'bg-amber-500' },
  { key: 'skipped', color: 'bg-slate-400' },
] as const

const LEGEND_ITEMS = [
  { label: 'Completed', color: 'bg-green-500' },
  { label: 'Abandoned', color: 'bg-red-500' },
  { label: 'Timed Out', color: 'bg-amber-500' },
  { label: 'Skipped', color: 'bg-slate-400' },
]

function MiniStatusBar({ metrics }: { metrics: LiveWebsiteTaskMetrics }) {
  const total = metrics.totalResponses || 1
  const counts: Record<string, number> = {
    completed: metrics.completedCount,
    abandoned: metrics.abandonedCount,
    timedOut: metrics.timedOutCount,
    skipped: metrics.skippedCount,
  }

  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden flex w-full min-w-[60px]">
      {STATUS_BAR_SEGMENTS.map((segment) => {
        const percentage = (counts[segment.key] / total) * 100
        if (percentage === 0) return null
        return (
          <div
            key={segment.key}
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
  trackingMode,
  onTaskSelect,
  className,
}: TaskComparisonViewProps) {
  if (taskMetrics.length === 0) {
    return (
      <div className={cn('rounded-lg border border-dashed p-8 text-center', className)}>
        <h3 className="font-medium text-lg mb-2">No Tasks</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This live website test has no tasks defined. Add tasks in the builder to see results here.
        </p>
      </div>
    )
  }

  const showExtendedMetrics = trackingMode !== 'url_only'

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Task Comparison</h3>
          <p className="text-sm text-muted-foreground">
            Click a row to view task details
          </p>
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="min-w-[200px]">Task</TableHead>
                <TableHead className="text-center w-[100px]">Status</TableHead>
                <TableHead className="text-center w-[90px]">Success</TableHead>
                {showExtendedMetrics && (
                  <TableHead className="text-center w-[80px]">Direct %</TableHead>
                )}
                <TableHead className="text-center w-[80px]">Time</TableHead>
                {showExtendedMetrics && (
                  <>
                    <TableHead className="text-center w-[80px]">Pages</TableHead>
                    <TableHead className="text-center w-[70px]">Clicks</TableHead>
                  </>
                )}
                <TableHead className="text-center w-[90px]">Abandon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskMetrics.map((metrics, index) => {
                const abandonRate = metrics.totalResponses > 0
                  ? metrics.abandonedCount / metrics.totalResponses
                  : 0

                return (
                  <TableRow
                    key={metrics.taskId}
                    className={cn(
                      'transition-colors hover:bg-muted/50',
                      onTaskSelect && 'cursor-pointer'
                    )}
                    onClick={() => onTaskSelect?.(metrics.taskId)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">
                          {index + 1}. {metrics.taskTitle}
                        </span>
                        {metrics.totalResponses > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {metrics.totalResponses} responses
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <MiniStatusBar metrics={metrics} />
                    </TableCell>

                    <TableCell className="text-center">
                      <RateBadge
                        rate={metrics.successRate}
                        count={metrics.completedCount}
                        total={metrics.totalResponses}
                        label="completed"
                      />
                    </TableCell>

                    {showExtendedMetrics && (
                      <TableCell className="text-center">
                        <RateBadge
                          rate={metrics.directSuccessRate}
                          count={metrics.directSuccessCount}
                          total={metrics.totalResponses}
                          label="direct success"
                        />
                      </TableCell>
                    )}

                    <TableCell className="text-center">
                      <span className="text-sm font-medium">
                        {formatTime(metrics.avgTimeMs)}
                      </span>
                    </TableCell>

                    {showExtendedMetrics && (
                      <>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium">
                            {metrics.avgPages.toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium">
                            {metrics.avgClicks > 0 ? metrics.avgClicks.toFixed(1) : '-'}
                          </span>
                        </TableCell>
                      </>
                    )}

                    <TableCell className="text-center">
                      <RateBadge
                        rate={abandonRate}
                        count={metrics.abandonedCount}
                        total={metrics.totalResponses}
                        label="abandoned"
                        inverted
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={cn('w-3 h-3 rounded', item.color)} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}
