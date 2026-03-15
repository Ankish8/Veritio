'use client'

import { useMemo, Suspense } from 'react'
import {
  LazyPieChart,
  LazyPie,
  LazyCell,
  LazyResponsiveContainer,
  LazyTooltip,
  PieChartLoadingSkeleton,
} from '@/components/ui/lazy-charts'
import type { StatusBreakdown } from '@/lib/algorithms/statistics'

interface ResultPieChartProps {
  statusBreakdown: StatusBreakdown
  responseCount: number
  className?: string
}

// Colors matching Optimal Workshop style
const COLORS = {
  success: '#22c55e', // green-500
  fail: '#ef4444',    // red-500
  skip: '#a8a29e',    // stone-400
}

// Labels for display
const LABELS = {
  Success: 'Success',
  Fail: 'Failed',
  Skip: 'Skipped',
}

interface ChartDataItem {
  name: string
  value: number
  color: string
  percentage: number
  [key: string]: unknown  // Required for Recharts compatibility
}

/**
 * Custom tooltip component for the pie chart.
 * Shows a modern, well-styled tooltip with color indicator.
 */
function CustomTooltip({
  active,
  payload
}: {
  active?: boolean
  payload?: Array<{ payload: ChartDataItem }>
}) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload
  const label = LABELS[data.name as keyof typeof LABELS] || data.name

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 min-w-[120px]">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: data.color }}
        />
        <span className="font-medium text-sm text-foreground">{label}</span>
      </div>
      <div className="mt-1.5 pl-5 space-y-0.5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-xs text-muted-foreground">Responses</span>
          <span className="text-sm font-semibold text-foreground">{data.value}</span>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-xs text-muted-foreground">Percentage</span>
          <span className="text-sm font-semibold text-foreground">{data.percentage}%</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Solid pie chart showing Success (green), Fail (red), Skip (gray) distribution.
 * Shows largest percentage in the center.
 */
export function ResultPieChart({
  statusBreakdown,
  responseCount,
  className,
}: ResultPieChartProps) {
  const chartData = useMemo(() => {
    const data: ChartDataItem[] = []

    if (statusBreakdown.success.total > 0) {
      data.push({
        name: 'Success',
        value: statusBreakdown.success.total,
        color: COLORS.success,
        percentage: responseCount > 0
          ? Math.round((statusBreakdown.success.total / responseCount) * 100)
          : 0,
      })
    }

    if (statusBreakdown.fail.total > 0) {
      data.push({
        name: 'Fail',
        value: statusBreakdown.fail.total,
        color: COLORS.fail,
        percentage: responseCount > 0
          ? Math.round((statusBreakdown.fail.total / responseCount) * 100)
          : 0,
      })
    }

    if (statusBreakdown.skip.total > 0) {
      data.push({
        name: 'Skip',
        value: statusBreakdown.skip.total,
        color: COLORS.skip,
        percentage: responseCount > 0
          ? Math.round((statusBreakdown.skip.total / responseCount) * 100)
          : 0,
      })
    }

    return data
  }, [statusBreakdown, responseCount])

  // Handle empty state
  if (responseCount === 0 || chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-[200px] w-[200px] ${className || ''}`}>
        <div className="text-muted-foreground text-sm">No responses yet</div>
      </div>
    )
  }

  // Find the largest segment for center display
  const largestSegment = chartData.reduce((prev, current) =>
    current.value > prev.value ? current : prev
  )

  return (
    <div className={`relative ${className || ''}`} data-pdf-chart="result-pie-chart">
      <div className="h-[200px] w-[200px] relative" style={{ contain: 'layout' }}>
        <Suspense fallback={<PieChartLoadingSkeleton size={200} />}>
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyPieChart>
              <LazyPie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={0}   // Solid pie, no donut
                outerRadius={90}
                paddingAngle={1}
                dataKey="value"
                stroke="white"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <LazyCell key={`cell-${index}`} fill={entry.color} />
                ))}
              </LazyPie>
              <LazyTooltip
                content={<CustomTooltip />}
                cursor={false}
              />
            </LazyPieChart>
          </LazyResponsiveContainer>
        </Suspense>
      </div>

      {/* Percentage below chart */}
      <div className="text-center mt-2">
        <span className="text-lg font-semibold">{largestSegment.percentage}%</span>
      </div>
    </div>
  )
}
