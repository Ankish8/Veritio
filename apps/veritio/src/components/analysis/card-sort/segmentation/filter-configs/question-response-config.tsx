'use client'

import { memo } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SegmentOperator } from '@/stores/segment-store'

interface AvailableQuestion {
  id: string
  text: string
  section: string
  options?: string[]
}

export interface QuestionResponseConfigProps {
  availableQuestions: AvailableQuestion[]
  questionId: string | undefined
  value: string | undefined
  onQuestionChange: (questionId: string, questionText: string) => void
  onChange: (operator: SegmentOperator, value: string) => void
}

export const QuestionResponseConfig = memo(function QuestionResponseConfig({
  availableQuestions,
  questionId,
  value,
  onQuestionChange,
  onChange,
}: QuestionResponseConfigProps) {
  const selectedQuestion = availableQuestions.find((q) => q.id === questionId)
  const hasOptions = selectedQuestion?.options && selectedQuestion.options.length > 0

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Question</Label>
        <Select
          value={questionId}
          onValueChange={(id) => {
            const q = availableQuestions.find((q) => q.id === id)
            if (q) onQuestionChange(id, q.text)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select question" />
          </SelectTrigger>
          <SelectContent>
            {availableQuestions.map((q) => (
              <SelectItem key={q.id} value={q.id}>
                <span className="truncate max-w-[200px] block">{q.text}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({q.section})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {questionId && (
        <div className="space-y-2">
          <Label>Response is</Label>
          {hasOptions ? (
            <Select
              value={value}
              onValueChange={(val) => onChange('equals', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select answer" />
              </SelectTrigger>
              <SelectContent>
                {selectedQuestion!.options!.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Contains..."
              value={value || ''}
              onChange={(e) => onChange('contains', e.target.value)}
            />
          )}
        </div>
      )}
    </div>
  )
})
