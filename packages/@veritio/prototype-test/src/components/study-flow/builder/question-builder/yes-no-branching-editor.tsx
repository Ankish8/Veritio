'use client'

import { memo, useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { ArrowRight, Ban } from 'lucide-react'
import { cn } from '@veritio/ui'
import type {
  StudyFlowQuestion,
  BranchingLogic,
  BranchTarget,
  YesNoQuestionConfig,
} from '../../../../lib/supabase/study-flow-types'
const BRANCH_TARGET_OPTIONS = [
  {
    value: 'next' as const,
    label: 'Next question',
    icon: ArrowRight,
    rowClassName: '',
  },
  {
    value: 'reject' as const,
    label: 'Reject',
    icon: Ban,
    rowClassName: 'bg-red-50/50 border-red-200/50',
  },
]

interface YesNoBranchingEditorProps {
  question: StudyFlowQuestion
  logic: BranchingLogic
  onChange: (logic: BranchingLogic) => void
}
export const YesNoBranchingEditor = memo(function YesNoBranchingEditor({
  question,
  logic,
  onChange,
}: YesNoBranchingEditorProps) {
  const config = question.config as YesNoQuestionConfig

  // Fixed options for Yes/No questions
  const options = [
    { id: 'yes', label: config.yesLabel || 'Yes' },
    { id: 'no', label: config.noLabel || 'No' },
  ]

  const rules = logic.rules || []
  const defaultTarget = logic.defaultTarget || 'next'

  const updateRule = useCallback(
    (optionId: string, target: BranchTarget) => {
      const currentRules = logic.rules || []
      const currentDefault = logic.defaultTarget || 'next'
      const existingRuleIndex = currentRules.findIndex((r) => r.optionId === optionId)

      if (target === currentDefault) {
        // Remove rule if it matches default
        onChange({
          ...logic,
          rules: currentRules.filter((r) => r.optionId !== optionId),
        })
      } else if (existingRuleIndex >= 0) {
        // Update existing rule
        const newRules = [...currentRules]
        newRules[existingRuleIndex] = { optionId, target }
        onChange({ ...logic, rules: newRules })
      } else {
        // Add new rule
        onChange({
          ...logic,
          rules: [...currentRules, { optionId, target }],
        })
      }
    },
    [logic, onChange]
  )

  const getTargetForOption = useCallback(
    (optionId: string): BranchTarget => {
      const rule = rules.find((r) => r.optionId === optionId)
      return rule?.target || defaultTarget
    },
    [rules, defaultTarget]
  )

  return (
    <div className="space-y-2">
      {options.map((option, index) => {
        const target = getTargetForOption(option.id)
        const targetInfo = BRANCH_TARGET_OPTIONS.find((t) => t.value === target)
        const rowClassName = targetInfo?.rowClassName || ''

        return (
          <div
            key={option.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border transition-colors',
              rowClassName
            )}
          >
            {/* Option Label (fixed, not editable) */}
            <span className="text-sm font-medium flex-1">
              {option.label}
            </span>

            {/* "then" text */}
            <span className="text-sm text-muted-foreground">then</span>

            {/* Branch Target Dropdown */}
            <Select
              value={target}
              onValueChange={(value) => updateRule(option.id, value as BranchTarget)}
            >
              <SelectTrigger className="w-auto min-w-fit h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BRANCH_TARGET_OPTIONS.map((targetOption) => {
                  const Icon = targetOption.icon
                  return (
                    <SelectItem key={targetOption.value} value={targetOption.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{targetOption.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        )
      })}
    </div>
  )
})
