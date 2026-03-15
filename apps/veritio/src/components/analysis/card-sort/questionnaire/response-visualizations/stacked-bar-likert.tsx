'use client'

import { useMemo, Suspense } from 'react'
import {
  LazyBarChart,
  LazyBar,
  LazyXAxis,
  LazyYAxis,
  LazyTooltip,
  LazyResponsiveContainer,
  ChartLoadingSkeleton,
} from '@/components/ui/lazy-charts'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { castJson } from '@/lib/supabase/json-utils'
import type { OpinionScaleQuestionConfig } from '@veritio/study-types/study-flow-types'

interface StackedBarLikertProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface LikertResponse {
  value: number
}

// Color scale from negative (red) to positive (green)
const LIKERT_COLORS_5 = ['#ef4444', '#f97316', '#fbbf24', '#84cc16', '#22c55e']
const LIKERT_COLORS_7 = ['#ef4444', '#f97316', '#fb923c', '#fbbf24', '#a3e635', '#84cc16', '#22c55e']

export function StackedBarLikert({
  question,
  responses,
}: StackedBarLikertProps) {
  const config = castJson<OpinionScaleQuestionConfig>(question.config, { scalePoints: 5, scaleType: 'numerical' })
  const scalePoints = config?.scalePoints || 5
  const leftLabel = config?.leftLabel || 'Strongly Disagree'
  const rightLabel = config?.rightLabel || 'Strongly Agree'
  const colors = scalePoints === 7 ? LIKERT_COLORS_7 : LIKERT_COLORS_5

  const { chartData, labels, total, average } = useMemo(() => {
    const counts = new Map<number, number>()

    for (let i = 1; i <= scalePoints; i++) {
      counts.set(i, 0)
    }

    let sum = 0
    let count = 0
    for (const response of responses) {
      const raw = response.response_value
      // Handle both { value: number } (correct format) and plain number (legacy)
      let scaleValue: number | null = null
      if (typeof raw === 'number') {
        scaleValue = raw
      } else if (typeof raw === 'object' && raw !== null && 'value' in raw) {
        const objValue = (raw as unknown as LikertResponse).value
        if (typeof objValue === 'number') scaleValue = objValue
      }
      if (scaleValue !== null) {
        counts.set(scaleValue, (counts.get(scaleValue) || 0) + 1)
        sum += scaleValue
        count++
      }
    }

    const total = count
    const average = count > 0 ? (sum / count).toFixed(2) : '0'

    const dataPoint: Record<string, number | string> = { name: 'Responses' }
    const labels: string[] = []

    for (let i = 1; i <= scalePoints; i++) {
      const key = `scale${i}`
      dataPoint[key] = counts.get(i) || 0

      if (i === 1) labels.push(leftLabel)
      else if (i === scalePoints) labels.push(rightLabel)
      else labels.push(String(i))
    }

    return { chartData: [dataPoint], labels, total, average }
  }, [responses, scalePoints, leftLabel, rightLabel])

  if (responses.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">No responses yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Average: <span className="font-semibold text-foreground">{average}</span> / {scalePoints}
        </span>
        <span className="text-muted-foreground">
          Total responses: <span className="font-semibold text-foreground">{total}</span>
        </span>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground px-2">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>

      <div className="w-full h-[80px]" style={{ contain: 'layout' }}>
        <Suspense fallback={<ChartLoadingSkeleton height={80} />}>
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyBarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <LazyXAxis type="number" hide />
              <LazyYAxis type="category" dataKey="name" hide />
              <LazyTooltip
                formatter={(value, name) => {
                  const v = (value as number) ?? 0
                  const scaleNum = parseInt((name as string).replace('scale', ''))
                  const percentage = total > 0 ? ((v / total) * 100).toFixed(1) : 0
                  return [`${v} (${percentage}%)`, labels[scaleNum - 1] || `Scale ${scaleNum}`]
                }}
              />
              {Array.from({ length: scalePoints }, (_, i) => (
                <LazyBar
                  key={`scale${i + 1}`}
                  dataKey={`scale${i + 1}`}
                  stackId="stack"
                  fill={colors[i]}
                />
              ))}
            </LazyBarChart>
          </LazyResponsiveContainer>
        </Suspense>
      </div>

      <div className="flex flex-wrap justify-center gap-3 text-xs">
        {Array.from({ length: scalePoints }, (_, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: colors[i] }}
            />
            <span className="text-muted-foreground">{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
