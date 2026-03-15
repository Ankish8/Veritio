'use client'

import { memo } from 'react'
import { cn, truncateText } from '@veritio/ui'
import { MoreVertical, Copy, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@veritio/ui/components/dropdown-menu'
import { questionTypeIcons } from '@veritio/prototype-test/lib/study-flow/question-type-icons'
import type { StudyFlowQuestion } from '@veritio/prototype-test/lib/supabase/study-flow-types'

export interface QuestionListItemProps {
  question: StudyFlowQuestion
  isActive: boolean
  index: number
  onSelect: () => void
  onDuplicate: () => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}
export const QuestionListItem = memo(function QuestionListItem({
  question,
  isActive,
  index,
  onSelect,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: QuestionListItemProps) {
  const Icon = questionTypeIcons[question.question_type]

  return (
    <div
      className={cn(
        'group flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-all cursor-pointer overflow-hidden',
        isActive
          ? 'bg-primary/5 border-primary/30'
          : 'bg-background border-border/50 hover:border-border hover:bg-muted/30'
      )}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      aria-current={isActive ? 'step' : undefined}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
      <p className="text-sm flex-1 min-w-0 truncate">
        {truncateText(question.question_text || 'Untitled question', 24)}
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted cursor-pointer"
            aria-label={`Actions for question ${index + 1}`}
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {onMoveUp && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onMoveUp()
              }}
              disabled={!canMoveUp}
              className="cursor-pointer"
            >
              <ArrowUp className="mr-2 h-4 w-4" />
              Move up
            </DropdownMenuItem>
          )}
          {onMoveDown && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onMoveDown()
              }}
              disabled={!canMoveDown}
              className="cursor-pointer"
            >
              <ArrowDown className="mr-2 h-4 w-4" />
              Move down
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              onDuplicate()
            }}
            className="cursor-pointer"
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
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
})
