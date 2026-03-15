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
  LazyCell,
  ChartLoadingSkeleton,
} from '@/components/ui/lazy-charts'
import { Badge } from '@/components/ui/badge'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { calculateDescriptiveStats } from './descriptive-stats'
import { StatCard } from './stat-card'

interface NumericalVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface NumericalStats {
  min: number
  max: number
  mean: number
  median: number
  mode: number[]
  stdDev: number
  outlierCount: number
  validCount: number
  invalidCount: number
}

interface HistogramBin {
  range: string
  count: number
  isOutlier: boolean
  minVal: number
  maxVal: number
}

/**
 * Parse a response value as a number
 */
function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && !isNaN(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[,\s]/g, ''))
    if (!isNaN(parsed)) {
      return parsed
    }
  }
  return null
}

/**
 * Calculate statistical measures
 */
function calculateStats(values: number[]): NumericalStats | null {
  if (values.length === 0) return null

  const desc = calculateDescriptiveStats(values)
  if (!desc) return null

  // Mode (most frequent value(s))
  const frequency = new Map<number, number>()
  for (const v of values) {
    frequency.set(v, (frequency.get(v) || 0) + 1)
  }
  const maxFreq = Math.max(...frequency.values())
  const mode = maxFreq > 1
    ? Array.from(frequency.entries())
        .filter(([, count]) => count === maxFreq)
        .map(([value]) => value)
    : []

  // Outliers (values outside mean ± 2*stdDev)
  const lowerBound = desc.mean - 2 * desc.stdDev
  const upperBound = desc.mean + 2 * desc.stdDev
  const outlierCount = values.filter(v => v < lowerBound || v > upperBound).length

  return {
    min: desc.min,
    max: desc.max,
    mean: desc.mean,
    median: desc.median,
    mode,
    stdDev: desc.stdDev,
    outlierCount,
    validCount: desc.count,
    invalidCount: 0, // Set by caller
  }
}

/**
 * Create histogram bins using Sturges' formula
 */
function createHistogramBins(values: number[], stats: NumericalStats): HistogramBin[] {
  if (values.length === 0) return []

  // Sturges' formula for number of bins: k = 1 + 3.322 * log10(n)
  const k = Math.ceil(1 + 3.322 * Math.log10(values.length))
  const binCount = Math.max(5, Math.min(k, 15)) // Clamp between 5 and 15 bins

  const range = stats.max - stats.min
  const binWidth = range / binCount || 1

  // Initialize bins
  const bins: HistogramBin[] = []
  for (let i = 0; i < binCount; i++) {
    const minVal = stats.min + i * binWidth
    const maxVal = stats.min + (i + 1) * binWidth
    bins.push({
      range: `${minVal.toFixed(1)}-${maxVal.toFixed(1)}`,
      count: 0,
      isOutlier: false,
      minVal,
      maxVal,
    })
  }

  // Outlier bounds
  const lowerBound = stats.mean - 2 * stats.stdDev
  const upperBound = stats.mean + 2 * stats.stdDev

  // Count values in each bin
  for (const value of values) {
    const binIndex = Math.min(
      Math.floor((value - stats.min) / binWidth),
      binCount - 1
    )
    if (binIndex >= 0 && binIndex < bins.length) {
      bins[binIndex].count++
      // Mark bin as containing outliers
      if (value < lowerBound || value > upperBound) {
        bins[binIndex].isOutlier = true
      }
    }
  }

  return bins
}

/**
 * Format a number for display
 */
function formatNumber(value: number, decimals: number = 2): string {
  if (Number.isInteger(value)) {
    return value.toString()
  }
  return value.toFixed(decimals)
}

/**
 * Visualization for numerical text responses.
 * Shows histogram and statistical summary.
 */
export function NumericalVisualization({
  question: _question,
  responses,
}: NumericalVisualizationProps) {
  // Parse numeric values from responses
  const { values, invalidCount } = useMemo(() => {
    const nums: number[] = []
    let invalid = 0

    for (const response of responses) {
      const parsed = parseNumericValue(response.response_value)
      if (parsed !== null) {
        nums.push(parsed)
      } else {
        invalid++
      }
    }

    return { values: nums, invalidCount: invalid }
  }, [responses])

  // Calculate statistics
  const stats = useMemo(() => {
    const result = calculateStats(values)
    if (result) {
      result.invalidCount = invalidCount
    }
    return result
  }, [values, invalidCount])

  // Create histogram bins
  const histogramData = useMemo(() => {
    if (!stats) return []
    return createHistogramBins(values, stats)
  }, [values, stats])

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
        <p className="text-sm">No valid numeric data found</p>
        <p className="text-xs mt-1">
          {invalidCount} response{invalidCount !== 1 ? 's' : ''} could not be parsed as numbers
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        <StatCard label="Min" value={formatNumber(stats.min)} />
        <StatCard label="Max" value={formatNumber(stats.max)} />
        <StatCard label="Mean" value={formatNumber(stats.mean)} />
        <StatCard label="Median" value={formatNumber(stats.median)} />
        <StatCard label="Std Dev" value={formatNumber(stats.stdDev)} />
        <StatCard
          label="Outliers"
          value={stats.outlierCount.toString()}
          variant={stats.outlierCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Mode (if any) */}
      {stats.mode.length > 0 && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Mode: </span>
          {stats.mode.map(v => formatNumber(v)).join(', ')}
          <span className="ml-2 text-xs">
            (appears {Math.max(...Array.from(new Map(values.map(v => [v, 0])).entries()).map(([val]) =>
              values.filter(x => x === val).length
            ))} times)
          </span>
        </div>
      )}

      {/* Data quality indicators */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          {stats.validCount} valid response{stats.validCount !== 1 ? 's' : ''}
        </span>
        {stats.invalidCount > 0 && (
          <Badge variant="outline" className="text-orange-600 border-orange-300">
            {stats.invalidCount} non-numeric
          </Badge>
        )}
      </div>

      {/* Histogram */}
      <div className="h-[300px]" style={{ contain: 'layout' }}>
        <Suspense fallback={<ChartLoadingSkeleton height={300} />}>
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyBarChart data={histogramData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <LazyCartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <LazyXAxis
                dataKey="range"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
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
                      <p className="text-sm font-medium">{data.range}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.count} response{data.count !== 1 ? 's' : ''}
                      </p>
                      {data.isOutlier && (
                        <p className="text-xs text-orange-600 mt-1">Contains outliers</p>
                      )}
                    </div>
                  )
                }}
              />
              <LazyBar dataKey="count" radius={[4, 4, 0, 0]}>
                {histogramData.map((entry, index) => (
                  <LazyCell
                    key={`cell-${index}`}
                    fill={entry.isOutlier ? 'var(--chart-2)' : 'var(--chart-1)'}
                  />
                ))}
              </LazyBar>
            </LazyBarChart>
          </LazyResponsiveContainer>
        </Suspense>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--chart-1)' }} />
          <span>Normal range</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--chart-2)' }} />
          <span>Contains outliers (outside ±2σ)</span>
        </div>
      </div>
    </div>
  )
}

