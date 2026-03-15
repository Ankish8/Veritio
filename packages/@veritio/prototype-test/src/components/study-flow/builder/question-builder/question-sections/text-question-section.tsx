'use client'

import { memo } from 'react'
import type { StudyFlowQuestion, SurveyCustomSection, SurveyTextBranchingLogic } from '../../../../../lib/supabase/study-flow-types'
import { TextConfig } from '../type-configs'
import { TextBranchingEditor } from '../../inline-logic'
import type { TextQuestionConfig } from '../../../../../lib/supabase/study-flow-types'

export interface TextQuestionSectionProps {
  question: StudyFlowQuestion
  onUpdate: (updates: Partial<StudyFlowQuestion>) => void
  isInSurvey: boolean
  allQuestions: StudyFlowQuestion[]
  customSections: SurveyCustomSection[]
  questionId: string
}
export const TextQuestionSection = memo(function TextQuestionSection({
  question,
  onUpdate,
  isInSurvey,
  allQuestions,
  customSections,
  questionId,
}: TextQuestionSectionProps) {
  const isMultiLine = question.question_type === 'multi_line_text'
  const config = question.config as TextQuestionConfig

  return (
    <div className="space-y-4">
      <TextConfig
        questionId={questionId}
        config={config}
        onChange={(configUpdates) => {
          onUpdate({ config: { ...config, ...configUpdates } })
        }}
        isMultiLine={isMultiLine}
      />

      {isInSurvey && (
        <TextBranchingEditor
          branchingLogic={question.survey_branching_logic as SurveyTextBranchingLogic | null}
          onBranchingLogicChange={(logic) => onUpdate({ survey_branching_logic: logic })}
          allQuestions={allQuestions}
          customSections={customSections}
          currentQuestionId={question.id}
          currentSectionId={question.custom_section_id}
          currentQuestionPosition={question.position}
          flowSection={question.section}
          isRequired={question.is_required}
        />
      )}
    </div>
  )
})
