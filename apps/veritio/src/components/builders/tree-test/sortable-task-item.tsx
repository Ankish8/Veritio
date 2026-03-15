'use client'

import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Target,
  AlertCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PresenceBadge, PresenceRing } from '@/components/yjs'
import { useValidationHighlight } from '@/hooks/use-validation-highlight'
import { useCollaborativeField } from '@veritio/yjs'
import { castJsonArray } from '@/lib/supabase/json-utils'
import type { Task, PostTaskQuestion } from '@veritio/study-types'

export interface SortableTaskItemProps {
  task: Task & {
    correct_node?: { id: string; label: string } | null
    correct_nodes?: Array<{ id: string; label: string }>
  }
  studyId: string
  taskNumber: number
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onSelectCorrectNodes: (taskId: string) => void
  onOpenPostTaskQuestions: (taskId: string) => void
}

export const SortableTaskItem = memo(function SortableTaskItem({
  task,
  studyId,
  taskNumber,
  onEdit,
  onDelete,
  onSelectCorrectNodes,
  onOpenPostTaskQuestions,
}: SortableTaskItemProps) {
  // Collaborative presence
  const { hasPresence, primaryUser, users, wrapperProps } = useCollaborativeField({
    locationId: `${studyId}:tree-task:${task.id}`,
  })

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const { ref: highlightRef, highlightClassName } = useValidationHighlight(task.id)
  const postTaskQuestions = castJsonArray<PostTaskQuestion>(task.post_task_questions)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={(node) => {
        setNodeRef(node)
        // eslint-disable-next-line react-hooks/immutability
        ;(highlightRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      }}
      style={style}
      data-item-id={task.id}
      className={`relative rounded-lg border bg-background p-4 ${isDragging ? 'opacity-50' : ''} ${highlightClassName}`}
      {...wrapperProps}
    >
      {/* Collaborative presence ring */}
      {hasPresence && primaryUser && (
        <PresenceRing color={primaryUser.color} className="rounded-lg" />
      )}
      <div className="flex items-center gap-2">
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-muted-foreground">Task {taskNumber}</span>
        <div className="flex-1" />
        {/* Collaborative presence badge - inline to avoid overflow clipping */}
        {hasPresence && primaryUser && (
          <PresenceBadge user={primaryUser} otherCount={users.length - 1} size="sm" position="inline" />
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(task)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-3 pl-6 mt-2">
        <p className="text-sm">{task.question || 'Enter task text here'}</p>

        {/* Correct Answer */}
        <div>
          {task.correct_nodes && task.correct_nodes.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => onSelectCorrectNodes(task.id)}
            >
              <Target className="h-4 w-4 mr-2" />
              {task.correct_nodes.map((n) => n.label).join(', ')}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => onSelectCorrectNodes(task.id)}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Set correct answer
            </Button>
          )}
        </div>

        {/* Post-task Questions - clearly separated section */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-medium text-muted-foreground">Post-task Questions</span>
              <p className="text-xs text-muted-foreground/70">Asked after participant completes this task</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenPostTaskQuestions(task.id)}
            >
              {postTaskQuestions.length > 0 ? (
                <Pencil className="h-4 w-4 mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {postTaskQuestions.length > 0 ? 'Edit Questions' : 'Add Questions'}
              {postTaskQuestions.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {postTaskQuestions.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
})
