'use client'

/**
 * Public Survey Overview
 *
 * Read-only version of the Survey results overview for public results sharing.
 * Shows participant stats, completion chart, and question types breakdown.
 */

import { useMemo, Suspense } from 'react'
import { STATUS_COLORS, CHART_COLORS } from '@/lib/colors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, BarChart3 } from 'lucide-react'
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
import { CompletionDisplay, TimeDisplay, DeviceInfoDisplay } from '@/components/analysis/shared'
import { stripPipingHtml } from '@/lib/utils'
import type { Participant, StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'

interface PublicSurveyOverviewProps {
  stats: {
    totalParticipants: number
    completedParticipants: number
    avgCompletionTimeMs: number
  }
  participants: Participant[]
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
}

// Question Completion Chart
function QuestionCompletionChart({
  flowQuestions,
  flowResponses,
  totalParticipants
}: {
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  totalParticipants: number
}) {
  const chartData = useMemo(() => {
    if (!flowQuestions || flowQuestions.length === 0 || totalParticipants === 0) return []

    // Filter to only survey questions (section = 'survey')
    const surveyQuestions = flowQuestions.filter(q => q.section === 'survey')

    return surveyQuestions.slice(0, 10).map((question, idx) => {
      // Count responses for this question
      const responseCount = flowResponses.filter(r => r.question_id === question.id).length
      const completionRate = Math.round((responseCount / totalParticipants) * 100)

      return {
        questionNum: idx + 1,
        label: stripPipingHtml(question.question_text) || `Q${idx + 1}`,
        responses: responseCount,
        percentage: completionRate
      }
    })
  }, [flowQuestions, flowResponses, totalParticipants])

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          No survey responses yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Response rate across your first <span className="font-medium text-foreground">{chartData.length} questions</span>.
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
                  style: { fontSize: 11, fill: CHART_COLORS.tickFill }
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
                  style: { fontSize: 11, fill: CHART_COLORS.tickFill, textAnchor: 'middle' }
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

// Question Types Summary
function QuestionTypesSummary({ flowQuestions }: { flowQuestions: StudyFlowQuestionRow[] }) {
  const summary = useMemo(() => {
    if (!flowQuestions || flowQuestions.length === 0) return null

    // Filter to only survey questions
    const surveyQuestions = flowQuestions.filter(q => q.section === 'survey')

    // Group by question type
    const typeCounts: Record<string, number> = {}
    surveyQuestions.forEach(q => {
      const type = q.question_type || 'unknown'
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })

    // Labels matching actual QuestionType enum
    const typeLabels: Record<string, string> = {
      single_line_text: 'Short Text',
      multi_line_text: 'Long Text',
      multiple_choice: 'Multiple Choice',
      opinion_scale: 'Opinion Scale',
      yes_no: 'Yes/No',
      nps: 'NPS',
      matrix: 'Matrix',
      ranking: 'Ranking',
      unknown: 'Other'
    }

    return Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        label: typeLabels[type] || type,
        count
      }))
      .sort((a, b) => b.count - a.count)
  }, [flowQuestions])

  if (!summary || summary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          No survey questions configured.
        </p>
      </div>
    )
  }

  const totalQuestions = summary.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Survey has <span className="font-medium text-foreground">{totalQuestions} questions</span> across{' '}
        <span className="font-medium text-foreground">{summary.length} types</span>.
      </p>
      <div className="space-y-2">
        {summary.slice(0, 5).map(item => (
          <div key={item.type} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="text-sm font-medium">{item.count}</span>
          </div>
        ))}
        {summary.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{summary.length - 5} more types
          </p>
        )}
      </div>
    </div>
  )
}

export function PublicSurveyOverview({
  stats,
  participants,
  flowQuestions,
  flowResponses
}: PublicSurveyOverviewProps) {
  // Compute times array for TimeDisplay from participants
  const times = useMemo(() => {
    if (!participants || participants.length === 0) return []
    return participants
      .filter(p => p.completed_at && p.started_at)
      .map(p => {
        const start = new Date(p.started_at!).getTime()
        const end = new Date(p.completed_at!).getTime()
        return end - start
      })
      .filter(t => t > 0)
  }, [participants])

  const timeMessage = useMemo(() => {
    if (!participants || participants.length === 0) {
      return "No completion time data available."
    }
    if (times.length === 0) return "Waiting for completion time data."
    return null
  }, [participants, times])

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Participants Section */}
      <section>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Participants</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Completion Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <CompletionDisplay
                completed={stats.completedParticipants}
                total={stats.totalParticipants}
              />
            </CardContent>
          </Card>

          {/* Time Taken Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Time taken</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeDisplay avgMs={stats.avgCompletionTimeMs} times={times} />
              {timeMessage && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {timeMessage}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Device Info Card */}
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Device Info</CardTitle>
            </CardHeader>
            <CardContent>
              <DeviceInfoDisplay participants={participants as any || []} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Survey Questions Section */}
      <section>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Survey Questions</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-10">
          {/* Question Completion Chart - full width on mobile, 70% on lg+ */}
          <Card className="lg:col-span-7">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Response rate by question</CardTitle>
            </CardHeader>
            <CardContent>
              <QuestionCompletionChart
                flowQuestions={flowQuestions}
                flowResponses={flowResponses}
                totalParticipants={stats.totalParticipants}
              />
            </CardContent>
          </Card>

          {/* Question Types Summary - full width on mobile, 30% on lg+ */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Question types</CardTitle>
            </CardHeader>
            <CardContent>
              <QuestionTypesSummary flowQuestions={flowQuestions} />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
