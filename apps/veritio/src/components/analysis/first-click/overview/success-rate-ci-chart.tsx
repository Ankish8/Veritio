'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import type { TaskMetric } from '@/services/results/first-click'

interface SuccessRateCIChartProps {
  taskMetrics: TaskMetric[]
  className?: string
}

const TICKS = [0, 25, 50, 75, 100]

// Distinct per-task colors: [bar, whisker]
const TASK_PALETTE: [string, string][] = [
  ['#6366f1', '#4338ca'], // indigo
  ['#f59e0b', '#b45309'], // amber
  ['#10b981', '#047857'], // emerald
  ['#ef4444', '#b91c1c'], // red
  ['#8b5cf6', '#6d28d9'], // violet
  ['#06b6d4', '#0e7490'], // cyan
  ['#ec4899', '#be185d'], // pink
  ['#f97316', '#c2410c'], // orange
]

export function SuccessRateCIChart({ taskMetrics, className }: SuccessRateCIChartProps) {
  const rows = useMemo(() => {
    return taskMetrics.map((task, i) => {
      const lower = task.successCI.lowerBound
      const upper = task.successCI.upperBound
      const rate = task.successRate
      const [barColor, whiskerColor] = TASK_PALETTE[i % TASK_PALETTE.length]

      return {
        taskId: task.taskId,
        label: task.instruction,
        displayLabel:
          task.instruction.length > 32
            ? task.instruction.slice(0, 32) + '...'
            : task.instruction,
        rate,
        lower,
        upper,
        barColor,
        whiskerColor,
        responseCount: task.responseCount,
        avgTimeMs: task.avgTimeToClickMs,
      }
    })
  }, [taskMetrics])

  return (
    <TooltipProvider delayDuration={100}>
      <div className={cn('w-full', className)} data-pdf-chart="success-rate-ci">
        {/* Chart rows */}
        <div className="space-y-px">
          {rows.map((row, i) => (
            <Tooltip key={row.taskId}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'flex items-center h-10 rounded-sm transition-colors cursor-default group',
                    i % 2 === 0 && 'bg-muted/20',
                    'hover:bg-muted/40'
                  )}
                >
                  {/* Task label */}
                  <div
                    className="w-[180px] shrink-0 pr-3 text-right"
                    title={row.label}
                  >
                    <span className="text-[12px] leading-tight text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1">
                      {row.displayLabel}
                    </span>
                  </div>

                  {/* Bar area */}
                  <div className="flex-1 relative h-full flex items-center min-w-0">
                    {/* Grid lines */}
                    {TICKS.map(tick => (
                      <div
                        key={tick}
                        className={cn(
                          'absolute top-0 bottom-0 w-px',
                          tick === 50
                            ? 'border-l border-dashed border-muted-foreground/30'
                            : 'bg-border/30'
                        )}
                        style={{ left: `${tick}%` }}
                      />
                    ))}

                    {/* Success rate bar */}
                    <div
                      className="h-[7px] rounded-full relative z-[1] transition-all opacity-75 group-hover:opacity-100 group-hover:h-[9px]"
                      style={{
                        width: `${Math.max(row.rate, 0.5)}%`,
                        backgroundColor: row.barColor,
                      }}
                    />

                    {/* CI horizontal connector */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-[2px] z-[1]"
                      style={{
                        left: `${row.lower}%`,
                        width: `${Math.max(row.upper - row.lower, 0.2)}%`,
                        backgroundColor: row.whiskerColor,
                      }}
                    />

                    {/* CI left cap */}
                    <div
                      className="absolute top-1/2 w-[2px] h-3 z-[1] rounded-full"
                      style={{
                        left: `${row.lower}%`,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: row.whiskerColor,
                      }}
                    />

                    {/* CI right cap */}
                    <div
                      className="absolute top-1/2 w-[2px] h-3 z-[1] rounded-full"
                      style={{
                        left: `${row.upper}%`,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: row.whiskerColor,
                      }}
                    />
                  </div>

                  {/* Rate percentage */}
                  <div className="w-14 shrink-0 text-right pl-2">
                    <span className="text-[12px] font-semibold tabular-nums text-foreground">
                      {row.rate.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[320px]">
                <div className="space-y-1.5">
                  <p className="font-medium text-xs leading-snug">{row.label}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                    <span className="text-muted-foreground">Success rate</span>
                    <span className="text-right font-medium">
                      {row.rate.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">95% CI</span>
                    <span className="text-right font-medium">
                      {row.lower.toFixed(1)}% &ndash; {row.upper.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">Responses</span>
                    <span className="text-right font-medium">
                      {row.responseCount}
                    </span>
                    <span className="text-muted-foreground">Avg time</span>
                    <span className="text-right font-medium">
                      {(row.avgTimeMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* X-axis tick labels */}
        <div className="relative ml-[180px] mr-14 h-5 mt-1.5">
          {TICKS.map(tick => (
            <span
              key={tick}
              className="absolute text-[12px] text-muted-foreground tabular-nums -translate-x-1/2"
              style={{ left: `${tick}%` }}
            >
              {tick}%
            </span>
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}
