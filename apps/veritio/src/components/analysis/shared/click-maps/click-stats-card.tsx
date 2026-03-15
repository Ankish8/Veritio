'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Users, Clock, MousePointer2 } from 'lucide-react'
import type { FirstClickStats } from '@/types/analytics'
import { cn } from '@/lib/utils'

interface ClickStatsCardProps {
  title: string
  stats: FirstClickStats | null
  isLoading?: boolean
  onDownloadPNG?: () => void
  className?: string
}

/**
 * Enhanced stats card for click maps visualization.
 * Displays: total clicks, success rate, unique participants, avg/median time, hits/misses breakdown.
 */
export const ClickStatsCard = memo(function ClickStatsCard({
  title,
  stats,
  isLoading,
  onDownloadPNG,
  className,
}: ClickStatsCardProps) {
  if (isLoading) {
    return (
      <Card className={cn('w-full lg:w-80 shrink-0', className)}>
        <CardContent className="p-6">
          <div className="space-y-4 animate-pulse">
            <div className="h-6 bg-stone-200 rounded w-3/4" />
            <div className="h-20 bg-stone-200 rounded" />
            <div className="h-16 bg-stone-200 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card className={cn('w-full lg:w-80 shrink-0', className)}>
        <CardContent className="p-6 text-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }

  const formatTime = (ms: number | null) => {
    if (ms === null || ms === 0) return 'N/A'
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <Card className={cn('w-full lg:w-80 shrink-0', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold truncate" title={title}>
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {stats.uniqueParticipants} participant{stats.uniqueParticipants !== 1 ? 's' : ''}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Total Clicks */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MousePointer2 className="h-3.5 w-3.5" />
            Total clicks
          </span>
          <span className="text-2xl font-bold">{stats.totalClicks}</span>
        </div>

        {/* Success Rate */}
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-green-50 border-green-200">
          <div className="flex-1">
            <div className="font-medium text-sm">Success Rate</div>
            <div className="text-xs text-muted-foreground">
              {stats.hits} of {stats.totalClicks} clicks correct
            </div>
          </div>
          <span className="text-xl font-bold shrink-0 text-green-700">
            {stats.successRate.toFixed(1)}%
          </span>
        </div>

        {/* Time Metrics */}
        {(stats.avgTimeMs !== null || stats.medianTimeMs !== null) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Avg. time
              </span>
              <span className="text-sm font-medium">{formatTime(stats.avgTimeMs)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Median time
              </span>
              <span className="text-sm font-medium">{formatTime(stats.medianTimeMs)}</span>
            </div>
          </div>
        )}

        {/* Hits/Misses Breakdown */}
        <div className="space-y-2 pt-2 border-t">
          <div className="h-3 bg-stone-200 rounded-full overflow-hidden flex">
            {stats.totalClicks > 0 && (
              <>
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${stats.successRate}%` }}
                />
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${100 - stats.successRate}%` }}
                />
              </>
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Correct: {stats.hits}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Incorrect: {stats.misses}
            </span>
          </div>
        </div>

        {/* Skipped count if any */}
        {stats.skipped > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>Skipped tasks</span>
            <span>{stats.skipped}</span>
          </div>
        )}

        {/* Download Button */}
        {onDownloadPNG && (
          <Button variant="outline" className="w-full mt-4" onClick={onDownloadPNG}>
            <Download className="h-4 w-4 mr-2" />
            Download clickmap
          </Button>
        )}
      </CardContent>
    </Card>
  )
})
