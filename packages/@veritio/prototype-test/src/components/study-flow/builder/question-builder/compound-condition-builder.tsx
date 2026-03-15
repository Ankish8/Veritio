'use client'

import { useState } from 'react'
import { Button } from '@veritio/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui'
import { Input } from '@veritio/ui'
import { Plus, X } from 'lucide-react'
import { cn } from '@veritio/ui'
import type {
  ScreeningCondition,
  ScreeningConditionOperator,
  StudyFlowQuestion,
  QuestionType,
  ChoiceOption,
  MultipleChoiceQuestionConfig,
  OpinionScaleQuestionConfig,
  YesNoQuestionConfig,
} from '../../../../lib/supabase/study-flow-types'
import { getOperatorsForQuestionType } from '@veritio/prototype-test/lib/study-flow/condition-evaluator'

interface CompoundConditionBuilderProps {
  conditions: ScreeningCondition[]
  matchAll: boolean
  availableQuestions: StudyFlowQuestion[]
  onConditionsChange: (conditions: ScreeningCondition[], matchAll: boolean) => void
  maxConditions?: number
  disabled?: boolean
}
export function CompoundConditionBuilder({
  conditions,
  matchAll,
  availableQuestions,
  onConditionsChange,
  maxConditions = 3,
  disabled = false,
}: CompoundConditionBuilderProps) {
  const canAddMore = conditions.length < maxConditions && availableQuestions.length > 0
  const handleAddCondition = () => {
    if (!canAddMore) return

    const firstQuestion = availableQuestions[0]
    const newCondition: ScreeningCondition = {
      id: crypto.randomUUID(),
      questionId: firstQuestion?.id || '',
      operator: 'is',
      value: '',
    }

    onConditionsChange([...conditions, newCondition], matchAll)
  }

  const handleUpdateCondition = (id: string, updates: Partial<ScreeningCondition>) => {
    const updatedConditions = conditions.map((cond) =>
      cond.id === id ? { ...cond, ...updates } : cond
    )
    onConditionsChange(updatedConditions, matchAll)
  }
  const handleRemoveCondition = (id: string) => {
    const filteredConditions = conditions.filter((cond) => cond.id !== id)
    onConditionsChange(filteredConditions, matchAll)
  }
  const handleToggleMatchAll = () => {
    onConditionsChange(conditions, !matchAll)
  }

  if (conditions.length === 0) {
    return (
      <div className="pl-8 pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddCondition}
          disabled={disabled || availableQuestions.length === 0}
          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          <Plus className="h-3 w-3" />
          Add condition
        </Button>
      </div>
    )
  }

  return (
    <div className="pl-8 space-y-2 pt-1">
      {/* Contextual label explaining what conditions mean */}
      <div className="text-xs text-muted-foreground font-medium">
        only if:
      </div>

      {conditions.map((condition, index) => (
        <div key={condition.id}>
          {/* AND/OR Toggle between conditions */}
          {index > 0 && (
            <div className="flex items-center gap-2 py-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleMatchAll}
                disabled={disabled}
                className={cn(
                  'h-6 px-3 text-xs font-medium rounded-full',
                  matchAll
                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                )}
              >
                {matchAll ? 'AND' : 'OR'}
              </Button>
            </div>
          )}

          {/* Condition Row */}
          <ConditionRow
            condition={condition}
            availableQuestions={availableQuestions}
            onUpdate={(updates) => handleUpdateCondition(condition.id, updates)}
            onRemove={() => handleRemoveCondition(condition.id)}
            disabled={disabled}
          />
        </div>
      ))}

      {/* Add Condition Button - only show counter when approaching limit */}
      {canAddMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddCondition}
          disabled={disabled}
          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          <Plus className="h-3 w-3" />
          Add condition
        </Button>
      )}

      {/* Show max limit hint only when at or near the limit */}
      {conditions.length >= maxConditions && (
        <div className="text-xs text-muted-foreground">
          Maximum {maxConditions} conditions reached
        </div>
      )}
    </div>
  )
}

interface ConditionRowProps {
  condition: ScreeningCondition
  availableQuestions: StudyFlowQuestion[]
  onUpdate: (updates: Partial<ScreeningCondition>) => void
  onRemove: () => void
  disabled?: boolean
}

