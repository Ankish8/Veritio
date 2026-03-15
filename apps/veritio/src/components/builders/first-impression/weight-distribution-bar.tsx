'use client'

import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { FirstImpressionDesign } from '@veritio/study-types/study-flow-types'

interface WeightDistributionBarProps {
  designs: FirstImpressionDesign[]
  className?: string
}

// Color palette for design segments
const SEGMENT_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-pink-500',
]

export const WeightDistributionBar = memo(function WeightDistributionBar({
  designs,
  className,
}: WeightDistributionBarProps) {
  // Filter out practice designs (they don't participate in random assignment)
  const activeDesigns = useMemo(
    () => designs.filter((d) => !d.is_practice),
    [designs]
  )

  // Calculate total weight
  const totalWeight = useMemo(
    () => activeDesigns.reduce((sum, d) => sum + d.weight, 0),
    [activeDesigns]
  )

  // Calculate percentage for each design
  const segments = useMemo(() => {
    if (totalWeight === 0) return []
    return activeDesigns.map((design, index) => ({
      id: design.id,
      name: design.name || `Design ${index + 1}`,
      weight: design.weight,
      percentage: Math.round((design.weight / totalWeight) * 100),
      color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
    }))
  }, [activeDesigns, totalWeight])

  // Don't show if only 0 or 1 design
  if (activeDesigns.length < 2) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          Traffic Distribution
        </span>
        <span className="text-xs text-muted-foreground">
          Based on weights
        </span>
      </div>

      {/* Distribution bar */}
      <div className="h-3 rounded-full overflow-hidden flex bg-muted">
        {segments.map((segment) => (
          <div
            key={segment.id}
            className={cn(segment.color, 'transition-all duration-300')}
            style={{ width: `${segment.percentage}%` }}
            title={`${segment.name}: ${segment.percentage}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {segments.map((segment) => (
          <div key={segment.id} className="flex items-center gap-1.5">
            <div className={cn('w-2.5 h-2.5 rounded-full', segment.color)} />
            <span className="text-xs text-muted-foreground">
              {segment.name}: <span className="font-medium text-foreground">{segment.percentage}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})
