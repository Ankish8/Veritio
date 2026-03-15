'use client'

import { useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import { cn } from '@veritio/ui'
import { STATUS_COLORS } from '@veritio/core/colors'
import type { PrototypeStatusBreakdown } from '@veritio/prototype-test/algorithms/prototype-test-analysis'

interface SegmentedStatusBarProps {
  statusBreakdown: PrototypeStatusBreakdown
  responseCount: number
  className?: string
}
const SEGMENTS = [
  { key: 'directSuccess', label: 'Direct Success', color: STATUS_COLORS.successDark, bgClass: 'bg-green-600', darkText: false },
  { key: 'indirectSuccess', label: 'Indirect Success', color: STATUS_COLORS.successLight, bgClass: 'bg-green-400', darkText: true },
  { key: 'failure', label: 'Failure', color: STATUS_COLORS.failure, bgClass: 'bg-red-500', darkText: false },
  { key: 'skipped', label: 'Skipped', color: STATUS_COLORS.skipped, bgClass: 'bg-slate-400', darkText: false },
] as const

type SegmentKey = (typeof SEGMENTS)[number]['key']
export function SegmentedStatusBar({
  statusBreakdown,
  responseCount,
  className,
}: SegmentedStatusBarProps) {
  const segmentData = useMemo(() => {
    if (responseCount === 0) {
      return SEGMENTS.map((seg) => ({ ...seg, count: 0, percentage: 0 }))
    }

    const data: Record<SegmentKey, number> = {
      directSuccess: statusBreakdown.success.direct,
      indirectSuccess: statusBreakdown.success.indirect,
      failure: statusBreakdown.failure.total,
      skipped: statusBreakdown.skipped.total,
    }

    return SEGMENTS.map((seg) => {
      const count = data[seg.key]
      const percentage = (count / responseCount) * 100
      return { ...seg, count, percentage }
    })
  }, [statusBreakdown, responseCount])

  const visibleSegments = segmentData.filter((seg) => seg.percentage > 0)

  if (responseCount === 0) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="h-8 bg-muted rounded flex items-center justify-center border border-dashed">
          <span className="text-sm text-muted-foreground">No responses yet</span>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn('space-y-3', className)}>
        {/* Segmented bar */}
        <div className="h-9 bg-muted rounded overflow-hidden flex">
          {visibleSegments.map((segment) => (
            <Tooltip key={segment.key}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'h-full cursor-pointer transition-opacity hover:opacity-90',
                    segment.bgClass
                  )}
                  style={{
                    width: `${segment.percentage}%`,
                    minWidth: segment.percentage > 0 && segment.percentage < 2 ? '4px' : undefined,
                  }}
                >
                  {/* Show percentage label if segment is wide enough */}
                  {segment.percentage >= 15 && (
                    <span className={cn(
                      'h-full flex items-center justify-center text-xs font-semibold',
                      segment.darkText ? 'text-gray-800' : 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]'
                    )}>
                      {segment.percentage.toFixed(0)}%
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="font-medium text-white">{segment.label}</div>
                <div className="text-white/70 text-sm">
                  {segment.count} ({segment.percentage.toFixed(1)}%)
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          {segmentData.map((segment) => (
            <div
              key={segment.key}
              className={cn(
                'flex items-center gap-1.5',
                segment.count === 0 && 'opacity-40'
              )}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-muted-foreground">{segment.label}</span>
              {segment.count > 0 && (
                <span className="font-medium text-foreground">
                  {segment.count}
                  <span className="text-muted-foreground font-normal ml-0.5">
                    ({segment.percentage.toFixed(0)}%)
                  </span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}
