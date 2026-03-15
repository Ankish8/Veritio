'use client'

import { cn } from '@/lib/utils'

interface StudySummaryCardProps {
  title?: string
  studyType?: string
  status?: string
  participants?: number
  completedParticipants?: number
  completionRate?: number
  createdAt?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
}

function formatStudyType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
    return `${Math.floor(diffDays / 365)}y ago`
  } catch {
    return dateStr
  }
}

function getStatusStyle(status: string): string {
  const s = status.toLowerCase()
  if (s === 'active' || s === 'live') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  if (s === 'completed' || s === 'closed') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  if (s === 'paused') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-muted text-muted-foreground'
}

function SkeletonStudy() {
  return (
    <div className="space-y-2.5">
      <div className="animate-pulse bg-muted rounded h-4 w-3/4" />
      <div className="flex gap-2">
        <div className="animate-pulse bg-muted rounded-full h-4 w-16" />
        <div className="animate-pulse bg-muted rounded-full h-4 w-14" />
      </div>
      <div className="animate-pulse bg-muted rounded h-2 w-full" />
    </div>
  )
}

export function StudySummaryCard({
  title,
  studyType,
  status,
  participants,
  completedParticipants,
  completionRate,
  createdAt,
  propStatus,
}: StudySummaryCardProps) {
  const isStreaming = propStatus?.title === 'streaming'
  const hasData = title || studyType || status || participants !== undefined

  const effectiveRate =
    completionRate ??
    (participants && completedParticipants !== undefined
      ? Math.round((completedParticipants / participants) * 100)
      : undefined)

  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
      {!hasData && isStreaming && <SkeletonStudy />}

      {!hasData && !isStreaming && (
        <p className="text-xs text-muted-foreground">No data</p>
      )}

      {hasData && (
        <>
          <div className={cn(isStreaming && 'animate-pulse')}>
            {title && <p className="text-sm font-semibold text-foreground truncate">{title}</p>}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {studyType && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {formatStudyType(studyType)}
                </span>
              )}
              {status && (
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', getStatusStyle(status))}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              )}
              {createdAt && (
                <span className="text-[10px] text-muted-foreground">{formatRelativeDate(createdAt)}</span>
              )}
            </div>
          </div>

          {participants !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {completedParticipants !== undefined
                    ? `${completedParticipants} / ${participants} participants`
                    : `${participants} participant${participants === 1 ? '' : 's'}`}
                </span>
                {effectiveRate !== undefined && (
                  <span className="text-xs font-medium text-foreground">{effectiveRate}%</span>
                )}
              </div>
              {effectiveRate !== undefined && (
                <div className="h-1.5 rounded-full bg-primary/20">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, effectiveRate))}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
