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

interface MatrixGroupedBarProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

export function MatrixGroupedBar({
  question,
  responses,
}: MatrixGroupedBarProps) {
  const config = castJson<MatrixQuestionConfig>(question.config, { rows: [], columns: [] })
  const rows = normalizeMatrixItems(config?.rows || [])
  const columns = normalizeMatrixItems(config?.columns || [])

  const chartData = useMemo(() => {
    const { cellCounts } = countMatrixResponses(responses, rows, columns)

    return rows.map(row => {
      const dataPoint: Record<string, string | number> = {
        name: row.label,
        fullName: row.label,
      }

      for (const col of columns) {
        dataPoint[col.id] = cellCounts[row.id][col.id] || 0
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

  const chartHeight = Math.max(300, rows.length * 60)

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
            <LazyXAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
            <LazyYAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              width={leftMargin - 10}
              tickFormatter={(value: string) => value}
            />
            <LazyTooltip
              formatter={(value, name) => {
                const colLabel = columns.find(c => c.id === name)?.label || name
                return [value ?? 0, colLabel]
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
                fill={MATRIX_COLUMN_COLORS[index % MATRIX_COLUMN_COLORS.length]}
                radius={[0, 4, 4, 0]}
              />
            ))}
          </LazyBarChart>
        </LazyResponsiveContainer>
      </Suspense>
    </div>
  )
}
