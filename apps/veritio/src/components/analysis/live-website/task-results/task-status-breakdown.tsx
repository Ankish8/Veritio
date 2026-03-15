'use client'

import { useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LiveWebsiteTaskMetrics } from '@/services/results/live-website-overview'

export const STATUS_SEGMENTS = [
  { key: 'completed' as const, label: 'Completed', color: '#22c55e', bgClass: 'bg-green-500' },
  { key: 'abandoned' as const, label: 'Abandoned', color: '#ef4444', bgClass: 'bg-red-500' },
  { key: 'timed_out' as const, label: 'Timed Out', color: '#f59e0b', bgClass: 'bg-amber-500' },
  { key: 'skipped' as const, label: 'Skipped', color: '#94a3b8', bgClass: 'bg-slate-400' },
]

const STATUS_TOOLTIPS: Record<string, string> = {
  completed: 'Participant completed the task successfully',
  abandoned: 'Participant gave up and abandoned the task',
  timed_out: 'Task exceeded the time limit',
  skipped: 'Participant chose to skip the task',
}

export const COMPLETION_SEGMENTS = [
  { key: 'direct' as const, label: 'Direct Success', color: '#16a34a', darkText: false, tooltip: 'Navigated straight to the target via the expected path' },
  { key: 'indirect' as const, label: 'Indirect Success', color: '#86efac', darkText: true, tooltip: 'Reached the goal but via a different route than expected' },
  { key: 'selfReported' as const, label: 'Self-Reported', color: '#a3e635', darkText: true, tooltip: 'Participant manually marked the task as complete' },
]

export const FAILURE_SEGMENTS = [
  { key: 'abandoned' as const, label: 'Abandoned', color: '#ef4444', bgClass: 'bg-red-500' },
  { key: 'timed_out' as const, label: 'Timed Out', color: '#f59e0b', bgClass: 'bg-amber-500' },
  { key: 'skipped' as const, label: 'Skipped', color: '#94a3b8', bgClass: 'bg-slate-400' },
]

export function getCompletionCount(key: string, metrics: LiveWebsiteTaskMetrics): number {
  if (key === 'direct') return metrics.directSuccessCount
  if (key === 'indirect') return metrics.indirectSuccessCount
  return metrics.selfReportedCount
}

function SegmentBar({ color, bgClass, percentage, darkText, label, sublabel }: {
  color?: string
  bgClass?: string
  percentage: number
  darkText?: boolean
  label: string
  sublabel: string
}) {
  if (percentage === 0) return null
  const minWidthThreshold = 12
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn('h-full cursor-pointer transition-opacity hover:opacity-90', bgClass)}
          style={{
            backgroundColor: color,
            width: `${percentage}%`,
            minWidth: percentage > 0 && percentage < 2 ? '4px' : undefined,
          }}
        >
          {percentage >= minWidthThreshold && (
            <span className={cn(
              'h-full flex items-center justify-center text-xs font-semibold',
              darkText ? 'text-gray-800' : 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]'
            )}>
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <div className="font-medium text-white">{label}</div>
        <div className="text-white/70 text-sm">{sublabel}</div>
      </TooltipContent>
    </Tooltip>
  )
}

function LegendItem({ color, label, count, percentage }: {
  color: string
  label: string
  count: number
  percentage: number
}) {
  return (
    <div className={cn('flex items-center gap-1.5', count === 0 && 'opacity-40')}>
      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground">{label}</span>
      {count > 0 && (
        <span className="font-medium text-foreground">
          {count}
          <span className="text-muted-foreground font-normal ml-0.5">({percentage.toFixed(0)}%)</span>
        </span>
      )}
    </div>
  )
}

function StatusTableRow({ color, label, tooltip, count, total, indented, isLast }: {
  color: string
  label: string
  tooltip: string
  count: number
  total: number
  indented?: boolean
  isLast?: boolean
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  const hasData = count > 0
  const isSub = indented

  return (
    <tr className={cn(
      'transition-colors hover:bg-muted/30',
      !isSub && 'border-t border-muted',
      !isLast && (isSub ? 'border-b border-muted/50' : 'border-b border-muted'),
    )}>
      <td className={cn('pr-4', isSub ? 'py-2 pl-5' : 'py-3')}>
        <div className="flex items-center gap-2">
          <div
            className={cn('shrink-0', isSub ? 'w-2.5 h-2.5 rounded-full' : 'w-3 h-3 rounded-sm')}
            style={{ backgroundColor: color }}
          />
          <span className={cn(
            isSub ? 'text-sm' : 'font-medium',
            !hasData && 'text-muted-foreground',
          )}>
            {label}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className={cn(
                'hover:text-foreground cursor-help',
                isSub ? 'h-3 w-3 text-muted-foreground/60' : 'h-3.5 w-3.5 text-muted-foreground',
              )} />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px]">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </td>
      <td className={cn('px-2 text-center', isSub ? 'py-2' : 'py-3')}>
        <span className={cn(
          isSub ? 'text-sm' : 'font-semibold',
          !hasData && 'text-muted-foreground/50',
        )}>
          {hasData ? count : '-'}
        </span>
      </td>
      <td className={cn('pl-2 text-right', isSub ? 'py-2' : 'py-3')}>
        <span className={cn(
          'tabular-nums',
          isSub ? 'text-sm' : 'font-semibold',
          !hasData && 'text-muted-foreground/50',
        )}>
          {hasData ? `${percentage}%` : '-'}
        </span>
      </td>
    </tr>
  )
}

