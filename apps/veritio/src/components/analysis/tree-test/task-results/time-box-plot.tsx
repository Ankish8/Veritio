'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { BoxPlotStats } from '@/lib/algorithms/statistics'
import { formatTimeMs } from '@/lib/algorithms/statistics'

interface TimeBoxPlotProps {
  stats: BoxPlotStats
  medianValue: number // The median value to display
  className?: string
}

/**
 * Horizontal box plot visualization for time taken distribution.
 * Matches Optimal Workshop style with light blue IQR box.
 */
export function TimeBoxPlot({
  stats,
  medianValue,
  className,
}: TimeBoxPlotProps) {
  // Handle empty/zero case
  if (stats.max === 0 || medianValue === 0) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Time taken</span>
          <span className="text-muted-foreground">No data</span>
        </div>
        <div className="h-10 bg-stone-200 rounded-sm" />
        <div className="flex justify-between text-[12px] text-muted-foreground">
          <span>0</span>
          <span>1</span>
        </div>
      </div>
    )
  }

  // Use a nice scale based on the max time
  // Round up to next nice number for scale
  const maxSeconds = stats.max / 1000
  const scaleMax = maxSeconds < 2 ? Math.ceil(maxSeconds * 2) / 2 : Math.ceil(maxSeconds)
  const scaleMaxMs = scaleMax * 1000

  // Calculate positions as percentages
  const scale = (value: number) => (value / scaleMaxMs) * 100

  const q1Pos = Math.min(scale(stats.q1), 100)
  const medianPos = Math.min(scale(stats.median), 100)
  const q3Pos = Math.min(scale(stats.q3), 100)

  const tooltipContent = (
    <div className="space-y-1 text-sm">
      <div className="font-medium">Time Distribution</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
        <span>Lowest observed time:</span>
        <span>{formatTimeMs(stats.min)}</span>
        <span>Lower quartile:</span>
        <span>{formatTimeMs(stats.q1)}</span>
        <span>Median:</span>
        <span>{formatTimeMs(stats.median)}</span>
        <span>Upper quartile:</span>
        <span>{formatTimeMs(stats.q3)}</span>
        <span>Highest observed time:</span>
        <span>{formatTimeMs(stats.max)}</span>
      </div>
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`space-y-1 cursor-help ${className || ''}`} data-pdf-chart="time-box-plot">
            {/* Label and median value */}
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Time taken</span>
              <span className="font-medium">{formatTimeMs(medianValue)}</span>
            </div>

            {/* Box plot visualization */}
            <div className="relative">
              {/* Background track - light gray like other charts */}
              <div className="h-10 bg-stone-200 rounded-sm relative overflow-hidden">
                {/* IQR Box (Q1 to Q3) - light blue */}
                <div
                  className="absolute top-0 h-full bg-blue-200"
                  style={{
                    left: `${q1Pos}%`,
                    width: `${Math.max(0, q3Pos - q1Pos)}%`,
                  }}
                />

                {/* Median to Q3 section - darker blue */}
                <div
                  className="absolute top-0 h-full bg-blue-400"
                  style={{
                    left: `${medianPos}%`,
                    width: `${Math.max(0, q3Pos - medianPos)}%`,
                  }}
                />

                {/* Median line */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-stone-800"
                  style={{ left: `${medianPos}%` }}
                />
              </div>
            </div>

            {/* Scale */}
            <div className="flex justify-between text-[12px] text-muted-foreground px-0.5">
              <span>0</span>
              <span>{scaleMax}</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="p-3">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
