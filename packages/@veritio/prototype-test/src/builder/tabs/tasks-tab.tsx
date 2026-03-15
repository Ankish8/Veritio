'use client'

import { memo, useCallback, useEffect } from 'react'
import { Figma, ListChecks, Plus } from 'lucide-react'
import { Button, DeleteConfirmationDialog } from '@veritio/ui'
import {
  usePrototypeTestPrototype,
  usePrototypeTestFrames,
  usePrototypeTestTasks,
  usePrototypeTestActions,
} from '../../stores/prototype-test-builder'
import { TaskList } from '../task-list'
import { EmptyStateCard, useDeletionDialog } from '../shared/settings'
import type { PrototypeTestTask } from '@veritio/study-types'

interface PrototypeTasksTabProps {
  studyId: string
}

function PrototypeTasksTabComponent({ studyId }: PrototypeTasksTabProps) {
  // Use granular selectors for performance - each only subscribes to its slice
  const prototype = usePrototypeTestPrototype()
  const frames = usePrototypeTestFrames()
  const tasks = usePrototypeTestTasks()
  const { addTask, updateTask, removeTask, reorderTasks } = usePrototypeTestActions()

  // Use shared deletion dialog hook
  const deletion = useDeletionDialog<string>()

  const handleAddTask = useCallback(() => {
    // Use the prototype's configured starting frame, or fall back to first frame
    // Users can set the starting frame in the Prototype Preview header
    const defaultStartFrameId = prototype?.starting_frame_id || frames[0]?.id || null

    addTask({
      study_id: studyId,
      title: `Task ${tasks.length + 1}`,
      instruction: '',
      start_frame_id: defaultStartFrameId,
      flow_type: 'task_flow',
      success_criteria_type: 'destination',  // Default to destination-based success criteria
      success_frame_ids: [],
      success_pathway: null,
      time_limit_ms: null,
      position: tasks.length,
      enable_interactive_components: null,
      success_component_states: null,
    } as any)
  }, [studyId, tasks.length, frames, prototype, addTask])

  const handleUpdateTask = useCallback((id: string, updates: Partial<PrototypeTestTask>) => {
    updateTask(id, updates)
  }, [updateTask])

  const handleReorderTasks = useCallback((reorderedTasks: PrototypeTestTask[]) => {
    reorderTasks(reorderedTasks)
  }, [reorderTasks])

  // Listen for keyboard shortcut events
  useEffect(() => {
    const handleKeyboardAddTask = () => {
      // Only add task if prototype is connected
      if (prototype) {
        handleAddTask()
      }
    }

    window.addEventListener('builder:add-prototype-task', handleKeyboardAddTask)
    return () => {
      window.removeEventListener('builder:add-prototype-task', handleKeyboardAddTask)
    }
  }, [handleAddTask, prototype])

  // No prototype connected yet - show helpful empty state
  if (!prototype) {
    return (
      <EmptyStateCard
        icon={Figma}
        title="Import a prototype first"
        description="Connect your Figma prototype to start creating tasks. Each task guides participants through specific flows in your design."
        secondaryContent={
          <>
            <ListChecks className="h-3.5 w-3.5" />
            <span>Go to the <span className="font-medium text-muted-foreground">Prototype</span> tab to get started</span>
          </>
        }
      />
    )
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Tasks</h2>
            <p className="text-sm text-muted-foreground">
              Create tasks for participants to complete in the prototype.
              Each task has a starting screen and one or more goal screens.
            </p>
          </div>
          <Button variant="secondary" onClick={handleAddTask} className="flex-shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <TaskList
            tasks={tasks}
            frames={frames}
            prototype={prototype}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={deletion.openDialog}
            onReorderTasks={handleReorderTasks}
          />
        </div>
      </div>

      <DeleteConfirmationDialog
        open={deletion.isOpen}
        onOpenChange={(open) => !open && deletion.closeDialog()}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        onConfirm={() => deletion.confirmDeletion(removeTask)}
      />
    </>
  )
}

export const PrototypeTasksTab = memo(
  PrototypeTasksTabComponent,
  (prev, next) => prev.studyId === next.studyId
)