export interface BarSegment {
  key: string
  label: string
  color: string
  darkText: boolean
  bgClass: string | undefined
  count: number
}

interface TaskStatusBreakdownProps {
  metrics: LiveWebsiteTaskMetrics
  trackingMode: string
  showTimedOut: boolean
  statusCounts: Record<string, number>
  total: number
  hasCompletionMethod: boolean
}

export function TaskStatusBreakdown({
  metrics,
  trackingMode: _trackingMode,
  showTimedOut,
  statusCounts,
  total,
  hasCompletionMethod,
}: TaskStatusBreakdownProps) {
  const filteredFailureSegments = showTimedOut ? FAILURE_SEGMENTS : FAILURE_SEGMENTS.filter(s => s.key !== 'timed_out')
  const filteredStatusSegments = showTimedOut ? STATUS_SEGMENTS : STATUS_SEGMENTS.filter(s => s.key !== 'timed_out')

  const barSegments = useMemo(() => {
    if (hasCompletionMethod) {
      const completion = COMPLETION_SEGMENTS.map(seg => ({
        key: seg.key,
        label: seg.label,
        color: seg.color,
        darkText: seg.darkText,
        bgClass: undefined as string | undefined,
        count: getCompletionCount(seg.key, metrics),
      }))
      const failure = filteredFailureSegments.map(seg => ({
        key: seg.key,
        label: seg.label,
        color: seg.color,
        darkText: false,
        bgClass: seg.bgClass,
        count: statusCounts[seg.key],
      }))
      return [...completion, ...failure]
    }
    return filteredStatusSegments.map(seg => ({
      key: seg.key,
      label: seg.label,
      color: seg.color,
      darkText: false,
      bgClass: seg.bgClass,
      count: statusCounts[seg.key],
    }))
  }, [hasCompletionMethod, filteredFailureSegments, filteredStatusSegments, statusCounts, metrics])

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">Task completion status</h3>

      <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
        {total === 0 ? (
          <div className="h-9 bg-muted rounded flex items-center justify-center border border-dashed">
            <span className="text-sm text-muted-foreground">No responses yet</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Segmented status bar */}
            <div className="h-9 bg-muted rounded overflow-hidden flex">
              {barSegments.map((seg) => {
                const percentage = total > 0 ? (seg.count / total) * 100 : 0
                return (
                  <SegmentBar
                    key={seg.key}
                    color={seg.bgClass ? undefined : seg.color}
                    bgClass={seg.bgClass}
                    percentage={percentage}
                    darkText={seg.darkText}
                    label={seg.label}
                    sublabel={`${seg.count} (${percentage.toFixed(1)}%)`}
                  />
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
              {barSegments.map((seg) => (
                <LegendItem
                  key={seg.key}
                  color={seg.color}
                  label={seg.label}
                  count={seg.count}
                  percentage={total > 0 ? (seg.count / total) * 100 : 0}
                />
              ))}
            </div>
          </div>
        )}

        {/* Status breakdown table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2.5 pr-4 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">Status</th>
              <th className="py-2.5 px-2 text-center font-medium text-xs uppercase tracking-wide text-muted-foreground">Count</th>
              <th className="py-2.5 pl-2 text-right font-medium text-xs uppercase tracking-wide text-muted-foreground">%</th>
            </tr>
          </thead>
          <tbody>
            {hasCompletionMethod ? (
              <>
                {/* Completed group header */}
                <tr className="border-b border-muted bg-muted/10">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm shrink-0 bg-green-500" />
                      <span className="font-medium">Completed</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px]">
                          <p className="text-xs">{STATUS_TOOLTIPS.completed}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="font-semibold">{metrics.completedCount}</span>
                  </td>
                  <td className="py-3 pl-2 text-right">
                    <span className="font-semibold tabular-nums">
                      {total > 0 ? `${Math.round((metrics.completedCount / total) * 100)}%` : '-'}
                    </span>
                  </td>
                </tr>
                {/* Sub-rows: Direct / Indirect / Self-Reported */}
                {COMPLETION_SEGMENTS.map((seg, idx) => (
                  <StatusTableRow
                    key={seg.key}
                    color={seg.color}
                    label={seg.label}
                    tooltip={seg.tooltip}
                    count={getCompletionCount(seg.key, metrics)}
                    total={total}
                    indented
                    isLast={idx === COMPLETION_SEGMENTS.length - 1}
                  />
                ))}
                {/* Non-completed rows */}
                {filteredFailureSegments.map((segment, idx) => (
                  <StatusTableRow
                    key={segment.key}
                    color={segment.color}
                    label={segment.label}
                    tooltip={STATUS_TOOLTIPS[segment.key]}
                    count={statusCounts[segment.key]}
                    total={total}
                    isLast={idx === filteredFailureSegments.length - 1}
                  />
                ))}
              </>
            ) : (
              filteredStatusSegments.map((segment, idx) => (
                <StatusTableRow
                  key={segment.key}
                  color={segment.color}
                  label={segment.label}
                  tooltip={STATUS_TOOLTIPS[segment.key]}
                  count={statusCounts[segment.key]}
                  total={total}
                  isLast={idx === filteredStatusSegments.length - 1}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
