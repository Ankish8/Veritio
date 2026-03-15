'use client'

import { useState } from 'react'
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Button } from '@veritio/ui'
import { Plus } from 'lucide-react'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import type { FlowSection, StudyFlowQuestion } from '../../../../lib/supabase/study-flow-types'
import { QuestionCard } from './question-card'
import { QuestionTypePicker } from './question-type-picker'

interface QuestionListProps {
  section: FlowSection
  studyId: string
  questions: StudyFlowQuestion[]
  showBranchingLogic?: boolean
}

export function QuestionList({
  section,
  studyId,
  questions,
  showBranchingLogic = false,
}: QuestionListProps) {
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false)
  const { reorderQuestions, addQuestion, expandedQuestionId } = useStudyFlowBuilderStore()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id)
      const newIndex = questions.findIndex((q) => q.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newQuestions = arrayMove(questions, oldIndex, newIndex)
        reorderQuestions(section, newQuestions)
      }
    }
  }

  const handleAddQuestion = (questionType: string) => {
    addQuestion(section, questionType as StudyFlowQuestion['question_type'])
    setIsTypePickerOpen(false)
  }

  if (questions.length === 0) {
    return (
      <QuestionTypePicker
        open={isTypePickerOpen}
        onOpenChange={setIsTypePickerOpen}
        onSelect={handleAddQuestion}
      >
        <button className="w-full group">
          <div className="relative py-4">
            {/* Dashed line */}
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-muted-foreground/30" />
            {/* Centered plus button */}
            <div className="relative flex justify-center">
              <div className="bg-background px-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 text-muted-foreground group-hover:border-primary group-hover:text-primary transition-colors">
                  <Plus className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </button>
      </QuestionTypePicker>
    )
  }

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={questions.map((q) => q.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                section={section}
                isExpanded={expandedQuestionId === question.id}
                showBranchingLogic={showBranchingLogic}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Clean add button like Optimal Workshop */}
      <QuestionTypePicker
        open={isTypePickerOpen}
        onOpenChange={setIsTypePickerOpen}
        onSelect={handleAddQuestion}
      >
        <button className="w-full group">
          <div className="relative py-3">
            {/* Dashed line */}
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-muted-foreground/30" />
            {/* Centered plus button */}
            <div className="relative flex justify-center">
              <div className="bg-background px-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 text-muted-foreground group-hover:border-primary group-hover:text-primary transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </div>
        </button>
      </QuestionTypePicker>
    </div>
  )
}
