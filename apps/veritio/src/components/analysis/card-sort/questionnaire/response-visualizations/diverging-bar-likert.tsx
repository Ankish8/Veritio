'use client'

import { useMemo, Suspense } from 'react'
import {
  LazyBarChart,
  LazyBar,
  LazyXAxis,
  LazyYAxis,
  LazyTooltip,
  LazyResponsiveContainer,
  LazyReferenceLine,
  LazyCell,
  ChartLoadingSkeleton,
} from '@/components/ui/lazy-charts'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { castJson } from '@/lib/supabase/json-utils'
import type { OpinionScaleQuestionConfig } from '@veritio/study-types/study-flow-types'
import { LIKERT_COLORS, CHART_COLORS } from '@/lib/colors'

interface DivergingBarLikertProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface LikertResponse {
  value: number
}

/**
 * Diverging bar chart for Likert scale questions.
 * Shows negative sentiment on the left, positive on the right, with neutral in the middle.
 */
export function DivergingBarLikert({
  question,
  responses,
}: DivergingBarLikertProps) {
  const config = castJson<OpinionScaleQuestionConfig>(question.config, { scalePoints: 5, scaleType: 'numerical' })
  const scalePoints = config?.scalePoints || 5
  const leftLabel = config?.leftLabel || 'Strongly Disagree'
  const rightLabel = config?.rightLabel || 'Strongly Agree'

  const { chartData, total, average } = useMemo(() => {
    const counts = new Map<number, number>()

    // Initialize counts
    for (let i = 1; i <= scalePoints; i++) {
      counts.set(i, 0)
    }

    // Count responses
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
    const midpoint = Math.ceil(scalePoints / 2)

    // Build diverging data - negative values on left, positive on right
    const data = []
    for (let i = 1; i <= scalePoints; i++) {
      const countVal = counts.get(i) || 0
      const percentage = total > 0 ? (countVal / total) * 100 : 0

      // For diverging: values below midpoint are negative, above are positive
      // Neutral (midpoint) is split
      let divergingValue: number
      if (i < midpoint) {
        divergingValue = -percentage
      } else if (i > midpoint) {
        divergingValue = percentage
      } else {
        // Midpoint: show as small positive (neutral)
        divergingValue = percentage * 0.5
      }

      data.push({
        scale: i,
        label: getScaleLabel(i, scalePoints, leftLabel, rightLabel),
        value: divergingValue,
        count: countVal,
        percentage: percentage.toFixed(1),
        isNegative: i < midpoint,
        isNeutral: i === midpoint,
      })
    }

    return { chartData: data, total, average }
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
      {/* Summary stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Average: <span className="font-semibold text-foreground">{average}</span> / {scalePoints}
        </span>
        <span className="text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{total}</span> responses
        </span>
      </div>

      {/* Diverging axis labels */}
      <div className="flex justify-between text-xs text-muted-foreground px-4">
        <span className="text-red-500">{leftLabel}</span>
        <span className="text-gray-500">Neutral</span>
        <span className="text-green-500">{rightLabel}</span>
      </div>

      {/* Diverging bar chart */}
      <div className="w-full h-[250px]" style={{ contain: 'layout' }}>
        <Suspense fallback={<ChartLoadingSkeleton height={250} />}>
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyBarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
            >
              <LazyXAxis
                type="number"
                domain={[-100, 100]}
                tickFormatter={(value) => `${Math.abs(value)}%`}
                tick={{ fontSize: 11 }}
              />
              <LazyYAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 12 }}
                width={70}
              />
              <LazyTooltip
                formatter={(_value, _name, props) => [
                  `${(props.payload as { count: number; percentage: string }).count} responses (${(props.payload as { count: number; percentage: string }).percentage}%)`,
                  'Count',
                ]}
              />
              <LazyReferenceLine x={0} stroke={CHART_COLORS.referenceLine} strokeDasharray="3 3" />
              <LazyBar dataKey="value" radius={[4, 4, 4, 4]}>
                {chartData.map((entry, index) => (
                  <LazyCell
                    key={`cell-${index}`}
                    fill={entry.isNeutral ? LIKERT_COLORS.neutral : entry.isNegative ? LIKERT_COLORS.negative : LIKERT_COLORS.positive}
                  />
                ))}
              </LazyBar>
            </LazyBarChart>
          </LazyResponsiveContainer>
        </Suspense>
      </div>
    </div>
  )
}

function getScaleLabel(
  value: number,
  scalePoints: number,
  leftLabel: string,
  rightLabel: string
): string {
  if (value === 1) return leftLabel.split(' ').slice(0, 2).join(' ')
  if (value === scalePoints) return rightLabel.split(' ').slice(0, 2).join(' ')

  const midpoint = Math.ceil(scalePoints / 2)
  if (value === midpoint) return 'Neutral'

  return `Scale ${value}`
}
