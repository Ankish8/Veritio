'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FirstImpressionResultsSummaryProps {
  totalParticipants?: number
  designs?: Array<{ title: string; avgRating?: number; topThemes?: string[] }>
  overallSentiment?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
}

function getSentimentStyle(sentiment: string): string {
  const s = sentiment.toLowerCase()
  if (s === 'positive' || s === 'very positive') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  if (s === 'negative' || s === 'very negative') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (s === 'mixed' || s === 'neutral') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-muted text-muted-foreground'
}

function RatingStars({ rating, max = 5 }: { rating: number; max?: number }) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.25 && rating - fullStars < 0.75
  const displayRating = Math.round(rating * 10) / 10

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={cn(
            'h-2.5 w-2.5',
            i < fullStars
              ? 'fill-amber-400 text-amber-400'
              : i === fullStars && hasHalf
                ? 'fill-amber-400/50 text-amber-400'
                : 'text-muted-foreground/30'
          )}
        />
      ))}
      <span className="text-[10px] font-medium text-foreground ml-0.5">{displayRating}</span>
    </div>
  )
}

function SkeletonDesign() {
  return (
    <div className="space-y-1 py-1.5">
      <div className="animate-pulse bg-muted rounded h-3 w-1/2" />
      <div className="flex gap-1">
        <div className="animate-pulse bg-muted rounded h-2.5 w-2.5" />
        <div className="animate-pulse bg-muted rounded h-2.5 w-2.5" />
        <div className="animate-pulse bg-muted rounded h-2.5 w-2.5" />
        <div className="animate-pulse bg-muted rounded h-2.5 w-2.5" />
        <div className="animate-pulse bg-muted rounded h-2.5 w-2.5" />
      </div>
      <div className="flex gap-1">
        <div className="animate-pulse bg-muted rounded-full h-4 w-12" />
        <div className="animate-pulse bg-muted rounded-full h-4 w-10" />
      </div>
    </div>
  )
}

export function FirstImpressionResultsSummary({
  totalParticipants,
  designs,
  overallSentiment,
  propStatus,
}: FirstImpressionResultsSummaryProps) {
  const isStreaming = propStatus?.designs === 'streaming'
  const hasData = totalParticipants !== undefined || (designs && designs.length > 0) || overallSentiment

  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
      {!hasData && isStreaming && (
        <div className="space-y-2">
          <div className="flex gap-3">
            <div className="animate-pulse bg-muted rounded h-3 w-20" />
            <div className="animate-pulse bg-muted rounded-full h-4 w-16" />
          </div>
          <SkeletonDesign />
          <SkeletonDesign />
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
            {overallSentiment && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', getSentimentStyle(overallSentiment))}>
                {overallSentiment}
              </span>
            )}
          </div>

          {designs && designs.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Designs</p>
              <div className="divide-y divide-border">
                {designs.map((design, i) => (
                  <div
                    key={i}
                    className={cn(
                      'py-1.5 first:pt-0 last:pb-0 space-y-1',
                      i === designs.length - 1 && isStreaming && 'animate-pulse'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground truncate max-w-[60%]">{design.title}</span>
                      {design.avgRating !== undefined && <RatingStars rating={design.avgRating} />}
                    </div>
                    {design.topThemes && design.topThemes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {design.topThemes.map((theme, j) => (
                          <span
                            key={j}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                          >
                            {theme}
                          </span>
                        ))}
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