function ConditionRow({
  condition,
  availableQuestions,
  onUpdate,
  onRemove,
  disabled = false,
}: ConditionRowProps) {
  const selectedQuestion = availableQuestions.find((q) => q.id === condition.questionId)
  const questionType = selectedQuestion?.question_type || 'multiple_choice'
  const operators = getOperatorsForQuestionType(questionType)

  // Get options for the selected question (for choice questions)
  const questionOptions = getQuestionOptions(selectedQuestion)

  // Determine if we should show value input or value select
  const isNumericQuestion = questionType === 'opinion_scale' || questionType === 'nps' || questionType === 'slider'
  const isTextQuestion = questionType === 'single_line_text' || questionType === 'multi_line_text'
  const isChoiceQuestion = ['multiple_choice', 'yes_no'].includes(questionType)

  const handleQuestionChange = (questionId: string) => {
    const newQuestion = availableQuestions.find((q) => q.id === questionId)
    const newType = newQuestion?.question_type || 'multiple_choice'
    const newOperators = getOperatorsForQuestionType(newType)

    onUpdate({
      questionId,
      operator: newOperators[0]?.value || 'is',
      value: '', // Reset value when question changes
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 rounded-md bg-muted/50 border border-dashed">
      {/* Question Selector */}
      <Select
        value={condition.questionId}
        onValueChange={handleQuestionChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 text-xs min-w-[140px] max-w-[180px] flex-shrink-0">
          <SelectValue placeholder="Select question" />
        </SelectTrigger>
        <SelectContent>
          {availableQuestions.map((q) => (
            <SelectItem key={q.id} value={q.id} className="text-xs">
              <span className="truncate max-w-[200px] block">
                {getQuestionLabel(q)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator Selector */}
      <Select
        value={condition.operator}
        onValueChange={(value) => onUpdate({ operator: value as ScreeningConditionOperator })}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 text-xs w-[100px] flex-shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op.value} value={op.value} className="text-xs">
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value Selector/Input */}
      {isChoiceQuestion && questionOptions.length > 0 ? (
        <Select
          value={String(condition.value)}
          onValueChange={(value) => onUpdate({ value })}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-xs min-w-[120px] max-w-[160px] flex-shrink-0">
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            {questionOptions.map((opt) => (
              <SelectItem key={opt.id} value={opt.id} className="text-xs">
                <span className="truncate max-w-[150px] block">{opt.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : isNumericQuestion ? (
        <Input
          type="number"
          value={condition.value as number}
          onChange={(e) => onUpdate({ value: parseInt(e.target.value) || 0 })}
          placeholder="Value"
          className="h-8 text-xs w-[80px] flex-shrink-0"
          disabled={disabled}
        />
      ) : isTextQuestion ? (
        <Input
          type="text"
          value={String(condition.value)}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="Enter text"
          className="h-8 text-xs min-w-[100px] max-w-[140px] flex-shrink-0"
          disabled={disabled}
        />
      ) : (
        <Input
          type="text"
          value={String(condition.value)}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="Value"
          className="h-8 text-xs w-[100px] flex-shrink-0"
          disabled={disabled}
        />
      )}

      {/* Remove Button - pushed to the end */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={disabled}
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive ml-auto"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function getQuestionLabel(question: StudyFlowQuestion): string {
  const text = question.question_text || 'Untitled question'
  // Strip HTML tags if present
  const plainText = text.replace(/<[^>]*>/g, '')
  return plainText.length > 40 ? plainText.substring(0, 40) + '...' : plainText
}

function getQuestionOptions(question: StudyFlowQuestion | undefined): ChoiceOption[] {
  if (!question) return []

  const config = question.config as unknown as
    | MultipleChoiceQuestionConfig
    | OpinionScaleQuestionConfig
    | YesNoQuestionConfig

  // For multiple choice questions, return their options
  if (question.question_type === 'multiple_choice') {
    const mcConfig = config as MultipleChoiceQuestionConfig
    return mcConfig.options || []
  }

  // For yes/no, create synthetic options
  if (question.question_type === 'yes_no') {
    const ynConfig = config as YesNoQuestionConfig
    return [
      { id: 'yes', label: ynConfig.yesLabel || 'Yes' },
      { id: 'no', label: ynConfig.noLabel || 'No' },
    ]
  }

  // For opinion_scale, create synthetic options from scale points
  if (question.question_type === 'opinion_scale') {
    const osConfig = config as OpinionScaleQuestionConfig
    const startValue = osConfig.startAtZero ? 0 : 1
    const scalePoints = osConfig.scalePoints || 5
    const endValue = startValue + scalePoints - 1
    const middleValue = Math.floor((startValue + endValue) / 2)

    return Array.from({ length: scalePoints }, (_, i) => {
      const value = startValue + i
      // Use left/middle/right labels where appropriate
      let label = String(value)
      if (value === startValue && osConfig.leftLabel) label = osConfig.leftLabel
      else if (value === endValue && osConfig.rightLabel) label = osConfig.rightLabel
      else if (value === middleValue && osConfig.middleLabel) label = osConfig.middleLabel
      return { id: String(value), label: `${value} - ${label}` }
    })
  }

  // For NPS, create 0-10 options
  if (question.question_type === 'nps') {
    return Array.from({ length: 11 }, (_, i) => ({
      id: String(i),
      label: String(i),
    }))
  }

  // For slider, no predefined options - uses numeric input
  // (slider values are continuous within min/max range)

  return []
}

export type { CompoundConditionBuilderProps }
