import { useState, useCallback, useMemo } from 'react'
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useTreeTestNodes, useTreeTestTasks, useTreeTestActions } from '@/stores/study-builder'
import { useKeyboardShortcut, useNodeMap } from '@/hooks'
import type { Task } from '@veritio/study-types'
import { castJsonArray, toJson } from '@/lib/supabase/json-utils'

interface UseTaskEditorOptions {
  studyId: string
}

/**
 * Hook that encapsulates all task editor state and handlers.
 * Manages task CRUD operations, drag-and-drop reordering, and correct answer selection.
 */
export function useTaskEditor({ studyId }: UseTaskEditorOptions) {
  // Use granular selectors for performance
  const tasks = useTreeTestTasks()
  const nodes = useTreeTestNodes()
  const { addTask, updateTask, removeTask, reorderTasks } = useTreeTestActions()

  // Performance optimization: O(1) node lookups instead of O(n) Array.find
  const nodeMap = useNodeMap(nodes)

  // UI state
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectingNodeForTaskId, setSelectingNodeForTaskId] = useState<string | null>(null)
  const [postTaskQuestionsTaskId, setPostTaskQuestionsTaskId] = useState<string | null>(null)
  const [pendingSelectedNodeIds, setPendingSelectedNodeIds] = useState<string[]>([])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Drag and drop handler
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = tasks.findIndex((task) => task.id === active.id)
        const newIndex = tasks.findIndex((task) => task.id === over.id)

        const newTasks = arrayMove(tasks, oldIndex, newIndex).map((task, index) => ({
          ...task,
          position: index,
        }))

        reorderTasks(newTasks)
      }
    },
    [tasks, reorderTasks]
  )

  // Task CRUD operations
  const handleAddTask = useCallback(
    (question: string) => {
      addTask({
        study_id: studyId,
        question,
        correct_node_id: null,
        correct_node_ids: [],
        position: tasks.length,
      })
      setShowAddForm(false)
    },
    [studyId, tasks.length, addTask]
  )

  const handleUpdateTask = useCallback(
    (question: string) => {
      if (editingTask) {
        updateTask(editingTask.id, { question })
        setEditingTask(null)
      }
    },
    [editingTask, updateTask]
  )

  const handleDeleteTask = useCallback(
    (id: string) => {
      removeTask(id)
    },
    [removeTask]
  )

  // Correct answers dialog handlers
  const openCorrectAnswersDialog = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      const currentIds = castJsonArray<string>(task?.correct_node_ids ?? null)
      setPendingSelectedNodeIds(currentIds)
      setSelectingNodeForTaskId(taskId)
    },
    [tasks]
  )

  const handleSaveCorrectNodes = useCallback(() => {
    if (selectingNodeForTaskId) {
      updateTask(selectingNodeForTaskId, {
        correct_node_ids: toJson(pendingSelectedNodeIds),
      })
      setSelectingNodeForTaskId(null)
      setPendingSelectedNodeIds([])
    }
  }, [selectingNodeForTaskId, pendingSelectedNodeIds, updateTask])

  const handleCancelCorrectNodes = useCallback(() => {
    setSelectingNodeForTaskId(null)
    setPendingSelectedNodeIds([])
  }, [])

  // Keyboard shortcut for saving
  useKeyboardShortcut({
    enabled: selectingNodeForTaskId !== null,
    onCmdEnter: handleSaveCorrectNodes,
  })

  // Enrich tasks with correct node info
  // Performance: Use Map.get (O(1)) instead of Array.find (O(n))
  const enrichedTasks = useMemo(
    () =>
      tasks.map((task) => {
        const correctNodeIds = castJsonArray<string>(task.correct_node_ids)
        return {
          ...task,
          correct_node: task.correct_node_id
            ? (nodeMap.get(task.correct_node_id) ?? null)
            : null,
          correct_nodes: correctNodeIds
            .map((id) => nodeMap.get(id))
            .filter((n): n is typeof n & { id: string; label: string } => n !== undefined)
            .map((n) => ({ id: n.id, label: n.label })),
        }
      }),
    [tasks, nodeMap]
  )

  // Statistics
  const tasksWithoutCorrectAnswer = useMemo(
    () =>
      tasks.filter((t) => {
        const ids = castJsonArray<string>(t.correct_node_ids)
        return ids.length === 0
      }).length,
    [tasks]
  )

  const postTaskQuestionsTask = useMemo(
    () => tasks.find((t) => t.id === postTaskQuestionsTaskId),
    [tasks, postTaskQuestionsTaskId]
  )

  const postTaskQuestionsTaskNumber = postTaskQuestionsTask
    ? tasks.indexOf(postTaskQuestionsTask) + 1
    : 1

  return {
    // Store data
    tasks,
    nodes,
    enrichedTasks,

    // UI state
    showAddForm,
    setShowAddForm,
    editingTask,
    setEditingTask,
    selectingNodeForTaskId,
    postTaskQuestionsTaskId,
    setPostTaskQuestionsTaskId,
    pendingSelectedNodeIds,
    setPendingSelectedNodeIds,

    // Statistics
    tasksWithoutCorrectAnswer,
    postTaskQuestionsTask,
    postTaskQuestionsTaskNumber,

    // DnD
    sensors,
    handleDragEnd,

    // Task operations
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,

    // Correct answers dialog
    openCorrectAnswersDialog,
    handleSaveCorrectNodes,
    handleCancelCorrectNodes,
  }
}
