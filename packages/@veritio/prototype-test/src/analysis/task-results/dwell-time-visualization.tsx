'use client'
import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@veritio/ui/components/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import { Button } from '@veritio/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { Clock, AlertTriangle, ChevronDown, ChevronUp, HelpCircle, Eye } from 'lucide-react'
import { cn } from '@veritio/ui'
import type { FrameDwellStats, DwellTimeAnalysis } from '@veritio/prototype-test/algorithms/advanced-metrics'
import { formatDwellTime } from '@veritio/prototype-test/algorithms/advanced-metrics'
// Types

interface DwellTimeVisualizationProps {
  dwellTimeAnalysis: DwellTimeAnalysis | null
  initialMaxItems?: number
  className?: string
}

type SortOption = 'dwell-time' | 'visits' | 'median'
// Component
export function DwellTimeVisualization({
  dwellTimeAnalysis,
  initialMaxItems = 5,
  className,
}: DwellTimeVisualizationProps) {
  const [sortBy, setSortBy] = useState<SortOption>('dwell-time')
  const [isExpanded, setIsExpanded] = useState(false)

  // Sort and filter frame stats
  const sortedFrameStats = useMemo(() => {
    if (!dwellTimeAnalysis?.frameStats) return []

    const stats = [...dwellTimeAnalysis.frameStats]

    switch (sortBy) {
      case 'dwell-time':
        stats.sort((a, b) => b.avgDwellTimeMs - a.avgDwellTimeMs)
        break
      case 'visits':
        stats.sort((a, b) => b.visitCount - a.visitCount)
        break
      case 'median':
        stats.sort((a, b) => b.medianDwellTimeMs - a.medianDwellTimeMs)
        break
    }

    return stats
  }, [dwellTimeAnalysis?.frameStats, sortBy])

  // Calculate max value for bar scaling
  const maxValue = useMemo(() => {
    if (sortedFrameStats.length === 0) return 0

    switch (sortBy) {
      case 'dwell-time':
        return Math.max(...sortedFrameStats.map(s => s.avgDwellTimeMs))
      case 'visits':
        return Math.max(...sortedFrameStats.map(s => s.visitCount))
      case 'median':
        return Math.max(...sortedFrameStats.map(s => s.medianDwellTimeMs))
    }
  }, [sortedFrameStats, sortBy])

  // Items to display
  const displayedStats = useMemo(() => {
    if (isExpanded) return sortedFrameStats
    return sortedFrameStats.slice(0, initialMaxItems)
  }, [sortedFrameStats, isExpanded, initialMaxItems])

  const hasMore = sortedFrameStats.length > initialMaxItems

  // Don't render if no data
  if (!dwellTimeAnalysis || dwellTimeAnalysis.frameStats.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <Card className={cn('border-0 shadow-none', className)}>
        <CardHeader className="pb-3 px-0 pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Time on Screen</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Shows average time spent on each frame/screen.
                    Amber-highlighted frames indicate potential confusion points
                    where dwell time exceeded 2x the average.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Sort selector */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dwell-time">Avg. Dwell Time</SelectItem>
                <SelectItem value="visits">Visit Count</SelectItem>
                <SelectItem value="median">Median Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary stats */}
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>
              Total time: <strong>{formatDwellTime(dwellTimeAnalysis.totalDwellTimeMs)}</strong>
            </span>
            <span>
              Avg per visit: <strong>{formatDwellTime(dwellTimeAnalysis.avgTimePerVisitMs)}</strong>
            </span>
            <span>
              Frames: <strong>{dwellTimeAnalysis.frameStats.length}</strong>
            </span>
          </div>
        </CardHeader>

        <CardContent className="px-0 space-y-2">
          {/* Frame bars */}
          {displayedStats.map((stats, index) => (
            <DwellTimeBar
              key={stats.frameId}
              stats={stats}
              sortBy={sortBy}
              maxValue={maxValue}
              rank={index + 1}
            />
          ))}

          {/* Expand/Collapse button */}
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs text-muted-foreground"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show {sortedFrameStats.length - initialMaxItems} more frames
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
// Sub-components
function DwellTimeBar({
  stats,
  sortBy,
  maxValue,
  rank,
}: {
  stats: FrameDwellStats
  sortBy: SortOption
  maxValue: number
  rank: number
}) {
  // Get value for bar based on sort option
  const value = useMemo(() => {
    switch (sortBy) {
      case 'dwell-time':
        return stats.avgDwellTimeMs
      case 'visits':
        return stats.visitCount
      case 'median':
        return stats.medianDwellTimeMs
    }
  }, [stats, sortBy])

  // Calculate bar width percentage
  const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0

  // Format display value
  const displayValue = useMemo(() => {
    switch (sortBy) {
      case 'dwell-time':
        return formatDwellTime(stats.avgDwellTimeMs)
      case 'visits':
        return `${stats.visitCount} visits`
      case 'median':
        return formatDwellTime(stats.medianDwellTimeMs)
    }
  }, [stats, sortBy])

  const isConfusionPoint = stats.isConfusionPoint

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-lg border transition-colors hover:bg-muted/50',
            isConfusionPoint
              ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800'
              : 'bg-card border-border'
          )}
        >
          {/* Rank badge */}
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
            {rank}
          </div>

          {/* Thumbnail */}
          <div className="flex-shrink-0 w-12 h-9 rounded border bg-muted overflow-hidden">
            {stats.thumbnailUrl ? (
              <Image
                src={stats.thumbnailUrl}
                alt={stats.frameName || 'Frame thumbnail'}
                width={48}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Eye className="h-4 w-4 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Frame name and bar */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium truncate">
                {stats.frameName || `Frame ${stats.frameId.slice(0, 8)}`}
              </p>
              <div className="flex items-center gap-1.5">
                {isConfusionPoint && (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                )}
                <span className="text-sm font-bold tabular-nums">
                  {displayValue}
                </span>
              </div>
            </div>

            {/* Bar */}
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  isConfusionPoint ? 'bg-amber-500' : 'bg-primary'
                )}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <div className="space-y-1.5 text-xs">
          <p className="font-medium">{stats.frameName || `Frame ${stats.frameId.slice(0, 8)}`}</p>
          <div className="space-y-0.5 text-muted-foreground">
            <p><Clock className="h-3 w-3 inline mr-1" />Avg: {formatDwellTime(stats.avgDwellTimeMs)}</p>
            <p><Clock className="h-3 w-3 inline mr-1" />Median: {formatDwellTime(stats.medianDwellTimeMs)}</p>
            <p><Clock className="h-3 w-3 inline mr-1" />P90: {formatDwellTime(stats.p90DwellTimeMs)}</p>
            <p><Eye className="h-3 w-3 inline mr-1" />{stats.visitCount} visits</p>
          </div>
          {isConfusionPoint && (
            <p className="text-amber-600 dark:text-amber-400 font-medium pt-1 border-t">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              Potential confusion point
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
