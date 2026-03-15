'use client'

import { useState, useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Trash2,
  Copy,
  MoreHorizontal,
  TextCursorInput,
  FileText,
  ListChecks,
  ThumbsUp,
  SlidersHorizontal,
  Sliders,
  Gauge,
  LayoutGrid,
  ListOrdered,
  Images,
  AlertTriangle,
  ArrowLeftRight,
  PieChart,
} from 'lucide-react'
import { cn } from '@veritio/ui'
import { Button } from '@veritio/ui'
import { Badge } from '@veritio/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@veritio/ui'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@veritio/ui'
import { PresenceBadge, PresenceRing } from '../../../yjs'
import { useCollaborativeField } from '@veritio/yjs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@veritio/ui'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { useValidationHighlight } from '@veritio/prototype-test/hooks/use-validation-highlight'
import type { FlowSection, StudyFlowQuestion, QuestionType } from '../../../../lib/supabase/study-flow-types'
import { QuestionEditor } from './question-editor'
import { stripHtml } from '../rich-text-editor'
import {
  findQuestionsReferencingId,
  removeConditionReferences,
} from '@veritio/prototype-test/lib/study-flow/condition-evaluator'

interface QuestionCardProps {
  question: StudyFlowQuestion
  index: number
  section: FlowSection
  isExpanded: boolean
  showBranchingLogic?: boolean
}

const iconMap: Record<QuestionType, React.ReactNode> = {
  single_line_text: <TextCursorInput className="h-4 w-4" />,
  multi_line_text: <FileText className="h-4 w-4" />,
  multiple_choice: <ListChecks className="h-4 w-4" />,
  yes_no: <ThumbsUp className="h-4 w-4" />,
  opinion_scale: <SlidersHorizontal className="h-4 w-4" />,
  nps: <Gauge className="h-4 w-4" />,
  matrix: <LayoutGrid className="h-4 w-4" />,
  ranking: <ListOrdered className="h-4 w-4" />,
  slider: <Sliders className="h-4 w-4" />,
  image_choice: <Images className="h-4 w-4" />,
  semantic_differential: <ArrowLeftRight className="h-4 w-4" />,
  constant_sum: <PieChart className="h-4 w-4" />,
  audio_response: <span className="h-4 w-4 flex items-center justify-center">🎤</span>,
}

const typeLabels: Record<QuestionType, string> = {
  single_line_text: 'Short Text',
  multi_line_text: 'Long Text',
  multiple_choice: 'Multiple Choice',
  yes_no: 'Yes / No',
  opinion_scale: 'Opinion Scale',
  nps: 'NPS',
  matrix: 'Matrix',
  ranking: 'Ranking',
  slider: 'Slider',
  image_choice: 'Image Choice',
  semantic_differential: 'Semantic Differential',
  constant_sum: 'Constant Sum',
  audio_response: 'Audio Response',
}

