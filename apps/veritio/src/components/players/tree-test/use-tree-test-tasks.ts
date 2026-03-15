import { useState, useMemo, useCallback, useRef } from 'react'
import type { Task, TreeNode, PostTaskQuestion } from '@veritio/study-types'
import { castJsonArray } from '@/lib/supabase/json-utils'
import type { TaskResult, PostTaskQuestionResponse } from './types'

interface TaskQuestionResponses {
  taskId: string
  responses: PostTaskQuestionResponse[]
}

interface UseTreeTestTasksOptions {
  initialTasks: Task[]
  nodes: TreeNode[]
  randomizeTasks: boolean
  dontRandomizeFirstTask: boolean
}

export function useTreeTestTasks({
  initialTasks,
  nodes,
  randomizeTasks,
  dontRandomizeFirstTask,
}: UseTreeTestTasksOptions) {
  // Task progress
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [taskResults, setTaskResults] = useState<TaskResult[]>([])

  // Post-task questions state
  const [questionResponses, setQuestionResponses] = useState<TaskQuestionResponses[]>([])
  const [pendingTaskResult, setPendingTaskResult] = useState<TaskResult | null>(null)

  // Navigation state for active task
  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Track which nodes have been visited for path recording
  const visitedNodesRef = useRef<string[]>([])

  // Timing refs (using refs to avoid re-renders)
  const taskStartTimeRef = useRef<number>(0)
  const firstClickTimeRef = useRef<number | null>(null)
  const collapseCountRef = useRef<number>(0)

  // Randomize tasks if settings say so (consistent for session)
  const tasks = useMemo(() => {
    if (!randomizeTasks) return initialTasks

    const tasksToRandomize = dontRandomizeFirstTask
      ? initialTasks.slice(1)
      : initialTasks

    // eslint-disable-next-line react-hooks/purity
    const shuffled = [...tasksToRandomize].sort(() => Math.random() - 0.5)

    return dontRandomizeFirstTask ? [initialTasks[0], ...shuffled] : shuffled
  }, [initialTasks, randomizeTasks, dontRandomizeFirstTask])

  const currentTask = tasks[currentTaskIndex]
  const progress = ((currentTaskIndex + 1) / tasks.length) * 100

  // Get post-task questions for current task
  const currentTaskQuestions = useMemo(() => {
    if (!currentTask) return []
    return castJsonArray<PostTaskQuestion>(currentTask.post_task_questions)
  }, [currentTask])

  // Pre-compute node lookup map for O(1) access
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  // Pre-compute parent-to-children set for O(1) hasChildren checks
  const _parentIds = useMemo(() => {
    const set = new Set<string>()
    for (const n of nodes) {
      if (n.parent_id) set.add(n.parent_id)
    }
    return set
  }, [nodes])

  // Calculate minimum path length to a node (for directness check)
  const getMinimumPathLength = useCallback(
    (nodeId: string): number => {
      let depth = 0
      let currentId: string | null = nodeId
      while (currentId) {
        const node = nodeMap.get(currentId)
        if (!node || !node.parent_id) break
        currentId = node.parent_id
        depth++
      }
      return depth
    },
    [nodeMap]
  )

  // Reset navigation state for a new task
  const resetTaskState = useCallback(() => {
    setExpandedNodeIds([])
    setSelectedNodeId(null)
    visitedNodesRef.current = []
    firstClickTimeRef.current = null
    collapseCountRef.current = 0
  }, [])

  // Start timing for a task
  const startTaskTiming = useCallback(() => {
    taskStartTimeRef.current = Date.now()
  }, [])

  // Handle node toggle (expand/collapse for parent nodes)
  const handleNodeToggle = useCallback((nodeId: string, captureCustomEvent: (event: string, data: Record<string, unknown>) => void) => {
    // Record first click time
    if (firstClickTimeRef.current === null) {
      firstClickTimeRef.current = Date.now()
    }

    // Track visited nodes for path recording
    if (!visitedNodesRef.current.includes(nodeId)) {
      visitedNodesRef.current.push(nodeId)
    }

    const node = nodeMap.get(nodeId)
    const isExpanding = !expandedNodeIds.includes(nodeId)

    // Capture event for recording timeline
    captureCustomEvent(isExpanding ? 'node_expand' : 'node_collapse', {
      node_id: nodeId,
      node_label: node?.label || '',
      task_id: currentTask?.id,
    })

    setExpandedNodeIds((prev) => {
      if (prev.includes(nodeId)) {
        collapseCountRef.current++
        return prev.filter((id) => id !== nodeId)
      } else {
        return [...prev, nodeId]
      }
    })

    // Clear selection when navigating tree
    setSelectedNodeId(null)
  }, [nodeMap, expandedNodeIds, currentTask])

  // Handle selecting a leaf node
  const handleNodeSelect = useCallback((nodeId: string, captureCustomEvent: (event: string, data: Record<string, unknown>) => void) => {
    // Record first click time
    if (firstClickTimeRef.current === null) {
      firstClickTimeRef.current = Date.now()
    }

    // Track visited nodes for path recording
    if (!visitedNodesRef.current.includes(nodeId)) {
      visitedNodesRef.current.push(nodeId)
    }

    const node = nodeMap.get(nodeId)

    // Capture event for recording timeline
    captureCustomEvent('node_select', {
      node_id: nodeId,
      node_label: node?.label || '',
      task_id: currentTask?.id,
    })

    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId))
  }, [nodeMap, currentTask])

  // Build a task result from the current confirm answer action
  const buildConfirmResult = useCallback((): TaskResult | null => {
    if (!selectedNodeId || !currentTask) return null

    const now = Date.now()

    const nodeIds = castJsonArray<string>(currentTask.correct_node_ids)
    const correctNodeIds = nodeIds.length > 0
      ? nodeIds
      : currentTask.correct_node_id
        ? [currentTask.correct_node_id]
        : []

    const isCorrect = correctNodeIds.includes(selectedNodeId)
    const minimumPathLength =
      correctNodeIds.length > 0 ? Math.min(...correctNodeIds.map((id) => getMinimumPathLength(id))) : 0
    const isDirect = collapseCountRef.current === 0 && visitedNodesRef.current.length <= minimumPathLength + 1

    return {
      taskId: currentTask.id,
      pathTaken: visitedNodesRef.current,
      selectedNodeId,
      isCorrect,
      isDirect,
      timeToFirstClickMs: firstClickTimeRef.current
        ? firstClickTimeRef.current - taskStartTimeRef.current
        : 0,
      totalTimeMs: now - taskStartTimeRef.current,
      backtrackCount: collapseCountRef.current,
      skipped: false,
    }
  }, [selectedNodeId, currentTask, getMinimumPathLength])

  // Build a skip result
  const buildSkipResult = useCallback((): TaskResult | null => {
    if (!currentTask) return null

    const now = Date.now()

    return {
      taskId: currentTask.id,
      pathTaken: visitedNodesRef.current,
      selectedNodeId: null,
      isCorrect: false,
      isDirect: false,
      timeToFirstClickMs: firstClickTimeRef.current
        ? firstClickTimeRef.current - taskStartTimeRef.current
        : 0,
      totalTimeMs: now - taskStartTimeRef.current,
      backtrackCount: collapseCountRef.current,
      skipped: true,
    }
  }, [currentTask])

  // Advance to next task or signal completion
  const advanceTask = useCallback((result: TaskResult, captureTaskStart: (taskId: string, label: string) => void): 'next' | 'done' => {
    setTaskResults((prev) => [...prev, result])

    const nextIndex = currentTaskIndex + 1
    if (nextIndex < tasks.length) {
      setCurrentTaskIndex(nextIndex)
      resetTaskState()
      startTaskTiming()
      const nextTask = tasks[nextIndex]
      if (nextTask) {
        captureTaskStart(nextTask.id, nextTask.question || `Task ${nextIndex + 1}`)
      }
      return 'next'
    }
    return 'done'
  }, [currentTaskIndex, tasks, resetTaskState, startTaskTiming])

  // Handle post-task questions completion
  const handlePostTaskQuestionsComplete = useCallback((
    responses: PostTaskQuestionResponse[],
    captureTaskStart: (taskId: string, label: string) => void,
  ): { allResults: TaskResult[], isDone: boolean } | null => {
    if (!pendingTaskResult || !currentTask) return null

    setQuestionResponses((prev) => [
      ...prev,
      { taskId: currentTask.id, responses },
    ])

    setTaskResults((prev) => [...prev, pendingTaskResult])
    setPendingTaskResult(null)

    const nextIndex = currentTaskIndex + 1
    if (nextIndex < tasks.length) {
      setCurrentTaskIndex(nextIndex)
      resetTaskState()
      startTaskTiming()
      const nextTask = tasks[nextIndex]
      if (nextTask) {
        captureTaskStart(nextTask.id, nextTask.question || `Task ${nextIndex + 1}`)
      }
      return { allResults: [...taskResults, pendingTaskResult], isDone: false }
    }
    return { allResults: [...taskResults, pendingTaskResult], isDone: true }
  }, [pendingTaskResult, currentTask, currentTaskIndex, tasks, taskResults, resetTaskState, startTaskTiming])

  // Check if current task has post-task questions
  const hasPostTaskQuestions = useCallback((): boolean => {
    const questions = castJsonArray<PostTaskQuestion>(currentTask?.post_task_questions)
    return questions.length > 0
  }, [currentTask])

  return {
    // Task data
    tasks,
    currentTask,
    currentTaskIndex,
    progress,
    currentTaskQuestions,
    taskResults,
    questionResponses,
    pendingTaskResult,

    // Navigation state
    expandedNodeIds,
    selectedNodeId,
    nodeMap,

    // Actions
    resetTaskState,
    startTaskTiming,
    handleNodeToggle,
    handleNodeSelect,
    buildConfirmResult,
    buildSkipResult,
    advanceTask,
    setPendingTaskResult,
    handlePostTaskQuestionsComplete,
    hasPostTaskQuestions,
  }
}
