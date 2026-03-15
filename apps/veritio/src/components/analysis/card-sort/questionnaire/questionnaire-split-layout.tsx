'use client'

import { QuestionDisplay } from './question-display'
import type { Participant, StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type { FlowSection } from '@veritio/study-types/study-flow-types'

interface QuestionnaireSplitLayoutProps {
  studyId: string
  section: FlowSection
  questions: StudyFlowQuestionRow[]
  responses: StudyFlowResponseRow[]
  participants: Participant[]
  filteredParticipantIds: Set<string> | null
  hideEmptyResponses: boolean
}

export function QuestionnaireSplitLayout({
  studyId: _studyId,
  section: _section,
  questions,
  responses,
  participants,
  filteredParticipantIds,
  hideEmptyResponses,
}: QuestionnaireSplitLayoutProps) {
  return (
    <div>
      {questions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No questions in this section</p>
        </div>
      ) : (
        <div className="space-y-0">
          {questions.map((question, index) => (
            <QuestionDisplay
              key={question.id}
              question={question}
              responses={responses}
              participants={participants}
              questionIndex={index + 1}
              filteredParticipantIds={filteredParticipantIds}
              hideEmptyResponses={hideEmptyResponses}
            />
          ))}
        </div>
      )}
    </div>
  )
}
