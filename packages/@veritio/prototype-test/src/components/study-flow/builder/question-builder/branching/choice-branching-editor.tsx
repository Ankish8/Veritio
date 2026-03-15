'use client'

import { memo, useCallback } from 'react'
import { Label } from '@veritio/ui/components/label'
import { cn } from '@veritio/ui'
import type {
  StudyFlowQuestion,
  BranchingLogic,
  BranchTarget,
  MultipleChoiceQuestionConfig,
  YesNoQuestionConfig,
} from '../../../../../lib/supabase/study-flow-types'
import { BranchTargetSelector } from './branch-target-selector'
import { DefaultTargetSection } from './default-target-section'

type ChoiceConfig = MultipleChoiceQuestionConfig | YesNoQuestionConfig

function getChoiceOptions(
  config: ChoiceConfig,
  questionType: string
): { id: string; label: string }[] {
  if (questionType === 'yes_no') {
    const yesNoConfig = config as YesNoQuestionConfig
    return [
      { id: 'yes', label: yesNoConfig.yesLabel || 'Yes' },
      { id: 'no', label: yesNoConfig.noLabel || 'No' },
    ]
  }
  return (config as MultipleChoiceQuestionConfig).options || []
}

export interface ChoiceBranchingEditorProps {
  question: StudyFlowQuestion
  logic: BranchingLogic
  onChange: (logic: BranchingLogic) => void
}
export const ChoiceBranchingEditor = memo(function ChoiceBranchingEditor({
  question,
  logic,
  onChange,
}: ChoiceBranchingEditorProps) {
  const config = question.config as ChoiceConfig
  const options = getChoiceOptions(config, question.question_type)

  const updateRule = useCallback(
    (optionId: string, target: BranchTarget) => {
      const existingRuleIndex = logic.rules.findIndex((r) => r.optionId === optionId)

      if (target === logic.defaultTarget) {
        // Remove rule if it matches default
        onChange({
          ...logic,
          rules: logic.rules.filter((r) => r.optionId !== optionId),
        })
      } else if (existingRuleIndex >= 0) {
        // Update existing rule
        const newRules = [...logic.rules]
        newRules[existingRuleIndex] = { optionId, target }
        onChange({ ...logic, rules: newRules })
      } else {
        // Add new rule
        onChange({
          ...logic,
          rules: [...logic.rules, { optionId, target }],
        })
      }
    },
    [logic, onChange]
  )

  const getTargetForOption = useCallback(
    (optionId: string): BranchTarget => {
      const rule = logic.rules.find((r) => r.optionId === optionId)
      return rule?.target || logic.defaultTarget
    },
    [logic.rules, logic.defaultTarget]
  )

  const handleDefaultChange = useCallback(
    (target: BranchTarget) => {
      onChange({ ...logic, defaultTarget: target })
    },
    [logic, onChange]
  )

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          For each answer option, specify the action:
        </Label>

        <div className="space-y-2">
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Add options to the question first to configure conditions.
            </p>
          ) : (
            options.map((option) => {
              const target = getTargetForOption(option.id)
              return (
                <div
                  key={option.id}
                  className={cn(
                    'flex items-center justify-between gap-4 p-3 rounded-lg border',
                    target === 'reject' && 'bg-red-50 border-red-200',
                    target === 'go_to_study' && 'bg-blue-50 border-blue-200',
                    target === 'next' && 'bg-background'
                  )}
                >
                  <span className="text-sm font-medium flex-1 truncate">
                    {option.label || 'Untitled option'}
                  </span>
                  <BranchTargetSelector
                    value={target}
                    onChange={(value) => updateRule(option.id, value)}
                  />
                </div>
              )
            })
          )}
        </div>
      </div>

      <DefaultTargetSection value={logic.defaultTarget} onChange={handleDefaultChange} />
    </div>
  )
})
