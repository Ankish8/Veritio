'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDebouncedEmit } from './use-debounced-emit'
import { Plus, X, Pencil, Check, GripVertical } from 'lucide-react'

interface FlowQuestion {
  id: string
  question_type: string
  question_text: string
  description?: string | null
  is_required?: boolean
  config?: Record<string, unknown>
  branching_logic?: Record<string, unknown> | null
}

interface QuestionOption {
  id?: string
  label?: string
}

interface SectionSettings {
  enabled?: boolean
  introTitle?: string
  introMessage?: string
  pageMode?: string
}

interface DraftFlowQuestionsProps {
  section?: string
  questions?: FlowQuestion[]
  sectionSettings?: SectionSettings
  propStatus?: Record<string, 'streaming' | 'complete'>
  onStateChange?: (state: { section: string; questions: FlowQuestion[]; sectionSettings: SectionSettings }) => void
}

const SECTION_LABELS: Record<string, string> = {
  screening: 'Screening Questions',
  pre_study: 'Pre-Study Questions',
  post_study: 'Post-Study Questions',
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_line_text: 'Short Text',
  multi_line_text: 'Long Text',
  multiple_choice: 'Multiple Choice',
  yes_no: 'Yes / No',
  opinion_scale: 'Opinion Scale',
  nps: 'NPS',
  slider: 'Slider',
  ranking: 'Ranking',
  matrix: 'Matrix',
}

/** Question types that have editable options */
const TYPES_WITH_OPTIONS = new Set(['multiple_choice', 'ranking'])

const QUESTION_TYPES = Object.entries(QUESTION_TYPE_LABELS)

function getOptionsKey(q: FlowQuestion): 'items' | 'options' {
  return q.question_type === 'ranking' ? 'items' : 'options'
}

function getOptions(q: FlowQuestion): QuestionOption[] {
  const key = getOptionsKey(q)
  return (q.config?.[key] as QuestionOption[]) ?? []
}

function setOptions(q: FlowQuestion, options: QuestionOption[]): FlowQuestion {
  const key = getOptionsKey(q)
  return { ...q, config: { ...(q.config ?? {}), [key]: options } }
}

