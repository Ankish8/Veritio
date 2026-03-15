'use client'

import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ConfidenceInterval } from '@/lib/algorithms/statistics'

interface MetricBarProps {
  label: string
  value: number // 0-100 percentage
  confidenceInterval?: ConfidenceInterval
  color?: 'green' | 'blue' | 'orange' | 'gray'
  showScale?: boolean
  className?: string
}

const colorClasses = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
  gray: 'bg-stone-400',
}

/**
 * Reusable metric bar with optional confidence interval tooltip.
 * Shows a progress-style bar with percentage value and optional scale.
 */
export function MetricBar({
  label,
  value,
  confidenceInterval,
  color = 'green',
  showScale = true,
  className,
}: MetricBarProps) {
  const hasCI = confidenceInterval && confidenceInterval.lowerBound !== confidenceInterval.upperBound

  const barContent = (
    <div className={cn('space-y-1', className)}>
      {/* Label and value */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{value.toFixed(0)}%</span>
      </div>

      {/* Bar container */}
      <div className="relative">
        {/* Background track */}
        <div className="h-3 bg-muted rounded-sm overflow-hidden">
          {/* Filled portion */}
          <div
            className={cn('h-full transition-all duration-300', colorClasses[color])}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        </div>

        {/* Confidence interval marker (if CI exists) */}
        {hasCI && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-5 border-l-2 border-r-2 border-stone-600"
            style={{
              left: `${confidenceInterval.lowerBound}%`,
              width: `${confidenceInterval.upperBound - confidenceInterval.lowerBound}%`,
            }}
          >
            {/* Center tick mark */}
            <div
              className="absolute top-0 h-full w-0.5 bg-stone-800"
              style={{ left: '50%', transform: 'translateX(-50%)' }}
            />
          </div>
        )}
      </div>

      {/* Scale */}
      {showScale && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>10</span>
          <span>20</span>
          <span>30</span>
          <span>40</span>
          <span>50</span>
          <span>60</span>
          <span>70</span>
          <span>80</span>
          <span>90</span>
          <span>100</span>
        </div>
      )}
    </div>
  )

  // Wrap in tooltip if CI exists
  if (hasCI) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">{barContent}</div>
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

  return barContent
}
