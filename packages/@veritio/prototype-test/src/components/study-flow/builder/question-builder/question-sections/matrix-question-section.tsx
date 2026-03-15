'use client'

import { memo, useCallback } from 'react'
import type {
  StudyFlowQuestion,
  MatrixQuestionConfig,
  SurveyCustomSection,
  EnhancedSurveyBranchingLogic,
} from '../../../../../lib/supabase/study-flow-types'
import { MatrixConfig } from '../type-configs'
import { EnhancedBranchingEditor } from '../../inline-logic'

export interface MatrixQuestionSectionProps {
  question: StudyFlowQuestion
  onUpdate: (updates: Partial<StudyFlowQuestion>) => void
  isInSurvey?: boolean
  allQuestions?: StudyFlowQuestion[]
  customSections?: SurveyCustomSection[]
}
export const MatrixQuestionSection = memo(function MatrixQuestionSection({
  question,
  onUpdate,
  isInSurvey = false,
  allQuestions = [],
  customSections = [],
}: MatrixQuestionSectionProps) {
  const config = question.config as MatrixQuestionConfig

  const handleConfigChange = useCallback(
    (updates: Partial<MatrixQuestionConfig>) => {
      onUpdate({ config: { ...config, ...updates } })
    },
    [config, onUpdate]
  )

  return (
    <div className="space-y-4">
      <MatrixConfig config={config} onChange={handleConfigChange} />

      {isInSurvey && (
        <EnhancedBranchingEditor
          question={question}
          branchingLogic={question.survey_branching_logic as EnhancedSurveyBranchingLogic | null}
          onBranchingLogicChange={(logic) => onUpdate({ survey_branching_logic: logic })}
          allQuestions={allQuestions}
          customSections={customSections}
          currentQuestionId={question.id}
          currentSectionId={question.custom_section_id}
          currentQuestionPosition={question.position}
          flowSection={question.section}
        />
      )}
    </div>
  )
})
