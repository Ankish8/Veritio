'use client'

import { useMemo, Suspense } from 'react'
import { ClipboardList } from 'lucide-react'
import {
  LazyResponsiveContainer,
  LazyBarChart,
  LazyBar,
  LazyXAxis,
  LazyYAxis,
  LazyTooltip,
  ChartLoadingSkeleton,
  ChartWrapper,
} from '@/components/ui/lazy-charts'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { stripPipingHtml } from '@/lib/utils'
import { STATUS_COLORS, CHART_COLORS } from '@/lib/colors'

interface QuestionCompletionChartProps {
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  totalParticipants: number
}

function buildChartData(
  flowQuestions: StudyFlowQuestionRow[],
  flowResponses: StudyFlowResponseRow[],
  totalParticipants: number
) {
  if (!flowQuestions || flowQuestions.length === 0 || totalParticipants === 0) {
    return { chartData: [], totalSurveyQuestions: 0 }
  }

  const surveyQuestions = flowQuestions.filter(q => q.section === 'survey')
  const totalSurveyQuestions = surveyQuestions.length

  const chartData = surveyQuestions.slice(0, 10).map((question, idx) => {
    const responseCount = flowResponses.filter(r => r.question_id === question.id).length
    const completionRate = Math.round((responseCount / totalParticipants) * 100)

    return {
      questionNum: idx + 1,
      label: stripPipingHtml(question.question_text) || `Q${idx + 1}`,
      responses: responseCount,
      percentage: completionRate,
    }
  })

  return { chartData, totalSurveyQuestions }
}

export function QuestionCompletionChart({
  flowQuestions,
  flowResponses,
  totalParticipants,
}: QuestionCompletionChartProps) {
  const { chartData, totalSurveyQuestions } = useMemo(
    () => buildChartData(flowQuestions, flowResponses, totalParticipants),
    [flowQuestions, flowResponses, totalParticipants]
  )

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          Waiting for survey responses to come in.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Response rate across your first <span className="font-medium text-foreground">{chartData.length} questions</span>{totalSurveyQuestions > chartData.length ? ` of ${totalSurveyQuestions}` : ''}.
      </p>
      <ChartWrapper height={220} className="h-[180px] sm:h-[200px] lg:h-[220px]">
        <Suspense fallback={<ChartLoadingSkeleton height={200} />}>
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyBarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
              <LazyXAxis
                dataKey="questionNum"
                axisLine={{ stroke: CHART_COLORS.axisStroke }}
                tickLine={false}
                tick={{ fontSize: 11, fill: CHART_COLORS.tickFill }}
                label={{
                  value: 'Question',
                  position: 'bottom',
                  offset: 10,
                  style: { fontSize: 11, fill: CHART_COLORS.tickFill },
                }}
              />
              <LazyYAxis
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
                axisLine={{ stroke: CHART_COLORS.axisStroke }}
                tickLine={false}
                tick={{ fontSize: 11, fill: CHART_COLORS.tickFill }}
                label={{
                  value: '% completion',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  style: { fontSize: 11, fill: CHART_COLORS.tickFill, textAnchor: 'middle' },
                }}
                width={50}
              />
              <LazyTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-popover border rounded-md px-3 py-2 shadow-md">
                        <p className="text-sm font-medium">{data.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {data.responses} responses ({data.percentage}%)
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <LazyBar dataKey="percentage" fill={STATUS_COLORS.success} radius={[2, 2, 0, 0]} maxBarSize={24} />
            </LazyBarChart>
          </LazyResponsiveContainer>
        </Suspense>
      </ChartWrapper>
    </div>
  )
}
