'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDebouncedEmit } from './use-debounced-emit'
import { Plus, X } from 'lucide-react'

interface DraftSurveyQuestion {
  tempId: string
  questionType: string
  questionText: string
  description?: string
  isRequired?: boolean
  config?: Record<string, unknown>
}

interface DraftSurveyQuestionListProps {
  questions?: DraftSurveyQuestion[]
  count?: number
  message?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
  onStateChange?: (state: { questions: DraftSurveyQuestion[] }) => void
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  multiple_choice: 'bg-blue-100 text-blue-700',
  yes_no: 'bg-green-100 text-green-700',
  opinion_scale: 'bg-purple-100 text-purple-700',
  nps: 'bg-purple-100 text-purple-700',
  single_line_text: 'bg-gray-100 text-gray-700',
  multi_line_text: 'bg-gray-100 text-gray-700',
  slider: 'bg-orange-100 text-orange-700',
  ranking: 'bg-pink-100 text-pink-700',
  matrix: 'bg-yellow-100 text-yellow-700',
}

function formatTypeName(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function getOptions(config?: Record<string, unknown>): string[] {
  if (!config) return []
  const options = config.options as Array<{ label?: string }> | undefined
  if (!Array.isArray(options)) return []
  return options.map((o) => (typeof o === 'string' ? o : o.label ?? '')).filter(Boolean)
}

function SkeletonItem() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="bg-muted rounded h-3 w-8" />
        <div className="bg-muted rounded-full h-4 w-20" />
      </div>
      <div className="bg-muted rounded h-4 w-3/4" />
    </div>
  )
}

export function DraftSurveyQuestionList({ questions: initialQuestions, propStatus, onStateChange }: DraftSurveyQuestionListProps) {
  const isStreaming = propStatus?.questions === 'streaming'
  const [questions, setQuestions] = useState<DraftSurveyQuestion[]>(initialQuestions ?? [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editField, setEditField] = useState<'questionText' | 'description' | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const prevQuestionsRef = useRef(initialQuestions)
  // eslint-disable-next-line react-hooks/refs
  if (initialQuestions && initialQuestions !== prevQuestionsRef.current) {
    // eslint-disable-next-line react-hooks/refs
    prevQuestionsRef.current = initialQuestions
    setQuestions(initialQuestions)
  }

  const debouncedEmit = useDebouncedEmit<{ questions: DraftSurveyQuestion[] }>(onStateChange)

  const emitChange = useCallback(
    (updated: DraftSurveyQuestion[]) => {
      debouncedEmit({ questions: updated })
    },
    [debouncedEmit],
  )

  const handleEdit = useCallback(
    (tempId: string, field: 'questionText' | 'description', value: string) => {
      setQuestions((prev) => {
        const updated = prev.map((q) => (q.tempId === tempId ? { ...q, [field]: value || undefined } : q))
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const handleDelete = useCallback(
    (tempId: string) => {
      setQuestions((prev) => {
        const updated = prev.filter((q) => q.tempId !== tempId)
        emitChange(updated)
        return updated
      })
      if (editingId === tempId) {
        setEditingId(null)
        setEditField(null)
      }
    },
    [emitChange, editingId],
  )

  const handleAdd = useCallback(() => {
    const newQuestion: DraftSurveyQuestion = {
      tempId: crypto.randomUUID(),
      questionType: 'single_line_text',
      questionText: '',
    }
    setQuestions((prev) => {
      const updated = [...prev, newQuestion]
      emitChange(updated)
      return updated
    })
    setEditingId(newQuestion.tempId)
    setEditField('questionText')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [emitChange])

  const startEditing = useCallback((tempId: string, field: 'questionText' | 'description') => {
    setEditingId(tempId)
    setEditField(field)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const stopEditing = useCallback(() => {
    setEditingId(null)
    setEditField(null)
  }, [])

  const hasQuestions = questions.length > 0

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">
          {hasQuestions ? `${questions.length} question${questions.length === 1 ? '' : 's'}` : 'Survey Questions'}
        </span>
        {isStreaming && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground animate-pulse">
            generating...
          </span>
        )}
      </div>

      {!hasQuestions && isStreaming && (
        <div className="space-y-2">
          <SkeletonItem />
          <SkeletonItem />
          <SkeletonItem />
        </div>
      )}

      {hasQuestions && (
        <div className="space-y-2">
          {questions.map((question, index) => {
            const isLast = index === questions.length - 1
            const isPulsing = isLast && isStreaming
            const isEditing = editingId === question.tempId
            const badgeColor = TYPE_BADGE_COLORS[question.questionType] ?? 'bg-gray-100 text-gray-700'
            const options = getOptions(question.config)

            return (
              <div
                key={question.tempId || `q-${index}`}
                className={cn(
                  'group relative rounded-lg border border-border bg-background px-3 py-2.5 transition-colors hover:border-foreground/20 hover:shadow-sm',
                  isPulsing && 'animate-pulse',
                )}
              >
                {/* Header: number + type badge + required + delete */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-muted-foreground/50 font-medium">{index + 1}</span>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', badgeColor)}>
                    {formatTypeName(question.questionType)}
                  </span>
                  {question.isRequired && (
                    <span className="text-[10px] font-medium text-red-500">Required</span>
                  )}
                  <div className="flex-1" />
                  {!isStreaming && (
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 -m-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(question.tempId)}
                      title="Remove question"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Question text */}
                {isEditing && editField === 'questionText' ? (
                  <input
                    ref={inputRef}
                    type="text"
                    className="w-full text-sm font-medium bg-transparent border-b border-primary outline-none py-0"
                    value={question.questionText}
                    onChange={(e) => handleEdit(question.tempId, 'questionText', e.target.value)}
                    onBlur={stopEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') stopEditing()
                      if (e.key === 'Escape') stopEditing()
                    }}
                    placeholder="Question text..."
                  />
                ) : (
                  <button
                    type="button"
                    className="text-sm font-medium text-foreground hover:text-primary cursor-text text-left w-full leading-snug"
                    onClick={() => startEditing(question.tempId, 'questionText')}
                  >
                    {question.questionText || <span className="text-muted-foreground italic">Untitled question</span>}
                  </button>
                )}

                {/* Description */}
                {isEditing && editField === 'description' ? (
                  <input
                    ref={inputRef}
                    type="text"
                    className="w-full text-xs text-muted-foreground bg-transparent border-b border-primary outline-none mt-1.5 py-0"
                    value={question.description ?? ''}
                    onChange={(e) => handleEdit(question.tempId, 'description', e.target.value)}
                    onBlur={stopEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') stopEditing()
                      if (e.key === 'Escape') stopEditing()
                    }}
                    placeholder="Add description..."
                  />
                ) : question.description ? (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground cursor-text text-left w-full mt-1.5 leading-relaxed line-clamp-2"
                    onClick={() => startEditing(question.tempId, 'description')}
                  >
                    {question.description}
                  </button>
                ) : null}

                {/* Options preview */}
                {options.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {options.map((opt, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {opt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {isStreaming && <SkeletonItem />}
        </div>
      )}

      {!isStreaming && (
        <button
          type="button"
          className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2 rounded-lg border border-dashed border-border hover:border-foreground/30"
          onClick={handleAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          Add question
        </button>
      )}
    </div>
  )
}
