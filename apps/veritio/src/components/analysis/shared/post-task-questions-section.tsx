'use client'

import { QuestionDisplay } from '../card-sort/questionnaire/question-display'
import type { Participant, StudyFlowQuestionRow } from '@veritio/study-types'
import type { PostTaskData } from './post-task-data-normalizer'

interface PostTaskQuestionsSectionProps {
  postTaskData: PostTaskData
  participants: Participant[]
  filteredParticipantIds: Set<string> | null
  hideEmptyResponses: boolean
  studyId: string
}

export function PostTaskQuestionsSection({
  postTaskData,
  participants,
  filteredParticipantIds,
  hideEmptyResponses,
  studyId,
}: PostTaskQuestionsSectionProps) {
  const { tasks, questions, responses } = postTaskData

  let globalQuestionIndex = 0

  return (
    <div>
      {tasks.map((task, taskIndex) => {
        // Get questions for this task
        const taskQuestions = questions.filter(
          (q) => (q as StudyFlowQuestionRow & { _taskId?: string })._taskId === task.id
        )

        if (taskQuestions.length === 0) return null

        return (
          <div key={task.id}>
            {/* Task header */}
            <div className="flex items-center gap-3 pt-8 pb-4 first:pt-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-sm font-medium text-muted-foreground shrink-0">
                {taskIndex + 1}
              </div>
              <h3 className="text-base font-medium text-foreground">
                {task.title}
              </h3>
            </div>

            {/* Questions for this task */}
            <div className="space-y-0 pl-10">
              {taskQuestions.map((question) => {
                globalQuestionIndex++
                return (
                  <QuestionDisplay
                    key={question.id}
                    question={question}
                    responses={responses}
                    participants={participants}
                    questionIndex={globalQuestionIndex}
                    filteredParticipantIds={filteredParticipantIds}
                    hideEmptyResponses={hideEmptyResponses}
                    studyId={studyId}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
