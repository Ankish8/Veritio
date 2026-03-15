'use client'

import { Clock, MousePointerClick } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FirstClickResultsSummaryProps {
  totalParticipants?: number
  tasks?: Array<{ label: string; accuracy?: number; avgTime?: number }>
  propStatus?: Record<string, 'streaming' | 'complete'>
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
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

export function FirstClickResultsSummary({
  totalParticipants,
  tasks,
  propStatus,
}: FirstClickResultsSummaryProps) {
  const isStreaming = propStatus?.tasks === 'streaming'
  const hasData = totalParticipants !== undefined || (tasks && tasks.length > 0)

  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
      {!hasData && isStreaming && (
        <div className="space-y-2">
          <div className="animate-pulse bg-muted rounded h-3 w-24" />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {!hasData && !isStreaming && (
        <p className="text-xs text-muted-foreground">No data</p>
      )}

      {hasData && (
        <>
          <div className={cn('flex items-center gap-3', isStreaming && 'animate-pulse')}>
            {totalParticipants !== undefined && (
              <div>
                <span className="text-sm font-semibold text-foreground">{totalParticipants}</span>
                <span className="text-xs text-muted-foreground ml-1">participants</span>
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
                      <span className="text-xs text-foreground truncate max-w-[50%]">{task.label}</span>
                      <div className="flex items-center gap-2">
                        {task.accuracy !== undefined && (
                          <div className="flex items-center gap-0.5">
                            <MousePointerClick className="h-2.5 w-2.5 text-muted-foreground" />
                            <span className={cn('text-xs font-medium', getRateTextColor(task.accuracy))}>
                              {task.accuracy}%
                            </span>
                          </div>
                        )}
                        {task.avgTime !== undefined && (
                          <div className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">{formatTime(task.avgTime)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {task.accuracy !== undefined && (
                      <div className="h-1 rounded-full bg-primary/20">
                        <div
                          className={cn('h-full rounded-full transition-all', getRateColor(task.accuracy))}
                          style={{ width: `${Math.min(100, Math.max(0, task.accuracy))}%` }}
                        />
                      </div>
                    )}
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
