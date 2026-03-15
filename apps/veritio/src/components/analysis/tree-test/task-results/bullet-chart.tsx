'use client'

import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ConfidenceInterval } from '@/lib/algorithms/statistics'

interface BulletChartProps {
  label: string
  value: number // 0-100 percentage
  confidenceInterval?: ConfidenceInterval
  color?: 'green' | 'blue' | 'orange' | 'gray'
  max?: number
  className?: string
}

const colorClasses = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
  gray: 'bg-stone-400',
}

/**
 * Bullet chart visualization matching Optimal Workshop style.
 * Shows a colored bar with confidence interval marker and scale.
 */
export function BulletChart({
  label,
  value,
  confidenceInterval,
  color = 'green',
  max = 100,
  className,
}: BulletChartProps) {
  const hasCI = confidenceInterval &&
    confidenceInterval.lowerBound !== confidenceInterval.upperBound

  // Calculate CI midpoint for the vertical marker
  const ciMidpoint = hasCI
    ? (confidenceInterval.lowerBound + confidenceInterval.upperBound) / 2
    : value

  // Scale markers - every 10 units
  const scaleMarkers = Array.from({ length: 11 }, (_, i) => (max / 10) * i)

  const chartContent = (
    <div className={cn('space-y-1', className)}>
      {/* Label and value row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-medium">{value.toFixed(0)}%</span>
      </div>

      {/* Bullet chart */}
      <div className="relative">
        {/* Background track - light gray */}
        <div className="h-10 bg-stone-200 rounded-sm overflow-hidden relative">
          {/* Filled bar */}
          <div
            className={cn('h-full transition-all duration-300', colorClasses[color])}
            style={{ width: `${Math.min(100, Math.max(0, (value / max) * 100))}%` }}
          />

          {/* CI vertical marker line */}
          {hasCI && (
            <div
              className="absolute top-0 h-full w-0.5 bg-stone-800"
              style={{ left: `${(ciMidpoint / max) * 100}%` }}
            />
          )}
        </div>
      </div>

      {/* Scale */}
      <div className="flex justify-between text-[12px] text-muted-foreground px-0.5">
        {scaleMarkers.map((val) => (
          <span key={val}>{val}</span>
        ))}
      </div>
    </div>
  )

  // Wrap in tooltip if CI exists
  if (hasCI) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">{chartContent}</div>
          </TooltipTrigger>
          <TooltipContent className="p-3">
            <div className="space-y-1 text-sm">
              <div className="font-medium">
                {Math.round(confidenceInterval.level * 100)}% Confidence Interval
              </div>
              <div className="text-muted-foreground">
                Lower limit: {confidenceInterval.lowerBound.toFixed(1)}%
              </div>
              <div className="text-muted-foreground">
                Upper limit: {confidenceInterval.upperBound.toFixed(1)}%
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return chartContent
}
