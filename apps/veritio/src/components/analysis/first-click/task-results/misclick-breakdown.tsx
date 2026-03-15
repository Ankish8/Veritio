'use client'

import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface MisclickBreakdownProps {
  categories: { nearMiss: number; wrongElement: number; lost: number; total: number }
  className?: string
}

const SEGMENTS = [
  {
    key: 'nearMiss' as const,
    label: 'Near-miss',
    color: 'bg-amber-400',
    dotColor: 'bg-amber-400',
    tooltip: 'Clicked close to the correct area but just outside its boundary',
  },
  {
    key: 'wrongElement' as const,
    label: 'Wrong element',
    color: 'bg-orange-500',
    dotColor: 'bg-orange-500',
    tooltip: 'Clicked on a different interactive element',
  },
  {
    key: 'lost' as const,
    label: 'Lost',
    color: 'bg-red-500',
    dotColor: 'bg-red-500',
    tooltip: 'Clicked on an area with no interactive elements',
  },
] as const

export function MisclickBreakdown({ categories, className }: MisclickBreakdownProps) {
  if (categories.total === 0) return null

  const segments = SEGMENTS.map(seg => ({
    ...seg,
    count: categories[seg.key],
    percent: (categories[seg.key] / categories.total) * 100,
  })).filter(seg => seg.count > 0)

  return (
    <TooltipProvider>
      <div className={cn('space-y-3', className)}>
        <h4 className="text-sm font-medium">Misclick Analysis</h4>

        <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
          {/* Segmented bar */}
          <div className="flex h-3 w-full rounded-full overflow-hidden">
            {segments.map(seg => (
              <Tooltip key={seg.key}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(seg.color, 'transition-all cursor-help')}
                    style={{ width: `${seg.percent}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="text-xs font-medium">{seg.label}</div>
                  <div className="text-xs text-white/70">{seg.tooltip}</div>
                  <div className="text-xs mt-1">
                    {seg.count} ({Math.round(seg.percent)}%)
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {segments.map(seg => (
              <Tooltip key={seg.key}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 cursor-help">
                    <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', seg.dotColor)} />
                    <span className="font-medium">{seg.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {seg.count} ({Math.round(seg.percent)}%)
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="text-xs">{seg.tooltip}</div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Total */}
          <p className="text-xs text-muted-foreground">
            {categories.total} total misclick{categories.total !== 1 ? 's' : ''} analyzed
          </p>
        </div>
      </div>
    </TooltipProvider>
  )
}
