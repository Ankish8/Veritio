'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
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
import { cn } from '@/lib/utils'
import { Plus, GripVertical, Trash2, MessageSquareText, AlertCircle } from 'lucide-react'
import type { PostTaskQuestion, Json } from '@veritio/study-types'
import { castJsonArray } from '@/lib/supabase/json-utils'
import { PostTaskQuestionEditor } from '@/components/builders/shared/post-task-question-editor'
import { QuestionTypePicker } from '@/components/study-flow/builder/question-builder/question-type-picker'
import { DisplayLogicPreview } from '@/components/builders/shared/display-logic-preview'
import { getDefaultQuestionConfig, type QuestionType } from '@veritio/study-types/study-flow-types'

interface TaskWithQuestions {
  id: string
  post_task_questions: Json
}

interface PostTaskQuestionsActions {
  addPostTaskQuestion: (taskId: string, question: Omit<PostTaskQuestion, 'id' | 'position'>) => void
  updatePostTaskQuestion: (taskId: string, questionId: string, updates: Partial<PostTaskQuestion>) => void
  removePostTaskQuestion: (taskId: string, questionId: string) => void
  reorderPostTaskQuestions: (taskId: string, questions: PostTaskQuestion[]) => void
}

interface GenericPostTaskQuestionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
  taskNumber: number
  /** Study ID for image uploads in image choice questions */
  studyId: string
  /** The tasks array (from store or props) */
  tasks: TaskWithQuestions[]
  /** Actions for managing questions (from store or props) */
  actions: PostTaskQuestionsActions
  /** Question types to hide from the type picker */
  excludeQuestionTypes?: QuestionType[]
}

interface SortableQuestionItemProps {
  question: PostTaskQuestion
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
  nps: 'Net Promoter Score',
  matrix: 'Matrix',
  ranking: 'Ranking',
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

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
          {(question.question_type && TYPE_LABELS[question.question_type]) || question.question_type || 'Unknown type'}
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

export function GenericPostTaskQuestionsModal({
  open,
  onOpenChange,
  taskId,
  taskNumber,
  studyId,
  tasks,
  actions,
  excludeQuestionTypes,
}: GenericPostTaskQuestionsModalProps) {
  const {
    addPostTaskQuestion,
    updatePostTaskQuestion,
    removePostTaskQuestion,
    reorderPostTaskQuestions,
  } = actions

  const task = tasks.find((t) => t.id === taskId)
  const questions = castJsonArray<PostTaskQuestion>(task?.post_task_questions ?? null).sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  )

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const pendingSelectLastRef = useRef(false)

  // Update selected question when questions change (e.g., after adding)
  useEffect(() => {
    if (pendingSelectLastRef.current && questions.length > 0) {
      // Select the newly added question (last in the sorted list)
      pendingSelectLastRef.current = false
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedQuestionId(questions[questions.length - 1].id)
    } else if (selectedQuestionId === null && questions.length > 0) {
       
      setSelectedQuestionId(questions[0].id)
    } else if (selectedQuestionId && !questions.find(q => q.id === selectedQuestionId)) {
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id)
      const newIndex = questions.findIndex((q) => q.id === over.id)

      const newQuestions = arrayMove(questions, oldIndex, newIndex).map(
        (q, idx) => ({ ...q, position: idx })
      )

      reorderPostTaskQuestions(taskId, newQuestions)
    }
  }, [questions, taskId, reorderPostTaskQuestions])

  const handleAddQuestion = useCallback((type: QuestionType) => {
    const defaultConfig = getDefaultQuestionConfig(type)
    pendingSelectLastRef.current = true
    addPostTaskQuestion(taskId, {
      question_type: type,
      question_text: '',
      question_text_html: null,
      is_required: false,
      config: defaultConfig as PostTaskQuestion['config'],
    })
    setShowTypePicker(false)
  }, [taskId, addPostTaskQuestion])

  const handleDeleteQuestion = useCallback((questionId: string) => {
    removePostTaskQuestion(taskId, questionId)
  }, [taskId, removePostTaskQuestion])

  const handleUpdateQuestion = useCallback((
    questionId: string,
    updates: Partial<PostTaskQuestion>
  ) => {
    updatePostTaskQuestion(taskId, questionId, updates)
  }, [taskId, updatePostTaskQuestion])

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId)

  // Validate that all questions have non-empty question text
  const incompleteQuestions = useMemo(() => {
    return questions.filter((q) => !q.question_text?.trim())
  }, [questions])

  const canSave = incompleteQuestions.length === 0

  const hasQuestions = questions.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[900px] w-[95vw] max-h-[85vh] flex flex-col" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle>Post-task Questions</DialogTitle>
                <Badge variant="secondary" className="text-xs font-normal">
                  Task {taskNumber}
                </Badge>
                {hasQuestions && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {questions.length} {questions.length === 1 ? 'question' : 'questions'}
                  </Badge>
                )}
              </div>
              <DialogDescription className="mt-0.5">
                Add follow-up questions to gather insights after participants complete this task.
              </DialogDescription>
            </div>
            {hasQuestions && <DisplayLogicPreview questions={questions} />}
          </div>
        </DialogHeader>

        {hasQuestions ? (
          /* ── Split panel: question list + editor ── */
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
                  <SortableContext
                    items={questions.map((q) => q.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1.5 pb-2">
                      {questions.map((question) => (
                        <SortableQuestionItem
                          key={question.id}
                          question={question}
                          onSelect={() => setSelectedQuestionId(question.id)}
                          onDelete={() => handleDeleteQuestion(question.id)}
                          isSelected={selectedQuestionId === question.id}
                          hasError={!question.question_text?.trim()}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
              <div className="p-3 border-t">
                <QuestionTypePicker
                  onSelect={handleAddQuestion}
                  open={showTypePicker}
                  onOpenChange={setShowTypePicker}
                  excludeTypes={excludeQuestionTypes}
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
                  key={selectedQuestion.id}
                  question={selectedQuestion}
                  studyId={studyId}
                  onUpdate={(updates) =>
                    handleUpdateQuestion(selectedQuestion.id, updates)
                  }
                  previousQuestions={questions.filter(
                    (q) => (q.position ?? 0) < (selectedQuestion.position ?? 0)
                  )}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Select a question to edit</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="flex-1 min-h-0 flex items-center justify-center py-12 mt-4 rounded-lg border border-dashed">
            <div className="flex flex-col items-center text-center max-w-sm">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-5">
                <MessageSquareText className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-2">
                No questions yet
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Post-task questions help you understand why participants behaved the way they did. Add your first question to get started.
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
