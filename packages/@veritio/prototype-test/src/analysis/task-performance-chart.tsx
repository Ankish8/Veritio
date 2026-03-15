'use client'

import { useMemo, Suspense, memo } from 'react'
import {
  LazyBarChart,
  LazyBar,
  LazyXAxis,
  LazyYAxis,
  LazyTooltip,
  LazyResponsiveContainer,
  LazyLegend,
  ChartLoadingSkeleton,
  ChartWrapper,
} from '@veritio/ui/components/lazy-charts'
import type { PrototypeTaskMetrics } from '@veritio/prototype-test/algorithms/prototype-test-analysis'

interface TaskPerformanceChartProps {
  taskMetrics: PrototypeTaskMetrics[]
}

const COLORS = {
  success: '#22c55e',    // green-500
  failure: '#ef4444',    // red-500
  abandoned: '#f59e0b',  // amber-500
  skipped: '#94a3b8',    // slate-400
}

export const TaskPerformanceChart = memo(function TaskPerformanceChart({ taskMetrics }: TaskPerformanceChartProps) {
  const chartData = useMemo(() => {
    return taskMetrics.map((task, index) => ({
      name: `Task ${index + 1}`,
      fullName: task.taskTitle,
      success: task.successRate,
      failure: task.failureRate,
      abandoned: task.abandonedRate,
      skipped: task.skippedRate,
    }))
  }, [taskMetrics])

  if (taskMetrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No task data available
      </div>
    )
  }

  return (
    <ChartWrapper height={250} className="w-full" data-pdf-chart="task-performance">
      <Suspense fallback={<ChartLoadingSkeleton height={250} />}>
        <LazyResponsiveContainer width="100%" height="100%">
          <LazyBarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            {/* Animations disabled to prevent forced reflows during initial render */}
            <LazyXAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <LazyYAxis
              type="category"
              dataKey="name"
              width={60}
              tick={{ fontSize: 12 }}
            />
            <LazyTooltip
              formatter={(value, name) => [`${Number(value ?? 0).toFixed(1)}%`, name]}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                  return payload[0].payload.fullName
                }
                return label
              }}
            />
            <LazyLegend />
            <LazyBar dataKey="success" name="Success" stackId="a" fill={COLORS.success} isAnimationActive={false} />
            <LazyBar dataKey="failure" name="Failure" stackId="a" fill={COLORS.failure} isAnimationActive={false} />
            <LazyBar dataKey="abandoned" name="Abandoned" stackId="a" fill={COLORS.abandoned} isAnimationActive={false} />
            <LazyBar dataKey="skipped" name="Skipped" stackId="a" fill={COLORS.skipped} isAnimationActive={false} />
          </LazyBarChart>
        </LazyResponsiveContainer>
      </Suspense>
    </ChartWrapper>
  )
})
