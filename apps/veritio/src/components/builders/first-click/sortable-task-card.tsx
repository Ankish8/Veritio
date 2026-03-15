'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './task-card'
import type { FirstClickTaskWithDetails } from '@/stores/study-builder'

interface SortableTaskCardProps {
  task: FirstClickTaskWithDetails
  taskNumber: number
  studyId: string
  onDelete: () => void
}

export function SortableTaskCard({ task, taskNumber, studyId, onDelete }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} role="listitem">
      <TaskCard
        task={task}
        taskNumber={taskNumber}
        studyId={studyId}
        onDelete={onDelete}
        dragHandleProps={{
          ...attributes,
          ...listeners,
          'aria-roledescription': 'sortable task',
          'aria-label': `Task ${taskNumber}: ${task.instruction?.split('\n')[0]?.slice(0, 40) || 'Untitled'}`,
        }}
        isDragging={isDragging}
      />
    </div>
  )
}
