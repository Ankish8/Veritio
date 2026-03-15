'use client'

import { cn } from '@/lib/utils'

interface CardSortResultsSummaryProps {
  totalParticipants?: number
  totalCards?: number
  totalCategories?: number
  categories?: Array<{ name: string; cardCount: number; agreement?: number }>
  propStatus?: Record<string, 'streaming' | 'complete'>
}

const MAX_VISIBLE = 5

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="animate-pulse bg-muted rounded h-3 w-24" />
      <div className="animate-pulse bg-muted rounded-full h-1.5 flex-1" />
      <div className="animate-pulse bg-muted rounded h-3 w-8" />
    </div>
  )
}

export function CardSortResultsSummary({
  totalParticipants,
  totalCards,
  totalCategories,
  categories,
  propStatus,
}: CardSortResultsSummaryProps) {
  const isStreaming = propStatus?.categories === 'streaming'
  const hasData =
    totalParticipants !== undefined || totalCards !== undefined || totalCategories !== undefined || (categories && categories.length > 0)

  const visibleCategories = categories?.slice(0, MAX_VISIBLE)
  const remaining = categories && categories.length > MAX_VISIBLE ? categories.length - MAX_VISIBLE : 0

  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
      {!hasData && isStreaming && (
        <div className="space-y-2">
          <div className="flex gap-3">
            <div className="animate-pulse bg-muted rounded h-3 w-20" />
            <div className="animate-pulse bg-muted rounded h-3 w-16" />
            <div className="animate-pulse bg-muted rounded h-3 w-20" />
          </div>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {!hasData && !isStreaming && (
        <p className="text-xs text-muted-foreground">No data</p>
      )}

      {hasData && (
        <>
          <div className={cn('flex items-center gap-3 flex-wrap', isStreaming && 'animate-pulse')}>
            {totalParticipants !== undefined && (
              <div>
                <span className="text-sm font-semibold text-foreground">{totalParticipants}</span>
                <span className="text-xs text-muted-foreground ml-1">participants</span>
              </div>
            )}
            {totalCards !== undefined && (
              <div>
                <span className="text-sm font-semibold text-foreground">{totalCards}</span>
                <span className="text-xs text-muted-foreground ml-1">cards</span>
              </div>
            )}
            {totalCategories !== undefined && (
              <div>
                <span className="text-sm font-semibold text-foreground">{totalCategories}</span>
                <span className="text-xs text-muted-foreground ml-1">categories</span>
              </div>
            )}
          </div>

          {visibleCategories && visibleCategories.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Categories</p>
              <div className="space-y-1.5">
                {visibleCategories.map((cat, i) => (
                  <div key={i} className={cn('space-y-0.5', i === visibleCategories.length - 1 && isStreaming && 'animate-pulse')}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground truncate max-w-[60%]">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{cat.cardCount} cards</span>
                        {cat.agreement !== undefined && (
                          <span className="text-xs font-medium text-foreground">{cat.agreement}%</span>
                        )}
                      </div>
                    </div>
                    {cat.agreement !== undefined && (
                      <div className="h-1 rounded-full bg-primary/20">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, cat.agreement))}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {remaining > 0 && (
                <p className="text-[10px] text-muted-foreground pt-0.5">+{remaining} more</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
