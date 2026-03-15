'use client'

import { memo, useCallback } from 'react'
import { Plus, MousePointerClick } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import {
  useFirstClickTasks,
  useFirstClickActions,
  type FirstClickTaskWithDetails,
} from '@/stores/study-builder'
import { TaskList } from '../task-list'
import { EmptyStateCard, useDeletionDialog } from '@/components/builders/shared/settings'

interface TasksTabProps {
  studyId: string
}

function TasksTabComponent({ studyId }: TasksTabProps) {
  const tasks = useFirstClickTasks()
  const { addTask, removeTask, reorderTasks } = useFirstClickActions()

  const deletion = useDeletionDialog<string>()

  const handleReorderTasks = useCallback((reorderedTasks: FirstClickTaskWithDetails[]) => {
    const tasksWithPosition = reorderedTasks.map((task, index) => ({
      ...task,
      position: index,
    }))
    reorderTasks(tasksWithPosition)
  }, [reorderTasks])

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col p-6">
        <EmptyStateCard
          icon={MousePointerClick}
          title="No tasks yet"
          description="Create your first task to get started. Each task shows participants an image and asks them where they would click first to complete a goal."
          action={{
            label: 'Add first task',
            icon: Plus,
            onClick: addTask,
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6">
      {/* Header with Add Task button on the right */}
      <div className="flex-shrink-0 mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Tasks</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create tasks for participants to complete. Each task shows an image and asks where they would click first.
          </p>
        </div>
        <Button variant="secondary" onClick={addTask} className="flex-shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Scrollable task list */}
      <div className="flex-1 overflow-y-auto">
        <TaskList
          studyId={studyId}
          tasks={tasks}
          onReorder={handleReorderTasks}
          onDelete={deletion.openDialog}
        />
      </div>

      <DeleteConfirmationDialog
        open={deletion.isOpen}
        onOpenChange={(open) => !open && deletion.closeDialog()}
        onConfirm={() => deletion.confirmDeletion(removeTask)}
        title="Delete task?"
        description="This will permanently delete this task and all associated data. This action cannot be undone."
      />
    </div>
  )
}

export const TasksTab = memo(
  TasksTabComponent,
  (prev, next) => prev.studyId === next.studyId
)
