'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import type { CrossTabQuestion } from './types'

interface QuestionSelectorProps {
  label: string
  placeholder: string
  questions: CrossTabQuestion[]
  selectedQuestionId: string | null
  disabledQuestionId: string | null  // The other selected question (can't select same)
  onSelect: (questionId: string | null) => void
}

export function QuestionSelector({
  label,
  placeholder,
  questions,
  selectedQuestionId,
  disabledQuestionId,
  onSelect,
}: QuestionSelectorProps) {
  const compatibleQuestions = questions.filter(q => q.isCompatible)
  const incompatibleQuestions = questions.filter(q => !q.isCompatible)

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Select
        value={selectedQuestionId || ''}
        onValueChange={(value) => onSelect(value || null)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {compatibleQuestions.length > 0 && (
            <>
              {compatibleQuestions.map((q) => (
                <SelectItem
                  key={q.id}
                  value={q.id}
                  disabled={q.id === disabledQuestionId}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate max-w-[280px]">{q.text}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {q.responseCount}
                    </Badge>
                    <Badge variant="outline" className="text-xs shrink-0 capitalize">
                      {q.type.replace('_', ' ')}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </>
          )}

          {incompatibleQuestions.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-1 pt-2">
                Not compatible
              </div>
              {incompatibleQuestions.map((q) => (
                <SelectItem
                  key={q.id}
                  value={q.id}
                  disabled
                  className="opacity-50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[240px]">{q.text}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({q.incompatibilityReason})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}

          {questions.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No survey questions available
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
