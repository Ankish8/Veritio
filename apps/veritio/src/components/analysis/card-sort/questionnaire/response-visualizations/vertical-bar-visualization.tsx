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
import type { QuestionType } from '@veritio/study-types/study-flow-types'
import { extractChoiceConfig, countChoiceResponses } from './choice-utils'
import { STATUS_COLORS, CHART_COLORS } from '@/lib/colors'

interface VerticalBarVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
  questionType: QuestionType
}

export const VerticalBarVisualization = React.memo(function VerticalBarVisualization({
  question,
  responses,
  questionType,
}: VerticalBarVisualizationProps) {
  const isYesNo = questionType === 'yes_no'

  const config = useMemo(
    () => extractChoiceConfig(question, questionType),
    [question, questionType]
  )

  const chartData = useMemo(() => {
    const { counts, otherCount } = countChoiceResponses(responses, config, isYesNo)
    const totalResponses = responses.length

    const data = config.options.map(opt => ({
      name: opt.label,
      count: counts.get(opt.id) || 0,
      percentage: totalResponses > 0
        ? Math.round(((counts.get(opt.id) || 0) / totalResponses) * 100)
        : 0,
    }))

    if (config.allowOther && otherCount > 0) {
      data.push({
        name: config.otherLabel,
        count: otherCount,
        percentage: totalResponses > 0
          ? Math.round((otherCount / totalResponses) * 100)
          : 0,
      })
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

  return (
    <div className="w-full h-[300px]" data-pdf-chart="vertical-bar" style={{ contain: 'layout' }}>
      <Suspense fallback={<ChartLoadingSkeleton height={300} />}>
        <LazyResponsiveContainer width="100%" height="100%">
          <LazyBarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <LazyCartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.axisStroke} />
            <LazyXAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              interval={0}
              height={80}
            />
            <LazyYAxis
              tick={{ fontSize: 12 }}
              allowDecimals={false}
            />
            <LazyTooltip
              formatter={(value, name) => {
                const v = (value as number) ?? 0
                if (name === 'count') {
                  const item = chartData.find(d => d.count === v)
                  return [`${v} (${item?.percentage || 0}%)`, 'Responses']
                }
                return [v, name]
              }}
            />
            <LazyBar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <LazyCell key={`cell-${index}`} fill={STATUS_COLORS.successBright} />
              ))}
            </LazyBar>
          </LazyBarChart>
        </LazyResponsiveContainer>
      </Suspense>
    </div>
  )
})
