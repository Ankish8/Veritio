'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSurveyFlowResponses } from '@/hooks/use-survey-flow-responses'
import type { Participant, StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'

import { ParticipantsStatsSection } from './participants-stats-section'
import { QuestionCompletionChart } from './question-completion-chart'
import { QuestionTypesSummary } from './question-types-summary'

interface SurveyResultsOverviewProps {
  studyId: string
  stats: {
    totalParticipants: number
    completedParticipants: number
    abandonedParticipants: number
    completionRate: number
    avgCompletionTimeMs: number
  }
  participants: Participant[]
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
}

export function SurveyResultsOverview({
  studyId,
  stats,
  participants,
  flowQuestions,
  flowResponses: initialFlowResponses,
}: SurveyResultsOverviewProps) {
  // Lazy load flow responses if not provided (overview endpoints return empty array)
  const { flowResponses: lazyFlowResponses } = useSurveyFlowResponses(
    initialFlowResponses.length === 0 ? studyId : null
  )
  const flowResponses = initialFlowResponses.length > 0 ? initialFlowResponses : lazyFlowResponses

  return (
    <div className="space-y-6 sm:space-y-8">
      <ParticipantsStatsSection stats={stats} participants={participants} />

      <section>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Survey Questions</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-10">
          <Card className="md:col-span-2 lg:col-span-7">
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
