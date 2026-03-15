'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Download, AlertTriangle, Filter, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ClickStats } from './click-stats'

interface LiveWebsiteClickStatsSidebarProps {
  pageUrl: string | null
  stats: ClickStats
  activeFilters?: string[]
  isLoading?: boolean
  onDownloadPNG?: () => void
}

export const LiveWebsiteClickStatsSidebar = memo(function LiveWebsiteClickStatsSidebar({
  pageUrl,
  stats,
  activeFilters = [],
  isLoading,
  onDownloadPNG,
}: LiveWebsiteClickStatsSidebarProps) {
  if (isLoading) {
    return (
      <div className="w-72 min-w-56 shrink-0">
        <div className="space-y-4 animate-pulse">
          <div className="h-6 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-3 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!pageUrl) {
    return (
      <div className="w-72 min-w-56 shrink-0">
        <div className="border rounded-lg p-6 bg-muted/20 flex flex-col items-center justify-center min-h-[280px] text-center">
          <p className="text-sm text-muted-foreground">
            Select a page to view click statistics
          </p>
        </div>
      </div>
    )
  }

  const { totalClicks, uniqueParticipants, hits, misses, hitRate, hasHitMissData } = stats
  const missRate = 100 - hitRate
  const isLowSample = totalClicks < 10
  const hasActiveFilters = activeFilters.length > 0

  return (
    <TooltipProvider>
      <div className="w-72 min-w-56 shrink-0 space-y-3">
        {/* Main Stats Container */}
        <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
          {/* Active Filters Indicator */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2 border-b">
              <Filter className="h-3 w-3 shrink-0" />
              <span className="truncate">{activeFilters.join(' · ')}</span>
            </div>
          )}

          {/* Hit Rate - Primary Metric */}
          {hasHitMissData ? (
            <div className="text-center py-2">
              <div className="text-3xl font-bold tabular-nums">{hitRate}%</div>
              <div className="text-sm text-muted-foreground">Interactive Click Rate</div>
              <div className="text-xs text-muted-foreground mt-1">
                {uniqueParticipants} participant{uniqueParticipants !== 1 ? 's' : ''}
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <Info className="h-4 w-4" />
                <span className="text-sm font-medium">Hit/miss data unavailable</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Older events don&apos;t include interactive element detection.
                New sessions will capture this data.
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {hasHitMissData && (
            <div className="space-y-2">
              <div className="h-2.5 bg-muted rounded-full overflow-hidden flex">
                {totalClicks > 0 && (
                  <>
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${hitRate}%` }}
                    />
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${missRate}%` }}
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Hits/Misses Breakdown */}
          {hasHitMissData && (
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 px-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium">Hits</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold tabular-nums">{hits}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">
                    ({hitRate}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 px-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium">Misses</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold tabular-nums">{misses}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">
                    ({missRate}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Total Clicks */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">Total clicks</span>
            <span className="text-sm font-medium tabular-nums">{totalClicks}</span>
          </div>

          {/* Unique participants */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Unique participants</span>
            <span className="text-sm font-medium tabular-nums">{uniqueParticipants}</span>
          </div>

          {/* Low Sample Warning */}
          {isLowSample && totalClicks > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-xs text-amber-600 pt-2 border-t cursor-help">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Low sample size</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="text-xs">
                  Results based on fewer than 10 clicks may not be statistically significant.
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Download Button */}
        {onDownloadPNG && (
          <Button
            variant="outline"
            className="w-full"
            onClick={onDownloadPNG}
          >
            <Download className="h-4 w-4 mr-2" />
            Download clickmap
          </Button>
        )}
      </div>
    </TooltipProvider>
  )
})
