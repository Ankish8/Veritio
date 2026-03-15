'use client'

import { useState, useMemo, useCallback } from 'react'
import type { Task, TreeNode } from '@veritio/study-types'
import type { TreeTestResponse } from '@/lib/algorithms/tree-test-analysis'
import { castJsonArray } from '@/lib/supabase/json-utils'
import { buildBreadcrumbPath } from '@/lib/algorithms/statistics'

interface UseTaskAnalysisOptions {
  tasks: Task[]
  nodes: TreeNode[]
  responses: TreeTestResponse[]
  initialSelectedTaskId?: string | null
  onSelectedTaskIdChange?: (taskId: string | null) => void
}

/**
 * Shared hook for task-based analysis tabs (destinations, first-click, paths, pietree).
 *
 * Encapsulates the common pattern of:
 * - Task selection with external state sync
 * - Filtering responses by selected task
 * - Computing correct node IDs and breadcrumb paths
 * - Formatting tasks for the selector component
 */
export function useTaskAnalysis({
  tasks,
  nodes,
  responses,
  initialSelectedTaskId = null,
  onSelectedTaskIdChange,
}: UseTaskAnalysisOptions) {
  const [internalSelectedTaskId, setInternalSelectedTaskId] = useState<string | null>(
    initialSelectedTaskId ?? (tasks.length > 0 ? tasks[0].id : null)
  )

  const handleTaskSelect = useCallback((taskId: string) => {
    setInternalSelectedTaskId(taskId)
    onSelectedTaskIdChange?.(taskId)
  }, [onSelectedTaskIdChange])

  const selectedTask = useMemo(
    () => tasks.find(t => t.id === internalSelectedTaskId) ?? null,
    [tasks, internalSelectedTaskId]
  )

  const taskIndex = useMemo(
    () => tasks.findIndex(t => t.id === internalSelectedTaskId),
    [tasks, internalSelectedTaskId]
  )

  const correctNodeIds = useMemo(() => {
    if (!selectedTask) return []
    const ids = castJsonArray<string>(selectedTask.correct_node_ids)
    if (ids.length > 0) return ids
    return selectedTask.correct_node_id ? [selectedTask.correct_node_id] : []
  }, [selectedTask])

  const correctPathBreadcrumb = useMemo(() => {
    if (correctNodeIds.length === 0) return []
    return buildBreadcrumbPath(nodes, correctNodeIds[0])
  }, [nodes, correctNodeIds])

  const taskResponses = useMemo(() => {
    if (!internalSelectedTaskId) return []
    return responses.filter(r => r.task_id === internalSelectedTaskId)
  }, [responses, internalSelectedTaskId])

  const selectorTasks = useMemo(
    () => tasks.map(t => ({ taskId: t.id, question: t.question })),
    [tasks]
  )

  return {
    selectedTaskId: internalSelectedTaskId,
    selectedTask,
    taskIndex,
    correctNodeIds,
    correctPathBreadcrumb,
    taskResponses,
    selectorTasks,
    handleTaskSelect,
  }
}
