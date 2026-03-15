'use client'

import { useCallback, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { FirstClickTaskWithDetails } from '@/stores/study-builder'
import { SortableTaskCard } from './sortable-task-card'

interface TaskListProps {
  studyId: string
  tasks: FirstClickTaskWithDetails[]
  onReorder: (tasks: FirstClickTaskWithDetails[]) => void
  onDelete: (taskId: string) => void
}

export function TaskList({ studyId, tasks, onReorder, onDelete }: TaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks])

  const getTaskLabel = useCallback(
    (id: string | number) => {
      const idx = tasks.findIndex((t) => t.id === id)
      if (idx === -1) return `Task`
      const task = tasks[idx]
      const preview = task.instruction?.split('\n')[0]?.slice(0, 40) || 'Untitled'
      return `Task ${idx + 1}: ${preview}`
    },
    [tasks]
  )

  const announcements = useMemo(
    () => ({
      onDragStart: ({ active }: { active: { id: string | number } }) =>
        `Picked up ${getTaskLabel(active.id)}.`,
      onDragOver: ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) =>
        over ? `${getTaskLabel(active.id)} is over ${getTaskLabel(over.id)}.` : undefined,
      onDragEnd: ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) =>
        over
          ? `${getTaskLabel(active.id)} was dropped on ${getTaskLabel(over.id)}.`
          : `${getTaskLabel(active.id)} was dropped.`,
      onDragCancel: ({ active }: { active: { id: string | number } }) =>
        `Dragging was cancelled. ${getTaskLabel(active.id)} was returned to its original position.`,
    }),
    [getTaskLabel]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = tasks.findIndex((t) => t.id === active.id)
        const newIndex = tasks.findIndex((t) => t.id === over.id)
        if (oldIndex !== -1 && newIndex !== -1) {
          onReorder(arrayMove(tasks, oldIndex, newIndex))
        }
      }
    },
    [tasks, onReorder]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{ announcements }}
    >
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div role="list" aria-label="Task list" className="space-y-4">
          {tasks.map((task, index) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              taskNumber={index + 1}
              studyId={studyId}
              onDelete={() => onDelete(task.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
