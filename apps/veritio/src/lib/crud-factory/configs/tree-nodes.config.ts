import type { EntityConfig } from '../types'
import type { TreeNode } from '../../../services/types'
import { cacheKeys, cacheTTL } from '../../cache/memory-cache'

/**
 * Input type for creating a tree node
 */
export interface TreeNodeCreateInput {
  label: string
  parent_id?: string | null
  position?: number
}

/**
 * Input type for bulk updating tree nodes
 */
export interface TreeNodeBulkItem {
  id: string
  label: string
  parent_id?: string | null
  position: number
}

/**
 * Tree nodes entity configuration
 *
 * Special handling:
 * - Uses batch upsert strategy (single call) for proper FK ordering
 * - Foreign key error handler for parent_id validation
 */
export const treeNodesConfig: EntityConfig<TreeNode, TreeNodeCreateInput, TreeNodeBulkItem> = {
  tableName: 'tree_nodes',
  entityName: 'Tree node',

  cache: {
    keyGenerator: cacheKeys.treeNodes,
    ttl: cacheTTL.medium,
  },

  selects: {
    list: 'id, study_id, label, parent_id, path, position, created_at',
    listWithOwnership: 'id, study_id, label, parent_id, path, position, created_at, studies!inner(id)',
    get: '*',
    create: '*',
    update: '*',
    bulkUpdate: 'id, study_id, label, parent_id, path, position, created_at',
  },

  orderBy: {
    column: 'position',
    ascending: true,
  },

  fieldTransformers: {
    update: (input) => {
      const updates: Record<string, unknown> = {}
      if (input.label !== undefined) updates.label = input.label.trim()
      if (input.parent_id !== undefined) updates.parent_id = input.parent_id
      if (input.position !== undefined) updates.position = input.position
      return updates
    },
  },

  // Handle foreign key errors for parent_id
  errorHandlers: [
    {
      pattern: 'foreign key',
      message: 'Parent node not found',
    },
    {
      pattern: 'parent_id',
      message: 'Parent node not found',
    },
  ],

  // Batch strategy ensures proper FK ordering in single transaction
  upsertStrategy: 'batch',

  buildInsertData: (studyId, input) => ({
    study_id: studyId,
    label: input.label.trim(),
    parent_id: input.parent_id || null,
    position: input.position ?? 0,
  }),

  buildUpsertData: (studyId, item) => ({
    id: item.id,
    study_id: studyId,
    label: item.label,
    parent_id: item.parent_id ?? null,
    position: item.position,
  }),
}