export function DraftFlowQuestions({
  section = 'screening',
  questions: initialQuestions,
  sectionSettings: initialSettings,
  propStatus,
  onStateChange,
}: DraftFlowQuestionsProps) {
  const isStreaming = propStatus?.questions === 'streaming'
  const [questions, setQuestions] = useState<FlowQuestion[]>(initialQuestions ?? [])
  const [settings] = useState<SectionSettings>(initialSettings ?? {})
  const [editingId, setEditingId] = useState<string | null>(null)

  // Sync from incoming props
  const prevQuestionsRef = useRef(initialQuestions)
  // eslint-disable-next-line react-hooks/refs
  if (initialQuestions && initialQuestions !== prevQuestionsRef.current) {
    // eslint-disable-next-line react-hooks/refs
    prevQuestionsRef.current = initialQuestions
    setQuestions(initialQuestions)
  }

  const debouncedEmit = useDebouncedEmit<{ section: string; questions: FlowQuestion[]; sectionSettings: SectionSettings }>(onStateChange)

  const emitChange = useCallback(
    (updated: FlowQuestion[]) => {
      debouncedEmit({ section, questions: updated, sectionSettings: settings })
    },
    [debouncedEmit, settings, section],
  )

  const handleEditText = useCallback(
    (id: string, text: string) => {
      setQuestions((prev) => {
        const updated = prev.map((q) => (q.id === id ? { ...q, question_text: text } : q))
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const handleEditType = useCallback(
    (id: string, type: string) => {
      setQuestions((prev) => {
        const updated = prev.map((q) => {
          if (q.id !== id) return q
          const newQ = { ...q, question_type: type }
          // Initialize empty options when switching to a type that needs them
          if (TYPES_WITH_OPTIONS.has(type) && getOptions(q).length === 0) {
            return setOptions(newQ, [
              { id: crypto.randomUUID(), label: '' },
              { id: crypto.randomUUID(), label: '' },
            ])
          }
          return newQ
        })
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const handleDelete = useCallback(
    (id: string) => {
      setQuestions((prev) => {
        const updated = prev.filter((q) => q.id !== id)
        emitChange(updated)
        return updated
      })
      if (editingId === id) setEditingId(null)
    },
    [emitChange, editingId],
  )

  const handleAdd = useCallback(() => {
    const newQ: FlowQuestion = {
      id: crypto.randomUUID(),
      question_type: 'single_line_text',
      question_text: '',
      is_required: true,
    }
    setQuestions((prev) => {
      const updated = [...prev, newQ]
      emitChange(updated)
      return updated
    })
    setEditingId(newQ.id)
  }, [emitChange])

  const handleToggleRequired = useCallback(
    (id: string) => {
      setQuestions((prev) => {
        const updated = prev.map((q) => (q.id === id ? { ...q, is_required: !q.is_required } : q))
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  // Options editing handlers
  const handleEditOptionLabel = useCallback(
    (questionId: string, optionIndex: number, label: string) => {
      setQuestions((prev) => {
        const updated = prev.map((q) => {
          if (q.id !== questionId) return q
          const opts = [...getOptions(q)]
          if (opts[optionIndex]) {
            opts[optionIndex] = { ...opts[optionIndex], label }
          }
          return setOptions(q, opts)
        })
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const handleAddOption = useCallback(
    (questionId: string) => {
      setQuestions((prev) => {
        const updated = prev.map((q) => {
          if (q.id !== questionId) return q
          const opts = [...getOptions(q), { id: crypto.randomUUID(), label: '' }]
          return setOptions(q, opts)
        })
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const handleRemoveOption = useCallback(
    (questionId: string, optionIndex: number) => {
      setQuestions((prev) => {
        const updated = prev.map((q) => {
          if (q.id !== questionId) return q
          const opts = getOptions(q).filter((_, i) => i !== optionIndex)
          return setOptions(q, opts)
        })
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const sectionLabel = SECTION_LABELS[section] ?? section
  const isScreening = section === 'screening'

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">{sectionLabel}</span>
        {isStreaming && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground animate-pulse">
            generating...
          </span>
        )}
      </div>

      {questions.length === 0 && isStreaming && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-border bg-muted/30 px-3 py-3">
              <div className="bg-muted rounded h-3 w-16 mb-2" />
              <div className="bg-muted rounded h-4 w-3/4" />
            </div>
          ))}
        </div>
      )}

      {questions.length > 0 && (
        <div className="space-y-2">
          {questions.map((q, index) => {
            const isEditing = editingId === q.id
            const isLast = index === questions.length - 1
            const isPulsing = isLast && isStreaming
            const hasBranching = isScreening && q.branching_logic && typeof q.branching_logic === 'object'
            const branchingRules = hasBranching ? (q.branching_logic as { rules?: { target: string }[] })?.rules : undefined
            const hasReject = branchingRules?.some((r) => r.target === 'reject')
            const options = getOptions(q)
            const hasEditableOptions = TYPES_WITH_OPTIONS.has(q.question_type)

            return (
              <div
                key={q.id || `q-${index}`}
                className={cn(
                  'group relative rounded-lg border border-border bg-background px-3 py-2.5 transition-colors hover:border-foreground/20',
                  isPulsing && 'animate-pulse',
                )}
              >
                <div className="flex items-start gap-2">
                  {/* Number */}
                  <span className="text-sm text-muted-foreground/50 font-medium mt-0.5 shrink-0">{index + 1}.</span>

                  <div className="flex-1 min-w-0">
                    {/* Type badge + screening status */}
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      {isEditing ? (
                        <select
                          className="text-xs bg-muted rounded px-1.5 py-0.5 border border-border outline-none"
                          value={q.question_type}
                          onChange={(e) => handleEditType(q.id, e.target.value)}
                        >
                          {QUESTION_TYPES.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {QUESTION_TYPE_LABELS[q.question_type] ?? q.question_type}
                        </span>
                      )}
                      {q.is_required && (
                        <span className="text-xs text-muted-foreground/50">Required</span>
                      )}
                      {isScreening && hasReject && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                          Reject
                        </span>
                      )}
                      {isScreening && !hasReject && hasBranching && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">
                          Pass
                        </span>
                      )}
                    </div>

                    {/* Question text */}
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full text-sm bg-transparent border-b border-primary outline-none"
                        value={q.question_text}
                        onChange={(e) => handleEditText(q.id, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') setEditingId(null) }}
                        placeholder="Question text..."
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm text-foreground leading-snug">
                        {q.question_text || <span className="text-muted-foreground italic">Untitled question</span>}
                      </p>
                    )}

                    {/* Options — editable when editing, read-only otherwise */}
                    {(() => {
                      const type = q.question_type

                      // Yes/No — always show fixed options (not editable)
                      if (type === 'yes_no') {
                        return (
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <span className="h-3.5 w-3.5 rounded-full border border-border" /> Yes
                            </span>
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <span className="h-3.5 w-3.5 rounded-full border border-border" /> No
                            </span>
                          </div>
                        )
                      }

                      // Editable options for multiple_choice / ranking
                      if (hasEditableOptions && isEditing) {
                        return (
                          <div className="mt-2 space-y-1">
                            {options.map((opt, i) => (
                              <div key={opt.id || `opt-${i}`} className="flex items-center gap-1.5">
                                {type === 'multiple_choice' ? (
                                  <span className="h-3 w-3 rounded-full border border-border shrink-0" />
                                ) : (
                                  <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                                )}
                                <input
                                  type="text"
                                  className="flex-1 text-sm bg-muted/50 rounded px-2 py-1 border border-border outline-none focus:border-primary"
                                  value={opt.label ?? ''}
                                  onChange={(e) => handleEditOptionLabel(q.id, i, e.target.value)}
                                  placeholder={`Option ${i + 1}`}
                                />
                                {options.length > 1 && (
                                  <button
                                    type="button"
                                    className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive"
                                    onClick={() => handleRemoveOption(q.id, i)}
                                    title="Remove option"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-1 pl-[18px]"
                              onClick={() => handleAddOption(q.id)}
                            >
                              <Plus className="h-3 w-3" />
                              Add option
                            </button>
                          </div>
                        )
                      }

                      // Read-only display for multiple_choice / ranking
                      if ((type === 'multiple_choice' || type === 'ranking') && options.length > 0) {
                        return (
                          <div className="mt-1.5 space-y-0.5">
                            {options.map((opt, i) => (
                              <div key={opt.id || `opt-${i}`} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                {type === 'multiple_choice' ? (
                                  <span className="h-3 w-3 rounded-full border border-border shrink-0" />
                                ) : (
                                  <span className="text-muted-foreground/50 shrink-0 w-3 text-center">{i + 1}.</span>
                                )}
                                <span className="truncate">{opt.label || `Option ${i + 1}`}</span>
                              </div>
                            ))}
                          </div>
                        )
                      }

                      // Opinion scale / NPS — show scale range
                      if (type === 'opinion_scale' || type === 'nps') {
                        const min = (q.config?.minValue as number) ?? (type === 'nps' ? 0 : 1)
                        const max = (q.config?.maxValue as number) ?? (type === 'nps' ? 10 : 5)
                        const minLabel = (q.config?.minLabel as string) ?? ''
                        const maxLabel = (q.config?.maxLabel as string) ?? ''
                        return (
                          <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                            <span>{minLabel || min}</span>
                            <div className="flex-1 h-px bg-border" />
                            <span>{maxLabel || max}</span>
                          </div>
                        )
                      }

                      return null
                    })()}
                  </div>

                  {/* Actions */}
                  {!isStreaming && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {isEditing ? (
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingId(null)}
                          title="Done editing"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingId(q.id)}
                          title="Edit question"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        className={cn(
                          'px-1.5 py-0.5 rounded text-xs font-medium transition-colors',
                          q.is_required
                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80',
                        )}
                        onClick={() => handleToggleRequired(q.id)}
                        title={q.is_required ? 'Click to make optional' : 'Click to make required'}
                      >
                        {q.is_required ? 'Required' : 'Optional'}
                      </button>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(q.id)}
                        title="Remove question"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {isStreaming && (
            <div className="animate-pulse rounded-lg border border-border bg-muted/30 px-3 py-3">
              <div className="bg-muted rounded h-3 w-16 mb-2" />
              <div className="bg-muted rounded h-4 w-3/4" />
            </div>
          )}
        </div>
      )}

      {!isStreaming && (
        <button
          type="button"
          className="mt-2.5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2 rounded-lg border border-dashed border-border hover:border-foreground/30"
          onClick={handleAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          Add question
        </button>
      )}
    </div>
  )
}
