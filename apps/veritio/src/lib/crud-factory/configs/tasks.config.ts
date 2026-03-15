import type { EntityConfig } from '../types'
import type { Task } from '../../../services/types'
import { toJsonArray } from '../../supabase/json-utils'
import { cacheKeys, cacheTTL } from '../../cache/memory-cache'

/**
 * Task with correct node info (populated via join)
 */
export interface TaskWithCorrectNode extends Task {
  correct_node: { id: string; label: string } | null
}

/**
 * Input type for creating a task
 */
export interface TaskCreateInput {
  question: string
  correct_node_id?: string | null
  correct_node_ids?: string[]
  position?: number
}

/**
 * Input type for bulk updating tasks
 */
export interface TaskBulkItem {
  id: string
  question: string
  correct_node_id?: string | null
  correct_node_ids?: string[]
  position: number
  post_task_questions?: unknown[]
}

// Select string with correct_node join
const TASK_SELECT = `
  id,study_id,question,correct_node_id,correct_node_ids,position,created_at,post_task_questions,
  correct_node:tree_nodes!tasks_correct_node_id_fkey(id, label)
`.trim()

/**
 * Tasks entity configuration
 *
 * Special handling:
 * - Complex join for correct_node relationship
 * - Json casting for array fields (correct_node_ids, post_task_questions)
 * - Foreign key error handler for correct_node_id validation
 * - Uses batch upsert strategy
 */
export const tasksConfig: EntityConfig<TaskWithCorrectNode, TaskCreateInput, TaskBulkItem> = {
  tableName: 'tasks',
  entityName: 'Task',

  cache: {
    keyGenerator: cacheKeys.tasks,
    ttl: cacheTTL.medium,
  },

  selects: {
    list: TASK_SELECT,
    listWithOwnership: `${TASK_SELECT},studies!inner(id)`,
    get: TASK_SELECT,
    create: TASK_SELECT,
    update: TASK_SELECT,
    bulkUpdate: TASK_SELECT,
  },

  orderBy: {
    column: 'position',
    ascending: true,
  },

  fieldTransformers: {
    update: (input) => {
      const updates: Record<string, unknown> = {}
      if (input.question !== undefined) updates.question = input.question.trim()
      if (input.correct_node_id !== undefined) updates.correct_node_id = input.correct_node_id
      if (input.correct_node_ids !== undefined) updates.correct_node_ids = input.correct_node_ids
      if (input.position !== undefined) updates.position = input.position
      return updates
    },
  },

  // Handle foreign key errors for correct_node_id
  errorHandlers: [
    {
      pattern: 'foreign key',
      message: 'Correct answer node not found',
    },
    {
      pattern: 'correct_node',
      message: 'Correct answer node not found',
    },
  ],

  // Batch strategy for proper ordering
  upsertStrategy: 'batch',

  buildInsertData: (studyId, input) => ({
    study_id: studyId,
    question: input.question.trim(),
    correct_node_id: input.correct_node_id || null,
    correct_node_ids: input.correct_node_ids || [],
    position: input.position ?? 0,
  }),

  buildUpsertData: (studyId, item) => ({
    id: item.id,
    study_id: studyId,
    question: item.question,
    correct_node_id: item.correct_node_id ?? null,
    // Json cast for Supabase array fields
    correct_node_ids: toJsonArray(item.correct_node_ids ?? []),
    position: item.position,
    post_task_questions: toJsonArray(item.post_task_questions ?? []),
  }),

  // Cast results to proper type (handles the join structure)
  transformListResult: (rows) => rows as TaskWithCorrectNode[],
}
