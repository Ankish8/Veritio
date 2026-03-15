'use client'

import { memo } from 'react'
import { Trash2 } from 'lucide-react'
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
import type { ScoreComponent } from '@veritio/prototype-test/lib/supabase/survey-rules-types'
import type { StudyFlowQuestion } from '@veritio/prototype-test/lib/supabase/study-flow-types'

export interface ScoreQuestionItemProps {
  component: ScoreComponent
  questions: StudyFlowQuestion[]
  disabledQuestionIds: string[]
  onUpdate: (updates: Partial<ScoreComponent>) => void
  onRemove: () => void
}
export const ScoreQuestionItem = memo(function ScoreQuestionItem({
  component,
  questions,
  disabledQuestionIds,
  onUpdate,
  onRemove,
}: ScoreQuestionItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3">
      <div className="flex-1">
        <Select
          value={component.questionId}
          onValueChange={(value) => onUpdate({ questionId: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {questions.map((q) => (
              <SelectItem
                key={q.id}
                value={q.id}
                disabled={disabledQuestionIds.includes(q.id) && q.id !== component.questionId}
              >
                {q.question_text?.slice(0, 50)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Weight:</Label>
        <Input
          type="number"
          min="0"
          step="0.1"
          value={component.weight}
          onChange={(e) => onUpdate({ weight: parseFloat(e.target.value) || 1 })}
          className="h-8 w-20"
        />
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
})
