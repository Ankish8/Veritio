'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Plus } from 'lucide-react'
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@veritio/ui'
import { TaskItem } from './task-item'
import { PathwayBuilderModal, type PathwayBuilderResult } from './pathway-builder-modal'
import { PathManagementModal } from './path-management-modal'
import { GenericPostTaskQuestionsModal } from './shared/post-task-questions-modal'
import { usePrototypeTestActions, usePrototypeTestStudyId } from '../stores/prototype-test-builder'
import { useAuthFetch } from '../hooks'
import type { ComponentVariantData, ComponentInstanceData } from './composite-thumbnail'
import type { PrototypeTestTask, PrototypeTestFrame, PrototypeTestPrototype, SuccessPathway, SuccessPath } from '@veritio/study-types'
import {
  getPathsV3FromPathway,
  addPathToPathwayV3,
  updatePathInPathwayV3,
  updatePathInPathway,
  removePathFromPathway,
  setPathAsPrimary,
  createPathV3,
  reorderPathsInPathway,
  stepsToFrames,
  framesToSteps,
} from '../lib/utils/pathway-migration'
import type { PathwayStep, SuccessPathwayV3 } from '@veritio/study-types'

interface TaskListProps {
  tasks: PrototypeTestTask[]
  frames: PrototypeTestFrame[]
  prototype: PrototypeTestPrototype | null
  onAddTask: () => void
  onAddFreeFlow?: () => void
  onUpdateTask: (id: string, updates: Partial<PrototypeTestTask>) => void
  onDeleteTask: (id: string) => void
  onReorderTasks: (tasks: PrototypeTestTask[]) => void
}

function SortableTaskItem({
  task,
  studyId,
  index,
  frames,
  prototype,
  componentVariants,
  componentInstances,
  onUpdate,
  onDelete,
  onConfigureTaskFlow,
  onOpenPostTaskQuestions,
}: {
  task: PrototypeTestTask
  studyId: string
  index: number
  frames: PrototypeTestFrame[]
  prototype: PrototypeTestPrototype | null
  componentVariants: ComponentVariantData[]
  componentInstances: ComponentInstanceData[]
  onUpdate: (updates: Partial<PrototypeTestTask>) => void
  onDelete: () => void
  onConfigureTaskFlow: () => void
  onOpenPostTaskQuestions: () => void
}) {
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
    <div ref={setNodeRef} style={style}>
      <TaskItem
        task={task}
        studyId={studyId}
        index={index}
        frames={frames}
        prototype={prototype}
        componentVariants={componentVariants}
        componentInstances={componentInstances}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onConfigureTaskFlow={onConfigureTaskFlow}
        onOpenPostTaskQuestions={onOpenPostTaskQuestions}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  )
}

