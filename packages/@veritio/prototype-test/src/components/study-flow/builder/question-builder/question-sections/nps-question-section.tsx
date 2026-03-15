'use client'

import { memo } from 'react'
import type { StudyFlowQuestion, SurveyCustomSection, SurveyNumericBranchingLogic, NPSQuestionConfig } from '../../../../../lib/supabase/study-flow-types'
import { NPSConfig } from '../type-configs'
import { NumericBranchingEditor } from '../../inline-logic'

export interface NPSQuestionSectionProps {
  questionId: string
  question: StudyFlowQuestion
  onUpdate: (updates: Partial<StudyFlowQuestion>) => void
  isInSurvey: boolean
  allQuestions: StudyFlowQuestion[]
  customSections: SurveyCustomSection[]
}
export const NPSQuestionSection = memo(function NPSQuestionSection({
  questionId,
  question,
  onUpdate,
  isInSurvey,
  allQuestions,
  customSections,
}: NPSQuestionSectionProps) {
  const config = question.config as NPSQuestionConfig

  return (
    <div className="space-y-4">
      <NPSConfig
        questionId={questionId}
        config={config}
        onChange={(configUpdates) => {
          onUpdate({ config: { ...config, ...configUpdates } })
        }}
      />

      {isInSurvey && (
        <div className="pt-4 border-t">
          <NumericBranchingEditor
            branchingLogic={question.survey_branching_logic as SurveyNumericBranchingLogic | null}
            onBranchingLogicChange={(logic) => onUpdate({ survey_branching_logic: logic })}
            allQuestions={allQuestions}
            customSections={customSections}
            currentQuestionId={question.id}
            currentSectionId={question.custom_section_id}
            currentQuestionPosition={question.position}
            flowSection={question.section}
            minValue={0}
            maxValue={10}
            valueLabel="score"
          />
        </div>
      )}
    </div>
  )
})
