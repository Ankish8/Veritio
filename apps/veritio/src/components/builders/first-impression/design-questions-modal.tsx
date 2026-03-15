'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import { Plus, GripVertical, Trash2, MessageSquareText, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  FirstImpressionDesign,
  FirstImpressionDesignQuestion,
  QuestionType,
} from '@veritio/study-types/study-flow-types'
import { getDefaultQuestionConfig } from '@veritio/study-types/study-flow-types'
import { useFirstImpressionActions, useFirstImpressionDesign } from '@/stores/study-builder'
import { PostTaskQuestionEditor } from '@/components/builders/shared/post-task-question-editor'
import { QuestionTypePicker } from '@/components/study-flow/builder/question-builder/question-type-picker'

interface DesignQuestionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  design: FirstImpressionDesign
  designNumber: number
  studyId: string
  /** Question mode - affects title and which store actions are used */
  mode?: 'shared' | 'per_design'
}

interface SortableQuestionItemProps {
  question: FirstImpressionDesignQuestion
  onSelect: () => void
  onDelete: () => void
  isSelected: boolean
  hasError: boolean
}

const TYPE_LABELS: Record<string, string> = {
  single_line_text: 'Short text',
  multi_line_text: 'Long text',
  multiple_choice: 'Selection',
  image_choice: 'Image Choice',
  yes_no: 'Yes / No',
  opinion_scale: 'Opinion Scale',
  rating: 'Rating',
  nps: 'Net Promoter Score',
  ranking: 'Ranking',
  matrix: 'Matrix',
  dropdown: 'Dropdown',
  slider: 'Slider',
  semantic_differential: 'Semantic Differential',
  constant_sum: 'Constant Sum',
}

