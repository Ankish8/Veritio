'use client'

import { memo, useCallback, useEffect, useState } from 'react'
import { Plus, Globe } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import {
  useLiveWebsiteTasks,
  useLiveWebsiteSettings,
  useLiveWebsiteActions,
  useLiveWebsiteVariants,
  useLiveWebsiteTaskVariants,
  useLiveWebsiteSelectedVariantId,
  useLiveWebsiteBuilderStore,
  type LiveWebsiteTask,
} from '@/stores/study-builder'
import { EmptyStateCard, useDeletionDialog } from '@/components/builders/shared/settings'
import { useValidationHighlightStore } from '@/stores/validation-highlight-store'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { SortableTaskCard } from './sortable-task-card'

interface TasksTabProps {
  studyId: string
}

function TasksTabComponent({ studyId }: TasksTabProps) {
  const tasks = useLiveWebsiteTasks()
  const settings = useLiveWebsiteSettings()
  const abTestingEnabled = (settings as any).abTestingEnabled === true
  const variants = useLiveWebsiteVariants()
  const taskVariants = useLiveWebsiteTaskVariants()
  const selectedVariantId = useLiveWebsiteSelectedVariantId()
  const {
    addTask, removeTask, reorderTasks, updateTask,
    addPostTaskQuestion, updatePostTaskQuestion, removePostTaskQuestion, reorderPostTaskQuestions,
  } = useLiveWebsiteActions()
  const setTaskVariantCriteria = useLiveWebsiteBuilderStore((s: any) => s.setTaskVariantCriteria)
  const deletion = useDeletionDialog<string>()
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleAddTask = useCallback(() => {
    const newId = addTask()
    setExpandedTaskId(newId)
  }, [addTask])

  const handleReorder = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = tasks.findIndex((t: LiveWebsiteTask) => t.id === active.id)
        const newIndex = tasks.findIndex((t: LiveWebsiteTask) => t.id === over.id)
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove([...tasks], oldIndex, newIndex).map(
            (task: LiveWebsiteTask, i: number) => ({
              ...task,
              order_position: i,
            })
          )
          reorderTasks(reordered)
        }
      }
    },
    [tasks, reorderTasks]
  )

  const toggleExpanded = useCallback((id: string) => {
    setExpandedTaskId((prev) => (prev === id ? null : id))
  }, [])

  // Auto-expand task when validation navigates to it
  const highlightedItemId = useValidationHighlightStore((state) => state.highlightedItemId)
  useEffect(() => {
    if (highlightedItemId && tasks.some((t: LiveWebsiteTask) => t.id === highlightedItemId)) {
      setExpandedTaskId(highlightedItemId) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [highlightedItemId, tasks])

  const supportsUrlPath = settings.mode !== 'url_only'

  const taskListContent = (
    <div className="flex-1 flex flex-col overflow-hidden p-6">
      <div className="flex-shrink-0 mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Tasks</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {abTestingEnabled
              ? 'Tasks are shared across all variants. Configure per-variant success criteria by expanding each task.'
              : 'Create tasks for participants to complete on your live website.'}
          </p>
        </div>
        <Button onClick={handleAddTask} className="flex-shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyStateCard
          icon={Globe}
          title="No tasks yet"
          description="Create your first task to get started. Each task sends participants to a URL on your live website and measures how they complete a goal."
          action={{
            label: 'Add first task',
            icon: Plus,
            onClick: handleAddTask,
          }}
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleReorder}
          >
            <SortableContext
              items={tasks.map((t: LiveWebsiteTask) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div role="list" aria-label="Task list" className="space-y-3">
                {tasks.map((task: LiveWebsiteTask, index: number) => (
                  <SortableTaskCard
                    key={task.id}
                    task={task}
                    tasks={tasks}
                    taskNumber={index + 1}
                    isExpanded={expandedTaskId === task.id}
                    onToggleExpand={() => toggleExpanded(task.id)}
                    onUpdate={(updates) => updateTask(task.id, updates)}
                    onDelete={() => deletion.openDialog(task.id)}
                    websiteUrl={abTestingEnabled
                      ? (variants.find(v => v.id === selectedVariantId)?.url ?? settings.websiteUrl)
                      : settings.websiteUrl}
                    supportsUrlPath={supportsUrlPath}
                    trackingMode={settings.mode}
                    studyId={studyId}
                    snippetId={settings.snippetId}
                    postTaskActions={{
                      addPostTaskQuestion,
                      updatePostTaskQuestion,
                      removePostTaskQuestion,
                      reorderPostTaskQuestions,
                    }}
                    abTestingEnabled={abTestingEnabled}
                    variants={variants}
                    taskVariants={taskVariants.filter(tv => tv.task_id === task.id)}
                    onSetTaskVariantCriteria={setTaskVariantCriteria}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <DeleteConfirmationDialog
        open={deletion.isOpen}
        onOpenChange={(open) => !open && deletion.closeDialog()}
        onConfirm={() => deletion.confirmDeletion(removeTask)}
        title="Delete task?"
        description="This will permanently delete this task and all associated data. This action cannot be undone."
      />
    </div>
  )

  return taskListContent
}

export const TasksTab = memo(
  TasksTabComponent,
  (prev, next) => prev.studyId === next.studyId
)
