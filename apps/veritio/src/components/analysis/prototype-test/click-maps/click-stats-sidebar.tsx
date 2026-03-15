'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Download, AlertTriangle, Filter } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatTime } from '@/components/analysis/shared/format-time'

interface ClickStatsSidebarProps {
  frameName: string | null
  totalVisitors: number
  totalClicks: number
  hits: number
  misses: number
  hitRate: number
  avgTimeMs?: number | null
  medianTimeMs?: number | null
  /** Active filter labels to display (e.g., ["Hits only", "First click only"]) */
  activeFilters?: string[]
  isLoading?: boolean
  onDownloadPNG?: () => void
}

export const ClickStatsSidebar = memo(function ClickStatsSidebar({
  frameName,
  totalVisitors,
  totalClicks,
  hits,
  misses,
  hitRate,
  avgTimeMs,
  medianTimeMs,
  activeFilters = [],
  isLoading,
  onDownloadPNG,
}: ClickStatsSidebarProps) {
  if (isLoading) {
    return (
      <div className="w-full lg:w-72 lg:min-w-56 shrink-0">
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

  if (!frameName) {
    return (
      <div className="w-full lg:w-72 lg:min-w-56 shrink-0">
        <div className="border rounded-lg p-6 bg-muted/20 flex flex-col items-center justify-center min-h-[280px] text-center">
          <p className="text-sm text-muted-foreground">
            Select a frame to view click statistics
          </p>
        </div>
      </div>
    )
  }

  const missRate = 100 - hitRate
  const isLowSample = totalClicks < 10
  const hasActiveFilters = activeFilters.length > 0

  return (
    <TooltipProvider>
      <div className="w-full lg:w-72 lg:min-w-56 shrink-0 space-y-3">
        {/* Main Stats Container */}
        <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
          {/* Active Filters Indicator */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2 border-b">
              <Filter className="h-3 w-3 shrink-0" />
              <span className="truncate">{activeFilters.join(' · ')}</span>
            </div>
          )}

          {/* Success Rate - Primary Metric */}
          <div className="text-center py-2">
            <div className="text-3xl font-bold tabular-nums">{hitRate}%</div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
            <div className="text-xs text-muted-foreground mt-1">
              {totalVisitors} participant{totalVisitors !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Progress Bar */}
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

          {/* Hits/Misses Breakdown - Compact rows */}
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

          {/* Total Clicks */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">Total clicks</span>
            <span className="text-sm font-medium tabular-nums">{totalClicks}</span>
          </div>

          {/* Time Metrics (if available) */}
          {(avgTimeMs != null || medianTimeMs != null) && (
            <div className="space-y-1.5 pt-2 border-t">
              {avgTimeMs != null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg. time</span>
                  <span className="text-sm font-medium tabular-nums">
                    {formatTime(avgTimeMs)}
                  </span>
                </div>
              )}
              {medianTimeMs != null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Median time</span>
                  <span className="text-sm font-medium tabular-nums">
                    {formatTime(medianTimeMs)}
                  </span>
                </div>
              )}
            </div>
          )}

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
