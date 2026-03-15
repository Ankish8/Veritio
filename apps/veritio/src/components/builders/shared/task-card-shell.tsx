'use client'

import { useState, type ReactNode } from 'react'
import {
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

export interface TaskCardShellProps {
  /** Task number displayed in the header */
  taskNumber: number
  /** Title preview shown in collapsed header */
  titlePreview: string
  /** Whether the card is being dragged */
  isDragging?: boolean
  /** Props spread on the drag handle element */
  dragHandleProps?: Record<string, unknown>
  /** Called when delete button is clicked */
  onDelete: () => void
  /** Optional badges to show in the header */
  headerBadges?: ReactNode
  /** Main content area (study-type specific fields) */
  children: ReactNode
  /** Footer content (typically post-task questions) */
  footer?: ReactNode
  /** Initial expanded state (default: true) */
  defaultExpanded?: boolean
  /** External control of expanded state */
  expanded?: boolean
  /** Callback when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void
}

export function TaskCardShell({
  taskNumber,
  titlePreview,
  isDragging = false,
  dragHandleProps,
  onDelete,
  headerBadges,
  children,
  footer,
  defaultExpanded = true,
  expanded: controlledExpanded,
  onExpandedChange,
}: TaskCardShellProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)

  // Support both controlled and uncontrolled modes
  const isExpanded = controlledExpanded ?? internalExpanded
  const setIsExpanded = onExpandedChange ?? setInternalExpanded

  return (
    <div
      className={cn(
        'border rounded-lg bg-card',
        isDragging && 'opacity-50 ring-2 ring-primary'
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          {/* Drag handle */}
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Task number pill */}
          <span className="flex-shrink-0 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
            {taskNumber}
          </span>

          {/* Title preview */}
          <span className="flex-1 text-sm font-medium truncate text-foreground">
            {titlePreview}
          </span>

          {/* Optional badges */}
          {headerBadges}

          {/* Actions */}
          <div className="flex items-center gap-1">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <CollapsibleContent>
          <div className="p-5">
            {children}

            {/* Footer (typically post-task questions) */}
            {footer && (
              <div className="mt-6 pt-5 border-t border-border/50">
                {footer}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export interface PostTaskQuestionsSectionProps {
  /** Number of existing questions */
  questionCount: number
  /** Called when the add/edit button is clicked */
  onOpenEditor: () => void
}

export function PostTaskQuestionsSection({
  questionCount,
  onOpenEditor,
}: PostTaskQuestionsSectionProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="text-sm font-medium">Post-task Questions</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ask participants questions after they complete this task
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onOpenEditor}>
        <Plus className="h-4 w-4 mr-2" />
        {questionCount > 0 ? 'Edit Questions' : 'Add Questions'}
        {questionCount > 0 && (
          <Badge variant="secondary" className="ml-2">
            {questionCount}
          </Badge>
        )}
      </Button>
    </div>
  )
}
