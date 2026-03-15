'use client'

import { memo } from 'react'
import { CheckCircle2, XCircle, Clock, SkipForward, Target, TriangleAlert, Crosshair } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { cn, formatTime } from '@/lib/utils'
import type { TaskMetric } from '@/services/results/first-click'

const METRIC_TOOLTIPS = {
  avgTime: 'Average time participants took to make their first click on the task image.',
  median: 'Median time to first click. Less affected by outliers than the average.',
  aoiHits: 'Number of defined Areas of Interest that received at least one click.',
  skipRate: 'Percentage of participants who skipped this task without clicking.',
}

interface TaskOverviewCardProps {
  task: TaskMetric
  index: number
}

export const TaskOverviewCard = memo(function TaskOverviewCard({ task, index }: TaskOverviewCardProps) {
  const { successCount, failCount, skipCount, responseCount } = task
  const total = responseCount || 1
  const hasDispersion = !!task.spatialStats

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

      <div className={cn(
        'grid gap-2.5 grid-cols-2',
        hasDispersion ? 'sm:grid-cols-5' : 'sm:grid-cols-4'
      )}>
        <MetricTile
          icon={<Clock className="h-4 w-4" />}
          label="Avg. Time"
          value={formatTime(task.avgTimeToClickMs)}
          tooltip={METRIC_TOOLTIPS.avgTime}
        />
        <MetricTile
          icon={<Clock className="h-4 w-4" />}
          label="Median"
          value={formatTime(task.medianTimeToClickMs)}
          tooltip={METRIC_TOOLTIPS.median}
        />
        <MetricTile
          icon={<Target className="h-4 w-4" />}
          label="AOIs Hit"
          value={String(task.aoiHits.filter(a => a.hitCount > 0).length)}
          tooltip={METRIC_TOOLTIPS.aoiHits}
        />
        <MetricTile
          icon={<SkipForward className="h-4 w-4" />}
          label="Skip Rate"
          value={`${task.skipRate.toFixed(0)}%`}
          tooltip={METRIC_TOOLTIPS.skipRate}
          warn={task.skipRate > 20}
        />
        {hasDispersion && (
          <MetricTile
            icon={<Crosshair className="h-4 w-4" />}
            label="Dispersion"
            value={`${(task.spatialStats!.sdd * 100).toFixed(0)}%`}
            tooltip="Spatial dispersion of clicks. Lower values mean clicks are more focused."
            warn={task.spatialStats!.sdd > 0.25}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <SegmentedMiniBar
          success={successCount}
          failure={failCount}
          skipped={skipCount}
          total={total}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground tabular-nums">
            {responseCount} responses
          </span>
          <span className="text-muted-foreground/40">|</span>
          {successCount > 0 && (
            <OutcomeChip color="green" count={successCount} label="success" />
          )}
          {failCount > 0 && (
            <OutcomeChip color="red" count={failCount} label="incorrect" />
          )}
          {skipCount > 0 && (
            <OutcomeChip color="slate" count={skipCount} label="skipped" />
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

function OutcomeChip({ color, count, label }: { color: 'green' | 'red' | 'slate'; count: number; label: string }) {
  const styles = {
    green: 'text-emerald-700 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
    slate: 'text-muted-foreground',
  }

  return (
    <span className={cn('text-xs font-medium tabular-nums', styles[color])}>
      {count} {label}
    </span>
  )
}
