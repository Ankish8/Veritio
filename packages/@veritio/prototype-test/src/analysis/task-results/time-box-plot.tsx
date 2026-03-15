'use client'

import { useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import { cn } from '@veritio/ui'
import type { BoxPlotStats } from '@veritio/prototype-test/lib/algorithms/statistics'

interface TimeBoxPlotProps {
  boxPlot: BoxPlotStats
  className?: string
}
function formatTime(ms: number): string {
  if (ms === 0) return '0s'
  if (ms < 1000) return `${Math.round(ms)}ms`

  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)

  if (remainingSeconds === 0) return `${minutes}m`
  return `${minutes}m ${remainingSeconds}s`
}
function generateTicks(min: number, max: number, targetCount: number = 5): number[] {
  const range = max - min
  if (range === 0) return [min]

  const roughStep = range / (targetCount - 1)
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const niceSteps = [1, 2, 5, 10]

  let step = magnitude
  for (const ns of niceSteps) {
    if (ns * magnitude >= roughStep) {
      step = ns * magnitude
      break
    }
  }

  const ticks: number[] = []
  const start = Math.ceil(min / step) * step
  for (let tick = start; tick <= max; tick += step) {
    ticks.push(tick)
  }

  if (ticks[0] > min) ticks.unshift(min)
  if (ticks[ticks.length - 1] < max) ticks.push(max)

  return ticks
}
export function TimeBoxPlot({ boxPlot, className }: TimeBoxPlotProps) {
  const hasValidData = useMemo(() => {
    return boxPlot && boxPlot.max > 0 && !isNaN(boxPlot.min) && !isNaN(boxPlot.max)
  }, [boxPlot])

  const { positions, ticks } = useMemo(() => {
    if (!hasValidData) return { positions: null, ticks: [] }

    const range = boxPlot.max - boxPlot.min

    if (range === 0) {
      return {
        positions: { min: 5, q1: 50, median: 50, q3: 50, max: 95, outliers: boxPlot.outliers || [] },
        ticks: [],
      }
    }

    const padding = 0.04
    const scale = (value: number) => {
      const normalized = (value - boxPlot.min) / range
      return padding * 100 + normalized * (1 - 2 * padding) * 100
    }

    const tickValues = generateTicks(boxPlot.min, boxPlot.max, 5)
    const tickPositions = tickValues.map(v => ({ value: v, position: scale(v) }))

    return {
      positions: {
        min: scale(boxPlot.min),
        q1: scale(boxPlot.q1),
        median: scale(boxPlot.median),
        q3: scale(boxPlot.q3),
        max: scale(boxPlot.max),
        outliers: boxPlot.outliers || [],
      },
      ticks: tickPositions,
    }
  }, [boxPlot, hasValidData])

  if (!hasValidData || !positions) {
    return (
      <div className={className}>
        <div className="h-24 flex items-center justify-center text-sm text-muted-foreground border rounded-lg border-dashed">
          Not enough data to show time distribution
        </div>
      </div>
    )
  }

  const boxWidth = Math.max(positions.q3 - positions.q1, 2)
  const hasOutliers = positions.outliers.length > 0

  return (
    <TooltipProvider>
      <div className={cn('space-y-3', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Time Distribution</h4>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Median: <span className="font-semibold text-foreground">{formatTime(boxPlot.median)}</span></span>
            <span>Range: <span className="font-medium">{formatTime(boxPlot.min)} – {formatTime(boxPlot.max)}</span></span>
          </div>
        </div>

        {/* Box plot container */}
        <div className="relative border rounded-lg p-4 bg-muted/20">
          {/* Tick lines */}
          <div className="absolute inset-x-4 top-4 bottom-10">
            {ticks.map((tick, idx) => (
              <div
                key={idx}
                className="absolute top-0 bottom-0 w-px bg-border"
                style={{ left: `${tick.position}%` }}
              />
            ))}
          </div>

          {/* Box plot */}
          <div className="relative h-12">
            {/* Whisker line */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-slate-400"
              style={{ left: `${positions.min}%`, width: `${positions.max - positions.min}%` }}
            />

            {/* Min cap */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1/2 w-0.5 h-5 bg-slate-500 cursor-pointer hover:bg-slate-700 transition-colors"
                  style={{ left: `${positions.min}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="text-xs text-white/70">Fastest</div>
                <div className="font-semibold">{formatTime(boxPlot.min)}</div>
              </TooltipContent>
            </Tooltip>

            {/* Max cap */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1/2 w-0.5 h-5 bg-slate-500 cursor-pointer hover:bg-slate-700 transition-colors"
                  style={{ left: `${positions.max}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="text-xs text-white/70">Slowest</div>
                <div className="font-semibold">{formatTime(boxPlot.max)}</div>
              </TooltipContent>
            </Tooltip>

            {/* IQR Box */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-8 bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-400 dark:border-indigo-500 rounded cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                  style={{ left: `${positions.q1}%`, width: `${boxWidth}%` }}
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="text-xs text-white/70 mb-1">Interquartile Range (50% of data)</div>
                <div className="flex items-center gap-3 text-sm">
                  <div>
                    <div className="text-[12px] text-white/60">Q1</div>
                    <div className="font-semibold">{formatTime(boxPlot.q1)}</div>
                  </div>
                  <span className="text-white/50">→</span>
                  <div>
                    <div className="text-[12px] text-white/60">Q3</div>
                    <div className="font-semibold">{formatTime(boxPlot.q3)}</div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Median line */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1/2 w-1 h-10 bg-indigo-600 dark:bg-indigo-400 rounded-full cursor-pointer z-10"
                  style={{ left: `${positions.median}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="text-xs text-white/70">Median</div>
                <div className="font-bold text-indigo-300">{formatTime(boxPlot.median)}</div>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Tick labels */}
          <div className="relative h-5 mt-1">
            {ticks.map((tick, idx) => (
              <span
                key={idx}
                className="absolute text-[12px] text-muted-foreground"
                style={{ left: `${tick.position}%`, transform: 'translateX(-50%)' }}
              >
                {formatTime(tick.value)}
              </span>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-px">
                <div className="w-0.5 h-2.5 bg-slate-500" />
                <div className="w-3 h-0.5 bg-slate-400" />
                <div className="w-0.5 h-2.5 bg-slate-500" />
              </div>
              <span className="text-muted-foreground">Range</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-2.5 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-400 rounded-sm" />
              <span className="text-muted-foreground">IQR (50%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-3 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
              <span className="text-muted-foreground">Median</span>
            </div>
          </div>

          {hasOutliers && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded cursor-help">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    {positions.outliers.length} outlier{positions.outliers.length > 1 ? 's' : ''}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="text-xs font-medium text-white/80 mb-1">Outliers (outside 1.5× IQR):</div>
                <div className="flex flex-wrap gap-1">
                  {positions.outliers.map((outlier, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 bg-amber-500/30 text-amber-200 rounded text-xs">
                      {formatTime(outlier)}
                    </span>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
