'use client'

import React, { useMemo, Suspense } from 'react'
import {
  LazyPieChart,
  LazyPie,
  LazyCell,
  LazyTooltip,
  LazyResponsiveContainer,
  ChartLoadingSkeleton,
} from '@/components/ui/lazy-charts'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { parseConstantSumConfig, calculateConstantSumAllocations } from './constant-sum-utils'

interface ConstantSumPieChartProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface PieData {
  name: string
  value: number
  percentage: number
  fill: string
}

const PIE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export const ConstantSumPieChart = React.memo(function ConstantSumPieChart({
  question,
  responses,
}: ConstantSumPieChartProps) {
  const { items, totalPoints } = parseConstantSumConfig(question)

  const chartData = useMemo(() => {
    const allocations = calculateConstantSumAllocations(responses, items, totalPoints)

    const data: PieData[] = allocations
      .filter(a => a.mean > 0)
      .map(a => ({
        name: a.label,
        value: a.mean,
        percentage: a.percentage,
        fill: '',
      }))

    data.sort((a, b) => b.value - a.value)

    data.forEach((item, index) => {
      item.fill = PIE_COLORS[index % PIE_COLORS.length]
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

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No points have been allocated</p>
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
            <LazyPieChart>
              <LazyPie
                data={chartData as any}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, percentage }: any) => `${name}: ${percentage.toFixed(1)}%`}
                labelLine
              >
                {chartData.map((entry, index) => (
                  <LazyCell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </LazyPie>
              <LazyTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const data = payload[0].payload as PieData
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
            </LazyPieChart>
          </LazyResponsiveContainer>
        </Suspense>
      </div>

      <div className="flex flex-wrap gap-3 justify-center text-xs">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: item.fill }} />
            <span className="font-medium">{item.name}</span>
            <span className="text-muted-foreground">({item.percentage.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
})
