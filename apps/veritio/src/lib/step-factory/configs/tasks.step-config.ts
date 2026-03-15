/**
 * Tasks Step Configuration
 *
 * Configuration for generating task-related API steps.
 * Tasks use the 'pathParams' pattern for studyId and 'data-wrapped' response wrapping.
 */

import {
  createCrudService,
  tasksConfig,
  type TaskCreateInput,
  type TaskBulkItem,
  type TaskWithCorrectNode,
} from '../../crud-factory/index'
import {
  createTaskSchema,
  updateTaskSchema,
  bulkUpdateTasksSchema,
} from '../../../services/types'
import type { StepConfig } from '../types'

// Create the CRUD service instance
const taskCrudService = createCrudService(tasksConfig)

/**
 * Step configuration for Tasks
 *
 * Uses:
 * - studyIdSource: 'pathParams' (from URL path)
 * - responseWrap: 'data-wrapped' (returns { data: ... })
 *
 * Note: Tasks use direct array for bulk update body (no wrapper object)
 */
export const tasksStepConfig: StepConfig<TaskWithCorrectNode, TaskCreateInput, TaskBulkItem> = {
  entityName: 'Task',
  entityNamePlural: 'Tasks',
  resourceType: 'task',
  basePath: '/api/studies/:studyId/tasks',

  pathConfig: {
    entityIdParam: 'taskId',
    studyIdSource: 'pathParams',
  },

  flows: ['study-content', 'observability'],

  crudService: taskCrudService,

  operations: {
    create: {
      method: 'POST',
      bodySchema: createTaskSchema,
      eventTopic: 'task-created',
      emitStrategy: 'await',
      responseWrap: 'data-wrapped',
      successStatus: 201,
    },

    update: {
      method: 'PATCH',
      bodySchema: updateTaskSchema,
      eventTopic: 'task-updated',
      emitStrategy: 'await',
      responseWrap: 'data-wrapped',
    },

    delete: {
      method: 'DELETE',
      eventTopic: 'task-deleted',
      emitStrategy: 'await',
      responseWrap: 'bare',
    },

    list: {
      method: 'GET',
      eventTopic: 'tasks-listed',
      emitStrategy: 'await',
      responseWrap: 'bare', // List returns array directly
    },

    bulkUpdate: {
      method: 'PUT',
      // Body is direct array, no wrapper object (no bulkItemsKey)
      bulkBodySchema: bulkUpdateTasksSchema,
      eventTopic: 'tasks-bulk-updated',
      emitStrategy: 'await',
      responseWrap: 'data-wrapped',
    },
  },
}
