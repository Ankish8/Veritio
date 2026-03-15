'use client'

import { cn } from '@/lib/utils'

interface TreeTestResultsSummaryProps {
  totalParticipants?: number
  overallSuccessRate?: number
  overallDirectRate?: number
  tasks?: Array<{ label: string; successRate: number; directRate?: number }>
  propStatus?: Record<string, 'streaming' | 'complete'>
}

function getRateColor(rate: number): string {
  if (rate >= 70) return 'bg-emerald-500'
  if (rate >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

function getRateTextColor(rate: number): string {
  if (rate >= 70) return 'text-emerald-600 dark:text-emerald-400'
  if (rate >= 40) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function SkeletonRow() {
  return (
    <div className="space-y-1 py-1.5">
      <div className="animate-pulse bg-muted rounded h-3 w-3/4" />
      <div className="animate-pulse bg-muted rounded-full h-1.5 w-full" />
    </div>
  )
}

export function TreeTestResultsSummary({
  totalParticipants,
  overallSuccessRate,
  overallDirectRate,
  tasks,
  propStatus,
}: TreeTestResultsSummaryProps) {
  const isStreaming = propStatus?.tasks === 'streaming'
  const hasData =
    totalParticipants !== undefined || overallSuccessRate !== undefined || (tasks && tasks.length > 0)

  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
      {!hasData && isStreaming && (
        <div className="space-y-2">
          <div className="flex gap-4">
            <div className="animate-pulse bg-muted rounded h-8 w-20" />
            <div className="animate-pulse bg-muted rounded h-8 w-20" />
          </div>
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {!hasData && !isStreaming && (
        <p className="text-xs text-muted-foreground">No data</p>
      )}

      {hasData && (
        <>
          <div className={cn('flex items-center gap-4 flex-wrap', isStreaming && 'animate-pulse')}>
            {totalParticipants !== undefined && (
              <div>
                <span className="text-sm font-semibold text-foreground">{totalParticipants}</span>
                <span className="text-xs text-muted-foreground ml-1">participants</span>
              </div>
            )}
            {overallSuccessRate !== undefined && (
              <div>
                <span className={cn('text-sm font-semibold', getRateTextColor(overallSuccessRate))}>
                  {overallSuccessRate}%
                </span>
                <span className="text-xs text-muted-foreground ml-1">success</span>
              </div>
            )}
            {overallDirectRate !== undefined && (
              <div>
                <span className="text-sm font-semibold text-foreground">{overallDirectRate}%</span>
                <span className="text-xs text-muted-foreground ml-1">direct</span>
              </div>
            )}
          </div>

          {tasks && tasks.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tasks</p>
              <div className="space-y-2">
                {tasks.map((task, i) => (
                  <div
                    key={i}
                    className={cn('space-y-0.5', i === tasks.length - 1 && isStreaming && 'animate-pulse')}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground truncate max-w-[55%]">{task.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs font-medium', getRateTextColor(task.successRate))}>
                          {task.successRate}%
                        </span>
                        {task.directRate !== undefined && (
                          <span className="text-[10px] text-muted-foreground">{task.directRate}% direct</span>
                        )}
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-primary/20">
                      <div
                        className={cn('h-full rounded-full transition-all', getRateColor(task.successRate))}
                        style={{ width: `${Math.min(100, Math.max(0, task.successRate))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
