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
  LazyLegend,
  ChartLoadingSkeleton,
} from '@/components/ui/lazy-charts'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type { MatrixQuestionConfig } from '@veritio/study-types/study-flow-types'
import { castJson } from '@/lib/supabase/json-utils'
import { MATRIX_COLUMN_COLORS, countMatrixResponses, normalizeMatrixItems } from './matrix-utils'
import { CHART_COLORS } from '@/lib/colors'

interface MatrixStackedBarProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

export function MatrixStackedBar({
  question,
  responses,
}: MatrixStackedBarProps) {
  const config = castJson<MatrixQuestionConfig>(question.config, { rows: [], columns: [] })
  const rows = normalizeMatrixItems(config?.rows || [])
  const columns = normalizeMatrixItems(config?.columns || [])

  const chartData = useMemo(() => {
    const { cellCounts, rowCounts } = countMatrixResponses(responses, rows, columns)

    return rows.map(row => {
      const total = rowCounts[row.id] || 1
      const dataPoint: Record<string, string | number> = {
        name: row.label,
        fullName: row.label,
        total,
      }

      for (const col of columns) {
        const count = cellCounts[row.id][col.id] || 0
        const percentage = total > 0 ? (count / total) * 100 : 0
        dataPoint[col.id] = percentage
        dataPoint[`${col.id}_count`] = count
      }

      return dataPoint
    })
  }, [responses, rows, columns])

  const maxLabelLength = Math.max(...rows.map(r => r.label.length), 10)
  const leftMargin = Math.min(Math.max(maxLabelLength * 7, 150), 250)

  if (rows.length === 0 || columns.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">No matrix configuration found</p>
      </div>
    )
  }

  if (responses.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">No responses yet</p>
      </div>
    )
  }

  const chartHeight = Math.max(300, rows.length * 50)

  return (
    <div className="w-full" style={{ height: chartHeight, contain: 'layout' }}>
      <Suspense fallback={<ChartLoadingSkeleton height={chartHeight} />}>
        <LazyResponsiveContainer width="100%" height="100%">
          <LazyBarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: leftMargin, bottom: 20 }}
          >
            <LazyCartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.axisStroke} />
            <LazyXAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fontSize: 12 }}
            />
            <LazyYAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              width={leftMargin - 10}
              tickFormatter={(value: string) => value}
            />
            <LazyTooltip
              formatter={(value, name, props) => {
                const v = (value as number) ?? 0
                const colLabel = columns.find(c => c.id === name)?.label || name
                const count = (props.payload as Record<string, number | string>)[`${name}_count`] as number
                return [`${count} (${v.toFixed(1)}%)`, colLabel]
              }}
              labelFormatter={(label: string, payload) => {
                if (payload && payload.length > 0) {
                  return payload[0].payload.fullName
                }
                return label
              }}
            />
            <LazyLegend
              formatter={(value: string) => {
                const col = columns.find(c => c.id === value)
                return col?.label || value
              }}
            />
            {columns.map((col, index) => (
              <LazyBar
                key={col.id}
                dataKey={col.id}
                stackId="stack"
                fill={MATRIX_COLUMN_COLORS[index % MATRIX_COLUMN_COLORS.length]}
              />
            ))}
          </LazyBarChart>
        </LazyResponsiveContainer>
      </Suspense>
    </div>
  )
}
