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
import { cn } from '@/lib/utils'
import type { PrototypeStatusBreakdown } from '@/lib/algorithms/prototype-test-analysis'

interface ResultPieChartProps {
  statusBreakdown: PrototypeStatusBreakdown
  responseCount: number
  className?: string
}

const SEGMENTS = [
  { key: 'success' as const, name: 'Success', label: 'Success', color: '#22c55e' },
  { key: 'failure' as const, name: 'Failure', label: 'Failed', color: '#ef4444' },
  { key: 'skipped' as const, name: 'Skipped', label: 'Skipped', color: '#a8a29e' },
]

interface ChartDataItem {
  name: string
  value: number
  color: string
  percentage: number
  [key: string]: unknown
}

function CustomTooltip({
  active,
  payload
}: {
  active?: boolean
  payload?: Array<{ payload: ChartDataItem }>
}) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload
  const segment = SEGMENTS.find(s => s.name === data.name)
  const label = segment?.label ?? data.name

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

export function ResultPieChart({
  statusBreakdown,
  responseCount,
  className,
}: ResultPieChartProps) {
  const chartData = useMemo(() => {
    const totals: Record<string, number> = {
      success: statusBreakdown.success.total,
      failure: statusBreakdown.failure.total,
      skipped: statusBreakdown.skipped.total,
    }

    return SEGMENTS
      .filter(seg => totals[seg.key] > 0)
      .map(seg => ({
        name: seg.name,
        value: totals[seg.key],
        color: seg.color,
        percentage: responseCount > 0
          ? Math.round((totals[seg.key] / responseCount) * 100)
          : 0,
      }))
  }, [statusBreakdown, responseCount])

  if (responseCount === 0 || chartData.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-[200px] w-[200px]', className)}>
        <div className="text-muted-foreground text-sm">No responses yet</div>
      </div>
    )
  }

  const largestSegment = chartData.reduce((prev, current) =>
    current.value > prev.value ? current : prev
  )

  return (
    <div className={cn('relative', className)} data-pdf-chart="result-pie-chart">
      <div className="h-[200px] w-[200px] relative" style={{ contain: 'layout' }}>
        <Suspense fallback={<PieChartLoadingSkeleton size={200} />}>
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyPieChart>
              <LazyPie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={90}
                paddingAngle={1}
                dataKey="value"
                stroke="white"
                strokeWidth={2}
                isAnimationActive={true}
                animationDuration={500}
                animationEasing="ease-out"
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

      <div className="text-center mt-2">
        <span className="text-lg font-semibold">{largestSegment.percentage}%</span>
      </div>
    </div>
  )
}
