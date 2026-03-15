'use client'

import { useState } from 'react'
import { cn, truncateText } from '@veritio/ui'
import {
  ChevronRight,
  Plus,
  MoreVertical,
  Trash2,
  Pencil,
  Folder,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@veritio/ui/components/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@veritio/ui/components/alert-dialog'
import { Input } from '@veritio/ui/components/input'
import type { StudyFlowQuestion, SurveyCustomSection } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { questionTypeIcons } from '@veritio/prototype-test/lib/study-flow/question-type-icons'

interface SectionContainerProps {
  section: SurveyCustomSection
  questions: StudyFlowQuestion[]
  isSelected: boolean
  activeQuestionId: string | null
  onSelectSection: () => void
  onSelectQuestion: (questionId: string) => void
  onAddQuestion: () => void
  onDeleteQuestion: (questionId: string) => void
  onDuplicateQuestion: (questionId: string) => void
  onDeleteSection: () => void
  onRenameSection: (newName: string) => void
  onMoveQuestionUp?: (questionId: string) => void
  onMoveQuestionDown?: (questionId: string) => void
  onMoveSectionUp?: () => void
  onMoveSectionDown?: () => void
  canMoveSectionUp?: boolean
  canMoveSectionDown?: boolean
}
export function SectionContainer({
  section,
  questions,
  isSelected,
  activeQuestionId,
  onSelectSection,
  onSelectQuestion,
  onAddQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onDeleteSection,
  onRenameSection,
  onMoveQuestionUp,
  onMoveQuestionDown,
  onMoveSectionUp,
  onMoveSectionDown,
  canMoveSectionUp = false,
  canMoveSectionDown = false,
}: SectionContainerProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(section.name)

  const handleHeaderClick = () => {
    setIsExpanded(!isExpanded)
    onSelectSection()
  }

  const handleSaveRename = () => {
    if (editName.trim() && editName !== section.name) {
      onRenameSection(editName.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename()
    } else if (e.key === 'Escape') {
      setEditName(section.name)
      setIsEditing(false)
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-dashed transition-all',
        isSelected
          ? 'border-border bg-muted/30'
          : 'border-border/50 bg-background hover:border-border'
      )}
    >
      {/* Section Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 cursor-pointer rounded-t-lg',
          isSelected ? 'bg-muted/50' : 'hover:bg-muted/30'
        )}
        onClick={handleHeaderClick}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />

        <ChevronRight
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isExpanded && 'rotate-90'
          )}
        />

        <Folder className="h-4 w-4 text-muted-foreground" />

        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="h-6 px-2 py-0 text-sm font-medium bg-white border-border focus:border-primary"
            autoFocus
          />
        ) : (
          <div className="flex-1 flex items-center gap-1 min-w-0 group/name">
            <span className="text-sm font-medium text-foreground truncate">
              {section.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
              className="p-0.5 rounded opacity-0 group-hover/name:opacity-100 hover:bg-muted transition-all"
              aria-label="Edit section name"
            >
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
              className="cursor-pointer"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            {(onMoveSectionUp || onMoveSectionDown) && (
              <>
                {onMoveSectionUp && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onMoveSectionUp()
                    }}
                    disabled={!canMoveSectionUp}
                    className="cursor-pointer"
                  >
                    <ArrowUp className="mr-2 h-4 w-4" />
                    Move up
                  </DropdownMenuItem>
                )}
                {onMoveSectionDown && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onMoveSectionDown()
                    }}
                    disabled={!canMoveSectionDown}
                    className="cursor-pointer"
                  >
                    <ArrowDown className="mr-2 h-4 w-4" />
                    Move down
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteDialog(true)
              }}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Section Content - Questions */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Questions inside this section */}
          {questions.map((q, idx) => {
            const Icon = questionTypeIcons[q.question_type]
            return (
              <div
                key={q.id}
                className={cn(
                  'group flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-all cursor-pointer',
                  activeQuestionId === q.id
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-white border-border/50 hover:border-border hover:bg-muted/30'
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectQuestion(q.id)
                }}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <p className="text-sm flex-1 min-w-0 truncate">
                  {truncateText(q.question_text || 'Untitled question', 24)}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted cursor-pointer"
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {onMoveQuestionUp && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onMoveQuestionUp(q.id)
                        }}
                        disabled={idx === 0}
                        className="cursor-pointer"
                      >
                        <ArrowUp className="mr-2 h-4 w-4" />
                        Move up
                      </DropdownMenuItem>
                    )}
                    {onMoveQuestionDown && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onMoveQuestionDown(q.id)
                        }}
                        disabled={idx === questions.length - 1}
                        className="cursor-pointer"
                      >
                        <ArrowDown className="mr-2 h-4 w-4" />
                        Move down
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onDuplicateQuestion(q.id)
                      }}
                      className="cursor-pointer"
                    >
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteQuestion(q.id)
                      }}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}

          {/* Add question to section button */}
          <button
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              onAddQuestion()
            }}
          >
            <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm text-primary hover:border-primary hover:bg-primary/10 transition-colors cursor-pointer">
              <Plus className="h-4 w-4" />
              <span>Add question</span>
            </div>
          </button>
        </div>
      )}

      {/* Delete Section Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete section?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{section.name}&quot;?
              {questions.length > 0 && (
                <span className="block mt-2 text-amber-600">
                  This section contains {questions.length} question{questions.length !== 1 ? 's' : ''}.
                  The questions will become ungrouped, not deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDeleteSection()
                setShowDeleteDialog(false)
              }}
            >
              Delete Section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
