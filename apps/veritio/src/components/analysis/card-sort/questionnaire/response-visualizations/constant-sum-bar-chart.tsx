'use client'

import React, { useMemo, Suspense } from 'react'
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
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { parseConstantSumConfig, calculateConstantSumAllocations } from './constant-sum-utils'

interface ConstantSumBarChartProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface BarData {
  name: string
  value: number
  percentage: number
  fill: string
}

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export const ConstantSumBarChart = React.memo(function ConstantSumBarChart({
  question,
  responses,
}: ConstantSumBarChartProps) {
  const { items, totalPoints } = parseConstantSumConfig(question)

  const chartData = useMemo(() => {
    const allocations = calculateConstantSumAllocations(responses, items, totalPoints)

    const data: BarData[] = allocations.map(a => ({
      name: a.label,
      value: a.mean,
      percentage: a.percentage,
      fill: '',
    }))

    data.sort((a, b) => b.value - a.value)

    data.forEach((item, index) => {
      item.fill = CHART_COLORS[index % CHART_COLORS.length]
    })

    return data
  }, [items, responses, totalPoints])

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No responses yet</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Invalid question configuration</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {responses.length} responses · {totalPoints} total points
      </div>

      <div className="h-[400px]" style={{ contain: 'layout' }}>
        <Suspense fallback={<ChartLoadingSkeleton height={400} />}>
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyBarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
            >
              <LazyCartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <LazyXAxis
                type="number"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                label={{ value: 'Mean Points Allocated', position: 'bottom', offset: -5, fontSize: 12 }}
              />
              <LazyYAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                width={110}
              />
              <LazyTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const data = payload[0].payload as BarData
                  return (
                    <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-md">
                      <p className="text-sm font-medium">{data.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.value.toFixed(1)} points ({data.percentage.toFixed(1)}%)
                      </p>
                    </div>
                  )
                }}
              />
              <LazyBar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <LazyCell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </LazyBar>
            </LazyBarChart>
          </LazyResponsiveContainer>
        </Suspense>
      </div>
    </div>
  )
})
