/**
 * Categories Step Configuration
 *
 * Configuration for generating category-related API steps.
 * Categories use the 'pathParams' pattern for studyId and 'bare' response wrapping.
 */

import { z } from 'zod'
import {
  createCrudService,
  categoriesConfig,
  type CategoryCreateInput,
  type CategoryBulkItem,
} from '../../crud-factory/index'
import {
  createCategorySchema,
  updateCategorySchema,
  bulkUpdateCategoriesSchema,
  type Category,
} from '../../../services/types'
import type { StepConfig } from '../types'

// Create the CRUD service instance
const categoryCrudService = createCrudService(categoriesConfig)

// Response schemas for Motia documentation
const categoryResponseSchema = z.object({
  id: z.string().uuid(),
  study_id: z.string().uuid(),
  label: z.string(),
  description: z.string().nullable(),
  position: z.number(),
  created_at: z.string(),
})

const categoryListResponseSchema = z.array(categoryResponseSchema)

// Bulk update body wrapper
const bulkUpdateCategoriesBodySchema = z.object({
  categories: bulkUpdateCategoriesSchema,
})

/**
 * Step configuration for Categories
 *
 * Uses:
 * - studyIdSource: 'pathParams' (extracted from :studyId in path)
 * - responseWrap: 'bare' (returns data directly, not wrapped)
 */
export const categoriesStepConfig: StepConfig<Category, CategoryCreateInput, CategoryBulkItem> = {
  entityName: 'Category',
  entityNamePlural: 'Categories',
  resourceType: 'category',
  basePath: '/api/studies/:studyId/categories',

  pathConfig: {
    entityIdParam: 'categoryId',
    studyIdSource: 'pathParams',
  },

  flows: ['study-content', 'observability'],

  crudService: categoryCrudService,

  operations: {
    create: {
      method: 'POST',
      bodySchema: createCategorySchema,
      eventTopic: 'category-created',
      emitStrategy: 'await',
      responseWrap: 'bare',
      successStatus: 201,
      responseSchema: categoryResponseSchema,
    },

    update: {
      method: 'PATCH',
      bodySchema: updateCategorySchema,
      eventTopic: 'category-updated',
      emitStrategy: 'await',
      responseWrap: 'bare',
      responseSchema: categoryResponseSchema,
    },

    delete: {
      method: 'DELETE',
      eventTopic: 'category-deleted',
      emitStrategy: 'await',
      responseWrap: 'bare',
    },

    list: {
      method: 'GET',
      eventTopic: 'categories-listed',
      emitStrategy: 'await',
      responseWrap: 'bare',
      responseSchema: categoryListResponseSchema,
    },

    bulkUpdate: {
      method: 'PUT',
      bulkBodySchema: bulkUpdateCategoriesBodySchema,
      bulkItemsKey: 'categories',
      eventTopic: 'categories-bulk-updated',
      emitStrategy: 'await',
      responseWrap: 'bare',
      responseSchema: categoryListResponseSchema,
    },
  },
}