export function TaskList({
  tasks,
  frames,
  prototype,
  onAddTask,
  onAddFreeFlow,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
}: TaskListProps) {
  const [pathwayBuilder, setPathwayBuilder] = useState<{
    open: boolean
    taskId: string
    editingPathId?: string
    initialName?: string
    initialPath?: string[]
    initialSteps?: PathwayStep[]
  }>({ open: false, taskId: '' })

  // Path management modal state (for managing existing paths)
  const [pathManagement, setPathManagement] = useState<{
    open: boolean
    taskId: string
  }>({ open: false, taskId: '' })

  // Post-task questions modal state
  const [postTaskQuestions, setPostTaskQuestions] = useState<{
    open: boolean
    taskId: string
  }>({ open: false, taskId: '' })

  // Get studyId and post-task question actions from the store
  const studyId = usePrototypeTestStudyId()
  const {
    addPostTaskQuestion,
    updatePostTaskQuestion,
    removePostTaskQuestion,
    reorderPostTaskQuestions,
  } = usePrototypeTestActions()

  // Component variant/instance data for composite thumbnails in task cards
  const [componentVariants, setComponentVariants] = useState<ComponentVariantData[]>([])
  const [componentInstances, setComponentInstances] = useState<ComponentInstanceData[]>([])
  const authFetch = useAuthFetch()

  // Fetch component data once when prototype is available
  useEffect(() => {
    if (!prototype?.id || !prototype.study_id) return

    const sid = prototype.study_id
    authFetch(`/api/studies/${sid}/prototype/component-variants`)
      .then((res) => res.ok ? res.json() : null)
      .then((response: { data: { variants: ComponentVariantData[] } } | null) => {
        if (response?.data?.variants) setComponentVariants(response.data.variants)
      })
      .catch(() => {})

    authFetch(`/api/studies/${sid}/prototype/component-instances`)
      .then((res) => res.ok ? res.json() : null)
      .then((response: { data: { instances: ComponentInstanceData[] } } | null) => {
        if (response?.data?.instances) setComponentInstances(response.data.instances)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prototype?.id, prototype?.study_id])

  // Memoize sensor options to prevent DndContext reset on re-renders
  const pointerSensorOptions = useMemo(() => ({
    activationConstraint: { distance: 8 },
  }), [])

  const sensors = useSensors(
    useSensor(PointerSensor, pointerSensorOptions),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tasks.findIndex((t) => t.id === active.id)
    const newIndex = tasks.findIndex((t) => t.id === over.id)

    if (oldIndex !== newIndex) {
      const reordered = arrayMove(tasks, oldIndex, newIndex).map((task, idx) => ({
        ...task,
        position: idx,
      }))
      onReorderTasks(reordered)
    }
  }

  // Trigger immediate save to prevent data loss if user reloads before auto-save debounce (3s) fires.
  function triggerImmediateSave() {
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('builder:save'))
      })
    }
  }

  const handlePathwaySave = useCallback((result: PathwayBuilderResult) => {
    const task = tasks.find((t) => t.id === pathwayBuilder.taskId)
    if (!task) return

    // Handle clearing the path (empty frames when editing)
    if (result.frames.length === 0) {
      onUpdateTask(pathwayBuilder.taskId, {
        success_criteria_type: 'pathway',
        success_pathway: null as any,
        success_frame_ids: [],
      })
      setPathwayBuilder({ open: false, taskId: '' })
      triggerImmediateSave()
      return
    }

    let newPathway: SuccessPathwayV3

    // Handle both V3 (with steps) and V2 (frames only) formats
    // Convert frames to steps if steps not provided
    const steps = result.steps ?? framesToSteps(result.frames)

    if (result.editingPathId) {
      // Editing existing path - update it with V3 format (steps + frames)
      newPathway = updatePathInPathwayV3(
        task.success_pathway as SuccessPathway,
        result.editingPathId,
        { steps, frames: result.frames, name: result.name }
      )
    } else {
      // Adding new path with V3 format
      const newPath = createPathV3(steps, result.name)
      newPathway = addPathToPathwayV3(task.success_pathway as SuccessPathway, newPath)
    }

    // Get frame IDs for backwards compatibility (from steps)
    const frameIds = stepsToFrames(steps)

    // Check if pathway has any state steps - if so, auto-enable interactive components
    const hasStateSteps = steps.some((step) => step.type === 'state')

    onUpdateTask(pathwayBuilder.taskId, {
      success_criteria_type: 'pathway',
      success_pathway: newPathway as any,
      // Last frame of primary path is the destination (for backwards compat)
      success_frame_ids: frameIds.length > 0 ? [frameIds[frameIds.length - 1]] : [],
      // Auto-enable interactive components when pathway has state steps
      ...(hasStateSteps && { enable_interactive_components: true }),
    })
    setPathwayBuilder({ open: false, taskId: '' })
    triggerImmediateSave()
  }, [pathwayBuilder.taskId, tasks, onUpdateTask])

  // Helper to look up the task associated with the currently open path management modal
  const getManagementTask = useCallback(() => {
    return tasks.find((t) => t.id === pathManagement.taskId)
  }, [tasks, pathManagement.taskId])

  // Open pathway builder to create or edit task flow configuration
  const openPathwayBuilder = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)

    // If task already has a saved pathway, open in edit mode with existing data
    if (task?.success_pathway) {
      const paths = getPathsV3FromPathway(task.success_pathway as SuccessPathway)
      const primaryPath = paths.find((p) => p.is_primary) || paths[0]

      if (primaryPath && primaryPath.frames.length > 0) {
        setPathwayBuilder({
          open: true,
          taskId,
          editingPathId: primaryPath.id,
          initialName: primaryPath.name,
          initialPath: primaryPath.frames,
          initialSteps: primaryPath.steps,
        })
        return
      }
    }

    // No existing path — open fresh
    setPathwayBuilder({
      open: true,
      taskId,
      editingPathId: undefined,
      initialName: undefined,
      initialPath: undefined,
    })
  }

  // Open path management modal (for viewing/managing existing paths)
  const openPathManagement = useCallback((taskId: string) => {
    setPathManagement({ open: true, taskId })
  }, [])

  // Open post-task questions modal
  const openPostTaskQuestions = useCallback((taskId: string) => {
    setPostTaskQuestions({ open: true, taskId })
  }, [])

  // Open pathway builder to add a new path (from management modal)
  const handleAddPath = useCallback(() => {
    // Use the task ID from the currently open management modal
    const taskId = pathManagement.taskId
    if (!taskId) return

    setPathwayBuilder({
      open: true,
      taskId,
      editingPathId: undefined,
      initialName: undefined,
      initialPath: undefined,
    })
  }, [pathManagement.taskId])

  // Open pathway builder to edit an existing path (from management modal)
  const handleEditPath = useCallback((pathId: string) => {
    const task = getManagementTask()
    if (!task) return
    const taskId = pathManagement.taskId

    // Use V3 paths to get full step information (including state steps)
    const paths = getPathsV3FromPathway(task.success_pathway as SuccessPathway)
    const pathToEdit = paths.find((p) => p.id === pathId)
    if (!pathToEdit) return

    setPathwayBuilder({
      open: true,
      taskId,
      editingPathId: pathId,
      initialName: pathToEdit.name,
      initialPath: pathToEdit.frames,
      initialSteps: pathToEdit.steps, // Pass V3 steps for full state step support
    })
  }, [getManagementTask, pathManagement.taskId])

  // Remove a path from the current task (in management modal)
  const handleRemovePath = useCallback((pathId: string) => {
    const task = getManagementTask()
    if (!task) return

    const newPathway = removePathFromPathway(task.success_pathway as SuccessPathway, pathId)
    onUpdateTask(pathManagement.taskId, {
      success_pathway: newPathway as any,
    })
  }, [getManagementTask, pathManagement.taskId, onUpdateTask])

  // Set a path as primary (in management modal)
  const handleSetPrimaryPath = useCallback((pathId: string) => {
    const task = getManagementTask()
    if (!task) return

    const newPathway = setPathAsPrimary(task.success_pathway as SuccessPathway, pathId)
    onUpdateTask(pathManagement.taskId, {
      success_pathway: newPathway as any,
    })
  }, [getManagementTask, pathManagement.taskId, onUpdateTask])

  // Rename a path (in management modal)
  const handleRenamePath = useCallback((pathId: string, name: string) => {
    const task = getManagementTask()
    if (!task) return

    const newPathway = updatePathInPathway(task.success_pathway as SuccessPathway, pathId, { name })
    onUpdateTask(pathManagement.taskId, {
      success_pathway: newPathway as any,
    })
  }, [getManagementTask, pathManagement.taskId, onUpdateTask])

  // Reorder paths via drag-and-drop (in management modal)
  const handleReorderPaths = useCallback((reorderedPaths: SuccessPath[]) => {
    const task = getManagementTask()
    if (!task) return

    const newPathway = reorderPathsInPathway(task.success_pathway as SuccessPathway, reorderedPaths)
    onUpdateTask(pathManagement.taskId, {
      success_pathway: newPathway as any,
    })
  }, [getManagementTask, pathManagement.taskId, onUpdateTask])

  const pathwayTask = tasks.find((t) => t.id === pathwayBuilder.taskId)
  const pathManagementTask = getManagementTask()
  const pathManagementPaths = pathManagementTask
    ? getPathsV3FromPathway(pathManagementTask.success_pathway as SuccessPathway)
    : []

  return (
    <div className="space-y-4">
      {tasks.length === 0 ? (
        <button
          type="button"
          onClick={onAddTask}
          className="w-full rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center hover:bg-muted/40 hover:border-muted-foreground/30 transition-colors group"
        >
          <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            <Plus className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Add your first task
          </p>
        </button>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <SortableTaskItem
                  key={task.id}
                  task={task}
                  studyId={studyId ?? ''}
                  index={index}
                  frames={frames}
                  prototype={prototype}
                  componentVariants={componentVariants}
                  componentInstances={componentInstances}
                  onUpdate={(updates) => onUpdateTask(task.id, updates)}
                  onDelete={() => onDeleteTask(task.id)}
                  onConfigureTaskFlow={() => openPathwayBuilder(task.id)}
                  onOpenPostTaskQuestions={() => openPostTaskQuestions(task.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Pathway Builder Modal (unified task flow configuration) */}
      <PathwayBuilderModal
        open={pathwayBuilder.open}
        onOpenChange={(open) => {
          if (!open) setPathwayBuilder({ open: false, taskId: '' })
        }}
        prototype={prototype!}
        frames={frames}
        startFrameId={pathwayTask?.start_frame_id}
        initialPath={pathwayBuilder.initialPath || []}
        initialSteps={pathwayBuilder.initialSteps}
        initialName={pathwayBuilder.initialName || ''}
        editingPathId={pathwayBuilder.editingPathId}
        onSave={handlePathwaySave}
      />

      {/* Path Management Modal */}
      <PathManagementModal
        open={pathManagement.open}
        onOpenChange={(open) => {
          if (!open) setPathManagement({ open: false, taskId: '' })
        }}
        paths={pathManagementPaths}
        frames={frames}
        componentVariants={componentVariants}
        componentInstances={componentInstances}
        onAddPath={handleAddPath}
        onEditPath={handleEditPath}
        onRemovePath={handleRemovePath}
        onSetPrimary={handleSetPrimaryPath}
        onRenamePath={handleRenamePath}
        onReorderPaths={handleReorderPaths}
      />

      {/* Post-Task Questions Modal */}
      <GenericPostTaskQuestionsModal
        open={postTaskQuestions.open}
        onOpenChange={(open) => {
          if (!open) setPostTaskQuestions({ open: false, taskId: '' })
        }}
        taskId={postTaskQuestions.taskId}
        taskNumber={tasks.findIndex((t) => t.id === postTaskQuestions.taskId) + 1}
        studyId={studyId ?? ''}
        tasks={tasks}
        actions={{
          addPostTaskQuestion,
          updatePostTaskQuestion,
          removePostTaskQuestion,
          reorderPostTaskQuestions,
        }}
      />
    </div>
  )
}
