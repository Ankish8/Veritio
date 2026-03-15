'use client'

import { memo } from 'react'
import { Plus, HelpCircle } from 'lucide-react'
import { Button } from '@veritio/ui/components/button'
import { Input } from '@veritio/ui/components/input'
import { Label } from '@veritio/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import { ScoreQuestionItem } from './score-question-item'
import type { ScoreComponent } from '@veritio/prototype-test/lib/supabase/survey-rules-types'
import type { StudyFlowQuestion } from '@veritio/prototype-test/lib/supabase/study-flow-types'

export interface ScoreVariableConfigProps {
  questions: ScoreComponent[]
  numericQuestions: StudyFlowQuestion[]
  aggregation: 'sum' | 'average' | 'min' | 'max'
  defaultValue: number
  onQuestionsChange: (questions: ScoreComponent[]) => void
  onAggregationChange: (value: 'sum' | 'average' | 'min' | 'max') => void
  onDefaultValueChange: (value: number) => void
}
export const ScoreVariableConfig = memo(function ScoreVariableConfig({
  questions,
  numericQuestions,
  aggregation,
  defaultValue,
  onQuestionsChange,
  onAggregationChange,
  onDefaultValueChange,
}: ScoreVariableConfigProps) {
  const handleAdd = () => {
    const available = numericQuestions.find(
      (q) => !questions.some((sq) => sq.questionId === q.id)
    )
    if (available) {
      onQuestionsChange([...questions, { questionId: available.id, weight: 1 }])
    }
  }

  const handleRemove = (questionId: string) => {
    onQuestionsChange(questions.filter((sq) => sq.questionId !== questionId))
  }

  const handleUpdate = (questionId: string, updates: Partial<ScoreComponent>) => {
    onQuestionsChange(
      questions.map((sq) =>
        sq.questionId === questionId ? { ...sq, ...updates } : sq
      )
    )
  }

  const disabledQuestionIds = questions.map((q) => q.questionId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>Questions to Include</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Select numeric questions (likert, NPS, rating) to include in this score.
                  Use weights to adjust each question&apos;s contribution.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={questions.length >= numericQuestions.length}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Question
        </Button>
      </div>

      {numericQuestions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No numeric questions available. Add likert, NPS, or rating questions to use score variables.
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No questions selected. Add questions to calculate a score.
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((sq) => (
            <ScoreQuestionItem
              key={sq.questionId}
              component={sq}
              questions={numericQuestions}
              disabledQuestionIds={disabledQuestionIds}
              onUpdate={(updates) => handleUpdate(sq.questionId, updates)}
              onRemove={() => handleRemove(sq.questionId)}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Aggregation Method</Label>
          <Select value={aggregation} onValueChange={onAggregationChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sum">Sum</SelectItem>
              <SelectItem value="average">Average</SelectItem>
              <SelectItem value="min">Minimum</SelectItem>
              <SelectItem value="max">Maximum</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Default Value (if not answered)</Label>
          <Input
            type="number"
            value={defaultValue}
            onChange={(e) => onDefaultValueChange(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>
    </div>
  )
})