function SortableQuestionItem({
  question,
  onSelect,
  onDelete,
  isSelected,
  hasError,
}: SortableQuestionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-all',
        isDragging && 'opacity-50 shadow-lg',
        isSelected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'bg-background hover:bg-accent/50',
        hasError && !isSelected && 'border-destructive/50',
      )}
      onClick={onSelect}
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={cn(
            'text-sm font-medium truncate',
            !question.question_text?.trim() && 'text-muted-foreground italic',
          )}>
            {question.question_text?.trim() || 'Untitled question'}
          </p>
          {hasError && (
            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {TYPE_LABELS[question.question_type] || question.question_type}
          {question.is_required && ' \u2022 Required'}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export function DesignQuestionsModal({
  open,
  onOpenChange,
  design: designProp,
  designNumber,
  studyId,
  mode = 'per_design',
}: DesignQuestionsModalProps) {
  const {
    setDesignQuestions, addDesignQuestion, updateDesignQuestion, removeDesignQuestion,
    setSharedQuestions, addSharedQuestion, updateSharedQuestion, removeSharedQuestion,
  } = useFirstImpressionActions()

  const isShared = mode === 'shared'

  // Subscribe directly to the store for this design to get live updates
  // This ensures the modal reflects changes immediately without relying on prop drilling
  const storeDesign = useFirstImpressionDesign(designProp.id)
  const design = storeDesign ?? designProp

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [showTypePicker, setShowTypePicker] = useState(false)

  const questions = useMemo(() => design.questions || [], [design.questions])
  const questionIds = useMemo(() => questions.map((q) => q.id), [questions])

  const selectedQuestion = useMemo(
    () => questions.find((q) => q.id === selectedQuestionId) || null,
    [questions, selectedQuestionId]
  )

  // Update selected question when questions change
  useEffect(() => {
    if (selectedQuestionId === null && questions.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedQuestionId(questions[0].id)
    } else if (selectedQuestionId && !questions.find((q) => q.id === selectedQuestionId)) {
      // Selected question was deleted, select first available
      setSelectedQuestionId(questions[0]?.id || null)
    }
  }, [questions, selectedQuestionId])

  // Reset selection when modal closes
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedQuestionId(null)
    }
  }, [open])

  // Validate that all questions have non-empty question text
  const incompleteQuestions = useMemo(() => {
    return questions.filter((q) => !q.question_text?.trim())
  }, [questions])

  const canSave = incompleteQuestions.length === 0

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = questions.findIndex((q) => q.id === active.id)
        const newIndex = questions.findIndex((q) => q.id === over.id)
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(questions, oldIndex, newIndex).map((q, i) => ({
            ...q,
            position: i,
          }))
          if (isShared) {
            setSharedQuestions(reordered)
          } else {
            setDesignQuestions(design.id, reordered)
          }
        }
      }
    },
    [questions, design.id, isShared, setDesignQuestions, setSharedQuestions]
  )

  const handleAddQuestion = useCallback(
    (type: QuestionType) => {
      const questionData = {
        question_type: type,
        question_text: '',
        is_required: true,
        config: getDefaultQuestionConfig(type),
      }
      const newId = isShared
        ? addSharedQuestion(questionData)
        : addDesignQuestion(design.id, questionData)
      setSelectedQuestionId(newId)
      setShowTypePicker(false)
    },
    [design.id, isShared, addDesignQuestion, addSharedQuestion]
  )

  const handleUpdateQuestion = useCallback(
    (updates: Partial<FirstImpressionDesignQuestion>) => {
      if (selectedQuestionId) {
        if (isShared) {
          updateSharedQuestion(selectedQuestionId, updates)
        } else {
          updateDesignQuestion(design.id, selectedQuestionId, updates)
        }
      }
    },
    [design.id, selectedQuestionId, isShared, updateDesignQuestion, updateSharedQuestion]
  )

  const handleDeleteQuestion = useCallback(
    (questionId: string) => {
      if (isShared) {
        removeSharedQuestion(questionId)
      } else {
        removeDesignQuestion(design.id, questionId)
      }
      if (selectedQuestionId === questionId) {
        const remaining = questions.filter((q) => q.id !== questionId)
        setSelectedQuestionId(remaining.length > 0 ? remaining[0].id : null)
      }
    },
    [design.id, questions, selectedQuestionId, isShared, removeDesignQuestion, removeSharedQuestion]
  )

  const hasQuestions = questions.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[900px] w-[95vw] max-h-[85vh] flex flex-col" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle>
                  {isShared ? 'Post-Design Questions' : 'Per-Design Questions'}
                </DialogTitle>
                {!isShared && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    Design {designNumber}
                  </Badge>
                )}
                {hasQuestions && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {questions.length} {questions.length === 1 ? 'question' : 'questions'}
                  </Badge>
                )}
              </div>
              <DialogDescription className="mt-0.5">
                {isShared
                  ? 'These questions will be shown after viewing each design.'
                  : 'These questions will be shown after participants view this design.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {hasQuestions ? (
          /* Split panel: question list + editor */
          <div className="flex-1 min-h-0 flex gap-0 mt-4 rounded-lg border overflow-hidden">
            {/* Left panel - Question list */}
            <div className="w-[280px] shrink-0 flex flex-col bg-muted/30 border-r">
              <div className="px-3 pt-3 pb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Questions</p>
              </div>
              <div className="flex-1 min-h-0 px-3 overflow-y-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5 pb-2">
                      {questions.map((question) => (
                        <SortableQuestionItem
                          key={question.id}
                          question={question}
                          isSelected={selectedQuestionId === question.id}
                          onSelect={() => setSelectedQuestionId(question.id)}
                          onDelete={() => handleDeleteQuestion(question.id)}
                          hasError={!question.question_text?.trim()}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
              <div className="p-3 border-t">
                <QuestionTypePicker
                  open={showTypePicker}
                  onOpenChange={setShowTypePicker}
                  onSelect={handleAddQuestion}
                >
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Add question
                  </Button>
                </QuestionTypePicker>
              </div>
            </div>

            {/* Right panel - Question editor */}
            <div className="flex-1 min-w-0 p-5 overflow-y-auto">
              {selectedQuestion ? (
                <PostTaskQuestionEditor
                  studyId={studyId}
                  question={{
                    id: selectedQuestion.id,
                    question_type: selectedQuestion.question_type,
                    question_text: selectedQuestion.question_text,
                    is_required: selectedQuestion.is_required,
                    config: selectedQuestion.config,
                    position: selectedQuestion.position,
                  }}
                  onUpdate={handleUpdateQuestion as any}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Select a question to edit</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex-1 min-h-0 flex items-center justify-center py-12 mt-4 rounded-lg border border-dashed">
            <div className="flex flex-col items-center text-center max-w-sm">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-5">
                <MessageSquareText className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-2">
                No questions yet
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Per-design questions help you understand participant reactions to each design. Add your first question to get started.
              </p>
              <QuestionTypePicker
                onSelect={handleAddQuestion}
                open={showTypePicker}
                onOpenChange={setShowTypePicker}
              >
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add first question
                </Button>
              </QuestionTypePicker>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="flex-1 min-w-0">
            {incompleteQuestions.length > 0 && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {incompleteQuestions.length === 1
                  ? '1 question is missing question text'
                  : `${incompleteQuestions.length} questions are missing question text`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onOpenChange(false)} disabled={!canSave}>
              Done
              <EscapeHint variant="dark" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