export function QuestionCard({
  question,
  index,
  section,
  isExpanded,
  showBranchingLogic = false,
}: QuestionCardProps) {
  const {
    setExpandedQuestionId,
    removeQuestion,
    updateQuestion,
    duplicateQuestion,
    screeningQuestions,
    preStudyQuestions,
    postStudyQuestions,
    surveyQuestions,
    studyId,
  } = useStudyFlowBuilderStore()

  // Collaborative presence
  const { hasPresence, primaryUser, users, wrapperProps } = useCollaborativeField({
    locationId: studyId ? `${studyId}:survey-question:${question.id}` : undefined,
  })

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

  const { ref: highlightRef, highlightClassName } = useValidationHighlight(question.id)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Get all questions in the same section for reference checking
  const sectionQuestions = useMemo(() => {
    switch (section) {
      case 'screening':
        return screeningQuestions
      case 'pre_study':
        return preStudyQuestions
      case 'post_study':
        return postStudyQuestions
      case 'survey':
        return surveyQuestions
      default:
        return []
    }
  }, [section, screeningQuestions, preStudyQuestions, postStudyQuestions, surveyQuestions])

  // Find questions that reference this question in their conditions
  const referencingQuestions = useMemo(() => {
    return findQuestionsReferencingId(question.id, sectionQuestions)
  }, [question.id, sectionQuestions])

  // Get labels for referencing questions
  const referencingLabels = useMemo(() => {
    return referencingQuestions.map((id) => {
      const q = sectionQuestions.find((sq) => sq.id === id)
      if (!q) return `Question`
      const idx = sectionQuestions.findIndex((sq) => sq.id === id)
      const text = stripHtml(q.question_text).slice(0, 30)
      return `Q${idx + 1}: ${text}${text.length >= 30 ? '...' : ''}`
    })
  }, [referencingQuestions, sectionQuestions])

  const handleToggle = () => {
    setExpandedQuestionId(isExpanded ? null : question.id)
  }

  const handleDeleteClick = () => {
    if (referencingQuestions.length > 0) {
      // Show confirmation dialog if question is referenced
      setShowDeleteDialog(true)
    } else {
      // Delete directly if not referenced
      removeQuestion(section, question.id)
    }
  }

  const handleConfirmDelete = () => {
    // Clean up references in all referencing questions
    for (const refId of referencingQuestions) {
      const refQuestion = sectionQuestions.find((q) => q.id === refId)
      if (refQuestion) {
        const cleanedQuestion = removeConditionReferences(refQuestion, question.id)
        updateQuestion(refId, cleanedQuestion)
      }
    }
    // Then delete the question
    removeQuestion(section, question.id)
    setShowDeleteDialog(false)
  }

  const handleDuplicate = () => {
    duplicateQuestion(section, question.id)
  }

  // Get preview text
  const previewText = stripHtml(question.question_text).slice(0, 60)

  return (
    <div
      ref={(node) => {
        setNodeRef(node)
        ;(highlightRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      }}
      style={style}
      data-item-id={question.id}
      className={cn(
        'relative rounded-lg border bg-card',
        isDragging && 'opacity-50 shadow-lg',
        highlightClassName
      )}
      {...wrapperProps}
    >
      {/* Collaborative presence indicators */}
      {hasPresence && primaryUser && (
        <>
          <PresenceRing color={primaryUser.color} className="rounded-lg" />
          <PresenceBadge user={primaryUser} otherCount={users.length - 1} size="sm" />
        </>
      )}
      <Collapsible open={isExpanded} onOpenChange={handleToggle}>
        <div className="flex items-center gap-2 p-3">
          {/* Drag Handle */}
          <button
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          {/* Question Number & Type Icon */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium">
            {index + 1}
          </div>

          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/50">
            {iconMap[question.question_type]}
          </div>

          {/* Question Preview */}
          <CollapsibleTrigger asChild>
            <button className="flex-1 flex items-center gap-2 min-w-0 text-left hover:bg-muted/50 rounded px-2 py-1 -mx-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {previewText || 'Untitled question'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-xs">
                    {typeLabels[question.question_type]}
                  </Badge>
                  {question.is_required && (
                    <Badge variant="outline" className="text-xs">
                      Required
                    </Badge>
                  )}
                  {question.display_logic && (
                    <Badge variant="outline" className="text-xs">
                      Has Logic
                    </Badge>
                  )}
                  {showBranchingLogic && question.branching_logic && (
                    <Badge variant="outline" className="text-xs text-amber-600">
                      Conditions
                    </Badge>
                  )}
                </div>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDeleteClick}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CollapsibleContent>
          <div className="border-t px-3 pb-4 pt-4">
            <QuestionEditor
              question={question}
              showBranchingLogic={showBranchingLogic}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Deletion Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Question Referenced in Conditions
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This question is referenced in conditions for{' '}
                  {referencingQuestions.length === 1
                    ? 'another question'
                    : `${referencingQuestions.length} other questions`}
                  :
                </p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {referencingLabels.map((label, i) => (
                    <li key={referencingQuestions[i]}>{label}</li>
                  ))}
                </ul>
                <p className="font-medium">
                  Deleting this question will remove those conditions.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
