'use client'

import { useMemo, Suspense } from 'react'
import { ListChecks } from 'lucide-react'
import type { TaskMetric } from '@/services/results/first-click'

import {
  LazyBarChart,
  LazyBar,
  LazyXAxis,
  LazyYAxis,
  LazyTooltip,
  LazyLegend,
  LazyResponsiveContainer,
  ChartLoadingSkeleton,
  ChartWrapper,
} from '@/components/ui/lazy-charts'
import { STATUS_COLORS, CHART_COLORS } from '@/lib/colors'

interface TaskPerformanceChartProps {
  tasks: TaskMetric[]
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload || payload.length === 0) return null
  const labels: Record<string, string> = {
    success: 'Success',
    failure: 'Incorrect',
    skipped: 'Skipped',
  }
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: entry.color }} />
          <span className="text-xs text-muted-foreground">{labels[entry.value] || entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function TaskPerformanceChart({ tasks }: TaskPerformanceChartProps) {
  const chartData = useMemo(() => {
    if (!tasks || tasks.length === 0) return []

    return tasks.map((task, index) => {
      // Calculate segments: success, skip, and failure (implied)
      const success = task.successRate
      const skipped = task.skipRate
      const failure = Math.max(0, 100 - success - skipped)

      return {
        name: `Task ${index + 1}`,
        fullName: task.instruction.length > 50 ? task.instruction.slice(0, 50) + '...' : task.instruction,
        success,
        skipped,
        failure,
        responseCount: task.responseCount,
        avgTime: task.avgTimeToClickMs,
      }
    })
  }, [tasks])

  const chartHeight = Math.max(140, chartData.length * 52 + 80)

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <ListChecks className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          Task performance data will appear here once participants complete your study.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-pdf-chart="task-performance">
      <ChartWrapper height={chartHeight} className="w-full">
        <Suspense fallback={<ChartLoadingSkeleton height={chartHeight} />}>
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyBarChart
              data={chartData}
              layout="vertical"
              barSize={20}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <LazyXAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                axisLine={{ stroke: CHART_COLORS.axisStroke }}
                tickLine={false}
                tick={{ fontSize: 11, fill: CHART_COLORS.tickFill }}
              />
              <LazyYAxis
                type="category"
                dataKey="name"
                width={60}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: CHART_COLORS.tickFill }}
              />
              <LazyTooltip
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-popover border rounded-md px-3 py-2 shadow-md max-w-[280px]">
                        <p className="text-sm font-medium mb-1">{data.fullName}</p>
                        <div className="space-y-1 text-xs">
                          <p className="text-emerald-600">Success: {data.success.toFixed(1)}%</p>
                          <p className="text-slate-500">Skipped: {data.skipped.toFixed(1)}%</p>
                          <p className="text-red-500">Incorrect: {data.failure.toFixed(1)}%</p>
                          <p className="text-muted-foreground mt-1 pt-1 border-t">
                            {data.responseCount} responses • Avg {(data.avgTime / 1000).toFixed(1)}s
                          </p>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <LazyLegend content={<CustomLegend />} />
              <LazyBar dataKey="success" stackId="a" fill={STATUS_COLORS.success} radius={[0, 0, 0, 0]} />
              <LazyBar dataKey="failure" stackId="a" fill={STATUS_COLORS.failure} radius={[0, 0, 0, 0]} />
              <LazyBar dataKey="skipped" stackId="a" fill={STATUS_COLORS.skipped} radius={[0, 4, 4, 0]} />
            </LazyBarChart>
          </LazyResponsiveContainer>
        </Suspense>
      </ChartWrapper>
    </div>
  )
}
