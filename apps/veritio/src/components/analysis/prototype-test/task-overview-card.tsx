'use client'

import { memo } from 'react'
import { CheckCircle2, XCircle, Clock, MousePointerClick, ArrowLeft, TriangleAlert } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatTime } from '@/lib/utils'
import type { PrototypeTaskMetrics } from '@/lib/algorithms/prototype-test-analysis'

const METRIC_TOOLTIPS = {
  avgTime: 'Average time participants spent completing this task, from clicking "Start Task" to reaching the goal screen.',
  avgClicks: 'Average number of clicks per participant on the prototype during the task.',
  misclicks: 'Average clicks on non-interactive areas. High misclicks may indicate affordance problems (elements look clickable but aren\'t).',
  backtracks: 'Average times participants went back to a previously visited screen. High backtracks may indicate navigation or information architecture issues.',
}

interface TaskOverviewCardProps {
  task: PrototypeTaskMetrics
  index: number
}

export const TaskOverviewCard = memo(function TaskOverviewCard({ task, index }: TaskOverviewCardProps) {
  const total = task.responseCount || 1

  return (
    <div className="rounded-lg border border-border/60 bg-card p-5 space-y-4">
      {/* Header: Task label + title + success badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="shrink-0 inline-flex items-center justify-center h-7 w-auto min-w-7 px-2 rounded-md bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h3 className="font-medium text-base leading-snug">{task.taskTitle}</h3>
            {task.taskInstruction && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.taskInstruction}
              </p>
            )}
          </div>
        </div>
        <SuccessRateBadge rate={task.successRate} />
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <MetricTile
          icon={<Clock className="h-4 w-4" />}
          label="Avg. Time"
          value={formatTime(task.averageTimeMs)}
          tooltip={METRIC_TOOLTIPS.avgTime}
        />
        <MetricTile
          icon={<MousePointerClick className="h-4 w-4" />}
          label="Avg. Clicks"
          value={task.averageClickCount.toFixed(1)}
          tooltip={METRIC_TOOLTIPS.avgClicks}
        />
        <MetricTile
          icon={<XCircle className="h-4 w-4" />}
          label="Misclicks"
          value={task.averageMisclickCount.toFixed(1)}
          tooltip={METRIC_TOOLTIPS.misclicks}
          warn={task.averageMisclickCount > 2}
        />
        <MetricTile
          icon={<ArrowLeft className="h-4 w-4" />}
          label="Backtracks"
          value={task.averageBacktrackCount.toFixed(1)}
          tooltip={METRIC_TOOLTIPS.backtracks}
          warn={task.averageBacktrackCount > 2}
        />
      </div>

      {/* Response breakdown: mini segmented bar + legend chips */}
      <div className="space-y-1.5">
        <SegmentedMiniBar
          success={task.successCount}
          failure={task.failureCount}
          abandoned={task.abandonedCount}
          skipped={task.skippedCount}
          total={total}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground tabular-nums">
            {task.responseCount} responses
          </span>
          <span className="text-muted-foreground/40">|</span>
          {task.successCount > 0 && (
            <OutcomeChip color="green" count={task.successCount} label="success" />
          )}
          {task.failureCount > 0 && (
            <OutcomeChip color="red" count={task.failureCount} label="failed" />
          )}
          {task.abandonedCount > 0 && (
            <OutcomeChip color="amber" count={task.abandonedCount} label="abandoned" />
          )}
          {task.skippedCount > 0 && (
            <OutcomeChip color="slate" count={task.skippedCount} label="skipped" />
          )}
        </div>
      </div>
    </div>
  )
})

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
  tooltip,
  warn,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tooltip: string
  warn?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-default transition-colors',
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
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

function SegmentedMiniBar({
  success,
  failure,
  abandoned,
  skipped,
  total,
}: {
  success: number
  failure: number
  abandoned: number
  skipped: number
  total: number
}) {
  if (total === 0) return null

  const segments = [
    { count: success, color: 'bg-emerald-500' },
    { count: failure, color: 'bg-red-400' },
    { count: abandoned, color: 'bg-amber-400' },
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

function OutcomeChip({ color, count, label }: { color: 'green' | 'red' | 'amber' | 'slate'; count: number; label: string }) {
  const styles = {
    green: 'text-emerald-700 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
    slate: 'text-muted-foreground',
  }

  return (
    <span className={cn('text-xs font-medium tabular-nums', styles[color])}>
      {count} {label}
    </span>
  )
}
