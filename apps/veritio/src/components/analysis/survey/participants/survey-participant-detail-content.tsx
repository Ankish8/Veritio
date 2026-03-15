'use client'

import { useMemo } from 'react'
import { MessageSquare } from 'lucide-react'
import { QuestionResponseCard } from '@/components/analysis/shared'
import { AiFollowupResponsesPanel } from '../ai-followup-responses-panel'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'

interface SurveyParticipantDetailContentProps {
  /** Study ID for evidence marking */
  studyId: string
  /** Number of questions answered by this participant */
  questionsAnswered: number
  /** Total number of survey questions */
  questionsTotal: number
  /** Flow responses for this participant */
  flowResponses: StudyFlowResponseRow[]
  /** All flow questions (will filter to survey section) */
  flowQuestions: StudyFlowQuestionRow[]
}

/**
 * Displays survey question responses for a participant.
 *
 * Filters to only show survey section questions and renders them
 * using the shared QuestionResponseCard component.
 */
export function SurveyParticipantDetailContent({
  studyId,
  questionsAnswered,
  questionsTotal,
  flowResponses,
  flowQuestions,
}: SurveyParticipantDetailContentProps) {
  // Build response map for quick lookup
  const responseMap = useMemo(() => {
    const map = new Map<string, StudyFlowResponseRow>()
    for (const response of flowResponses) {
      map.set(response.question_id, response)
    }
    return map
  }, [flowResponses])

  // Get only survey section questions
  const surveyQuestions = useMemo(
    () => flowQuestions.filter((q) => q.section === 'survey'),
    [flowQuestions]
  )

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Question Responses ({questionsAnswered} of {questionsTotal})
      </h3>

      {surveyQuestions.length > 0 ? (
        <div className="space-y-3">
          {surveyQuestions.map((question, index) => {
            const response = responseMap.get(question.id)
            return (
              <div key={question.id}>
                <QuestionResponseCard
                  studyId={studyId}
                  sourceType="survey_response"
                  question={question}
                  response={response}
                  index={index}
                />
                {flowResponses[0]?.participant_id && (
                  <AiFollowupResponsesPanel studyId={studyId} questionId={question.id} participantId={flowResponses[0].participant_id} />
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8 bg-muted/30 rounded-lg">
          No survey questions found
        </div>
      )}
    </div>
  )
}
