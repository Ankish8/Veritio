'use client'

import { memo } from 'react'
import { Input } from '@veritio/ui/components/input'
import { Label } from '@veritio/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import type { StudyFlowQuestion } from '@veritio/prototype-test/lib/supabase/study-flow-types'

export interface CounterVariableConfigProps {
  questionId: string
  countValues: string[]
  choiceQuestions: StudyFlowQuestion[]
  onQuestionChange: (questionId: string) => void
  onCountValuesChange: (values: string[]) => void
}
export const CounterVariableConfig = memo(function CounterVariableConfig({
  questionId,
  countValues,
  choiceQuestions,
  onQuestionChange,
  onCountValuesChange,
}: CounterVariableConfigProps) {
  const handleQuestionChange = (value: string) => {
    onQuestionChange(value)
    onCountValuesChange([]) // Reset values when question changes
  }

  const handleValuesChange = (value: string) => {
    onCountValuesChange(
      value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Question to Count</Label>
        <Select value={questionId} onValueChange={handleQuestionChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a choice question" />
          </SelectTrigger>
          <SelectContent>
            {choiceQuestions.map((q) => (
              <SelectItem key={q.id} value={q.id}>
                {q.question_text?.slice(0, 50)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {choiceQuestions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Add choice questions (single/multiple choice) to use counter variables.
          </p>
        )}
      </div>

      {questionId && (
        <div className="space-y-2">
          <Label>Values to Count</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Enter the option values (comma-separated) that should increment the counter.
          </p>
          <Input
            value={countValues.join(', ')}
            onChange={(e) => handleValuesChange(e.target.value)}
            placeholder="e.g., Yes, Agree, Very Satisfied"
          />
        </div>
      )}
    </div>
  )
})
