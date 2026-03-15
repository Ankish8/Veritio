'use client'

import { useMemo, Suspense } from 'react'
import { ListChecks } from 'lucide-react'
import type { TaskMetrics } from '@/lib/algorithms/tree-test-analysis'

// Lazy-loaded Recharts for performance (reduces initial bundle ~200KB)
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
  tasks: TaskMetrics[]
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload || payload.length === 0) return null
  const labels: Record<string, string> = {
    directSuccess: 'Direct Success',
    indirectSuccess: 'Indirect Success',
    failure: 'Failure',
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
      // Calculate the segments:
      // - Direct Success: found correct answer without backtracking
      // - Indirect Success: found correct answer with backtracking
      // - Failure: did not find correct answer
      const directSuccess = task.directSuccessRate
      const indirectSuccess = Math.max(0, task.successRate - task.directSuccessRate)
      const failure = Math.max(0, 100 - task.successRate)

      return {
        name: `Task ${index + 1}`,
        fullName: task.question.length > 40 ? task.question.slice(0, 40) + '...' : task.question,
        directSuccess,
        indirectSuccess,
        failure,
        successRate: task.successRate,
        directnessRate: task.directnessRate,
        responseCount: task.responseCount
      }
    })
  }, [tasks])

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

  const chartHeight = Math.max(250, chartData.length * 40 + 80)

  return (
    <div className="space-y-4" data-pdf-chart="task-performance">
      <ChartWrapper height={chartHeight} className="w-full">
        <Suspense fallback={<ChartLoadingSkeleton height={chartHeight} />}>
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyBarChart
              data={chartData}
              layout="vertical"
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
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-popover border rounded-md px-3 py-2 shadow-md max-w-[250px]">
                        <p className="text-sm font-medium mb-1">{data.fullName}</p>
                        <div className="space-y-1 text-xs">
                          <p className="text-emerald-600">Direct Success: {data.directSuccess.toFixed(1)}%</p>
                          <p className="text-emerald-400">Indirect Success: {data.indirectSuccess.toFixed(1)}%</p>
                          <p className="text-gray-500">Failure: {data.failure.toFixed(1)}%</p>
                          <p className="text-muted-foreground mt-1 pt-1 border-t">{data.responseCount} responses</p>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <LazyLegend content={<CustomLegend />} />
              <LazyBar dataKey="directSuccess" stackId="a" fill={STATUS_COLORS.success} radius={[0, 0, 0, 0]} />
              <LazyBar dataKey="indirectSuccess" stackId="a" fill={STATUS_COLORS.successLight} radius={[0, 0, 0, 0]} />
              <LazyBar dataKey="failure" stackId="a" fill={STATUS_COLORS.neutral} radius={[0, 4, 4, 0]} />
            </LazyBarChart>
          </LazyResponsiveContainer>
        </Suspense>
      </ChartWrapper>
    </div>
  )
}
