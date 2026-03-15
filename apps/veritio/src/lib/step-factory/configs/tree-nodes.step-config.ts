/**
 * Tree Nodes Step Configuration
 *
 * Configuration for generating tree node-related API steps.
 * Tree nodes use the 'pathParams' pattern for studyId and 'data-wrapped' response wrapping.
 */

import { z } from 'zod'
import {
  createCrudService,
  treeNodesConfig,
  type TreeNodeCreateInput,
  type TreeNodeBulkItem,
} from '../../crud-factory/index'
import {
  createTreeNodeSchema,
  updateTreeNodeSchema,
  bulkUpdateTreeNodesSchema,
  type TreeNode,
} from '../../../services/types'
import type { StepConfig } from '../types'

// Create the CRUD service instance
const treeNodeCrudService = createCrudService(treeNodesConfig)

// Bulk update body wrapper
const bulkUpdateTreeNodesBodySchema = z.object({
  nodes: bulkUpdateTreeNodesSchema,
})

/**
 * Step configuration for Tree Nodes
 *
 * Uses:
 * - studyIdSource: 'pathParams' (from URL path)
 * - responseWrap: 'data-wrapped' (returns { data: ... })
 */
export const treeNodesStepConfig: StepConfig<TreeNode, TreeNodeCreateInput, TreeNodeBulkItem> = {
  entityName: 'TreeNode',
  entityNamePlural: 'TreeNodes',
  resourceType: 'tree-node',
  basePath: '/api/studies/:studyId/tree-nodes',

  pathConfig: {
    entityIdParam: 'nodeId',
    studyIdSource: 'pathParams',
  },

  flows: ['study-content', 'observability'],

  crudService: treeNodeCrudService,

  operations: {
    create: {
      method: 'POST',
      bodySchema: createTreeNodeSchema,
      eventTopic: 'tree-node-created',
      emitStrategy: 'await',
      responseWrap: 'data-wrapped',
      successStatus: 201,
    },

    update: {
      method: 'PATCH',
      bodySchema: updateTreeNodeSchema,
      eventTopic: 'tree-node-updated',
      emitStrategy: 'await',
      responseWrap: 'data-wrapped',
    },

    delete: {
      method: 'DELETE',
      eventTopic: 'tree-node-deleted',
      emitStrategy: 'await',
      responseWrap: 'bare',
    },

    list: {
      method: 'GET',
      eventTopic: 'tree-nodes-listed',
      emitStrategy: 'await',
      responseWrap: 'bare', // List returns array directly
    },

    bulkUpdate: {
      method: 'PUT',
      bulkBodySchema: bulkUpdateTreeNodesBodySchema,
      bulkItemsKey: 'nodes',
      eventTopic: 'tree-nodes-bulk-updated',
      emitStrategy: 'await',
      responseWrap: 'data-wrapped',
    },
  },
}
