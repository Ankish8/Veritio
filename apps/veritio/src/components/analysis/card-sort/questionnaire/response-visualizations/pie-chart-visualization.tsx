'use client'

import React, { useMemo, Suspense } from 'react'
import {
  LazyPieChart,
  LazyPie,
  LazyCell,
  LazyResponsiveContainer,
  LazyLegend,
  LazyTooltip,
  PieChartLoadingSkeleton,
} from '@/components/ui/lazy-charts'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type { QuestionType } from '@veritio/study-types/study-flow-types'
import { extractChoiceConfig, countChoiceResponses } from './choice-utils'

interface PieChartVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
  questionType: QuestionType
}

const COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
]

export const PieChartVisualization = React.memo(function PieChartVisualization({
  question,
  responses,
  questionType,
}: PieChartVisualizationProps) {
  const isYesNo = questionType === 'yes_no'

  const config = useMemo(
    () => extractChoiceConfig(question, questionType),
    [question, questionType]
  )

  const chartData = useMemo(() => {
    const { counts, otherCount } = countChoiceResponses(responses, config, isYesNo)

    const data = config.options
      .map(opt => ({
        name: opt.label,
        value: counts.get(opt.id) || 0,
      }))
      .filter(item => item.value > 0)

    if (config.allowOther && otherCount > 0) {
      data.push({ name: config.otherLabel, value: otherCount })
    }

    return data
  }, [responses, config, isYesNo])

  if (config.options.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">No options configured for this question</p>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">No responses yet</p>
      </div>
    )
  }

  const totalResponses = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="w-full h-[300px]" data-pdf-chart="pie-chart" style={{ contain: 'layout' }}>
      <Suspense fallback={<PieChartLoadingSkeleton size={200} />}>
        <LazyResponsiveContainer width="100%" height="100%">
          <LazyPieChart>
            <LazyPie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
              labelLine={{ stroke: '#888', strokeWidth: 1 }}
              isAnimationActive={false}
            >
              {chartData.map((_, index) => (
                <LazyCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </LazyPie>
            <LazyTooltip
              formatter={(value) => {
                const v = (value as number) ?? 0
                return [
                  `${v} (${((v / totalResponses) * 100).toFixed(1)}%)`,
                  'Responses',
                ]
              }}
            />
            <LazyLegend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ paddingTop: '20px' }}
            />
          </LazyPieChart>
        </LazyResponsiveContainer>
      </Suspense>
    </div>
  )
})
