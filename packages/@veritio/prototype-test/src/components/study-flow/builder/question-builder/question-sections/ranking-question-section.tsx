'use client'

import { memo, useCallback } from 'react'
import type {
  StudyFlowQuestion,
  RankingQuestionConfig,
  SurveyCustomSection,
  EnhancedSurveyBranchingLogic,
} from '../../../../../lib/supabase/study-flow-types'
import { RankingConfig } from '../type-configs'
import { EnhancedBranchingEditor } from '../../inline-logic'

export interface RankingQuestionSectionProps {
  question: StudyFlowQuestion
  onUpdate: (updates: Partial<StudyFlowQuestion>) => void
  isInSurvey?: boolean
  allQuestions?: StudyFlowQuestion[]
  customSections?: SurveyCustomSection[]
}
export const RankingQuestionSection = memo(function RankingQuestionSection({
  question,
  onUpdate,
  isInSurvey = false,
  allQuestions = [],
  customSections = [],
}: RankingQuestionSectionProps) {
  const config = question.config as RankingQuestionConfig

  const handleConfigChange = useCallback(
    (updates: Partial<RankingQuestionConfig>) => {
      onUpdate({ config: { ...config, ...updates } })
    },
    [config, onUpdate]
  )

  return (
    <div className="space-y-4">
      <RankingConfig config={config} onChange={handleConfigChange} />

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
