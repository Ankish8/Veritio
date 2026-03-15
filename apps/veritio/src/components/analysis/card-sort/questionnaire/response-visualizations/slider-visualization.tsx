'use client'

import { useMemo, Suspense } from 'react'
import {
  LazyBarChart,
  LazyBar,
  LazyXAxis,
  LazyYAxis,
  LazyCartesianGrid,
  LazyTooltip,
  LazyResponsiveContainer,
  ChartLoadingSkeleton,
} from '@/components/ui/lazy-charts'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type { SliderQuestionConfig } from '@veritio/study-types/study-flow-types'
import { calculateDescriptiveStats } from './descriptive-stats'
import { StatCard } from './stat-card'

interface SliderVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface HistogramBin {
  range: string
  count: number
  minVal: number
  maxVal: number
}

/**
 * Parse a slider response value
 */
function parseSliderValue(value: unknown): number | null {
  if (typeof value === 'number' && !isNaN(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    if (!isNaN(parsed)) {
      return parsed
    }
  }
  return null
}


/**
 * Create histogram bins for the slider range
 */
function createHistogramBins(
  values: number[],
  sliderMin: number,
  sliderMax: number
): HistogramBin[] {
  if (values.length === 0) return []

  // Use 10 bins or fewer if range is small
  const range = sliderMax - sliderMin
  const binCount = Math.min(10, Math.max(5, Math.ceil(range / 10)))
  const binWidth = range / binCount

  // Initialize bins
  const bins: HistogramBin[] = []
  for (let i = 0; i < binCount; i++) {
    const minVal = sliderMin + i * binWidth
    const maxVal = sliderMin + (i + 1) * binWidth
    bins.push({
      range: `${Math.round(minVal)}-${Math.round(maxVal)}`,
      count: 0,
      minVal,
      maxVal,
    })
  }

  // Count values in each bin
  for (const value of values) {
    const binIndex = Math.min(
      Math.floor((value - sliderMin) / binWidth),
      binCount - 1
    )
    if (binIndex >= 0 && binIndex < bins.length) {
      bins[binIndex].count++
    }
  }

  return bins
}

/**
 * Visualization for Slider question responses.
 * Shows histogram and basic statistics.
 */
export function SliderVisualization({
  question,
  responses,
}: SliderVisualizationProps) {
  // Get slider config
  const config = question.config as SliderQuestionConfig | null
  const sliderMin = config?.minValue ?? 0
  const sliderMax = config?.maxValue ?? 100

  // Parse numeric values from responses
  const values = useMemo(() => {
    const nums: number[] = []
    for (const response of responses) {
      const parsed = parseSliderValue(response.response_value)
      if (parsed !== null) {
        nums.push(parsed)
      }
    }
    return nums
  }, [responses])

  // Calculate statistics
  const stats = useMemo(() => calculateDescriptiveStats(values), [values])

  // Create histogram bins
  const histogramData = useMemo(
    () => createHistogramBins(values, sliderMin, sliderMax),
    [values, sliderMin, sliderMax]
  )

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No responses yet</p>
      </div>
    )
  }

  if (!stats || values.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No valid slider data found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard label="Responses" value={stats.count.toString()} />
        <StatCard label="Min" value={stats.min.toString()} />
        <StatCard label="Max" value={stats.max.toString()} />
        <StatCard label="Average" value={stats.mean.toFixed(1)} variant="highlight" />
        <StatCard label="Median" value={stats.median.toFixed(1)} />
      </div>

      {/* Histogram */}
      <div className="h-[280px]" style={{ contain: 'layout' }}>
        <Suspense fallback={<ChartLoadingSkeleton height={280} />}>
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyBarChart
              data={histogramData}
              margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
            >
              <LazyCartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <LazyXAxis
                dataKey="range"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={50}
                className="text-muted-foreground"
              />
              <LazyYAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                allowDecimals={false}
              />
              <LazyTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const data = payload[0].payload as HistogramBin
                  return (
                    <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-md">
                      <p className="text-sm font-medium">Range: {data.range}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.count} response{data.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )
                }}
              />
              <LazyBar
                dataKey="count"
                fill="var(--chart-1)"
                radius={[4, 4, 0, 0]}
              />
            </LazyBarChart>
          </LazyResponsiveContainer>
        </Suspense>
      </div>

      {/* Labels if configured */}
      {(config?.leftLabel || config?.rightLabel) && (
        <div className="flex justify-between text-xs text-muted-foreground px-2">
          <span>{config?.leftLabel || sliderMin}</span>
          {config?.middleLabel && <span>{config.middleLabel}</span>}
          <span>{config?.rightLabel || sliderMax}</span>
        </div>
      )}
    </div>
  )
}
