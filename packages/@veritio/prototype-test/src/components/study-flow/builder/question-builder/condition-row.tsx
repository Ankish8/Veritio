'use client'

import { Button } from '@veritio/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { Trash2 } from 'lucide-react'
import type {
  StudyFlowQuestion,
  DisplayLogicCondition,
  DisplayLogicOperator,
} from '../../../../lib/supabase/study-flow-types'
import { getOperatorsForQuestion } from '@veritio/prototype-test/lib/study-flow/display-logic-operators'
import { ValueEditor } from './value-editors'

export interface ConditionRowProps {
  condition: DisplayLogicCondition
  sourceQuestion: StudyFlowQuestion | undefined
  previousQuestions: StudyFlowQuestion[]
  onQuestionChange: (questionId: string) => void
  onOperatorChange: (operator: DisplayLogicOperator) => void
  onUpdate: (updates: Partial<DisplayLogicCondition>) => void
  onRemove: () => void
}

export function ConditionRow({
  condition,
  sourceQuestion,
  previousQuestions,
  onQuestionChange,
  onOperatorChange,
  onUpdate,
  onRemove,
}: ConditionRowProps) {
  const operators = sourceQuestion ? getOperatorsForQuestion(sourceQuestion) : []
  const currentOperator = operators.find(o => o.value === condition.operator)

  return (
    <div className="flex items-start gap-2 rounded border bg-muted/30 p-2">
      <div className="flex-1 space-y-2">
        {/* Question Selector */}
        <Select
          value={condition.questionId}
          onValueChange={onQuestionChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select question" />
          </SelectTrigger>
          <SelectContent>
            {previousQuestions.map((q) => (
              <SelectItem key={q.id} value={q.id}>
                Q{q.position + 1}: {(q.question_text || '').replace(/<[^>]*>/g, '').slice(0, 30)}...
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Operator + Value Row */}
        <div className="flex flex-wrap gap-2">
          {/* Operator Selector */}
          <Select
            value={condition.operator}
            onValueChange={(value) => onOperatorChange(value as DisplayLogicOperator)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {operators.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Value Editor */}
          {currentOperator && sourceQuestion && (
            <ValueEditor
              condition={condition}
              operator={currentOperator}
              sourceQuestion={sourceQuestion}
              onUpdate={onUpdate}
            />
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
