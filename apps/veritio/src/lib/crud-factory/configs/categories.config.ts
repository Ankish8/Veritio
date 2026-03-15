import type { EntityConfig } from '../types'
import type { Category } from '../../../services/types'
import { cacheKeys, cacheTTL } from '../../cache/memory-cache'

/**
 * Input type for creating a category
 */
export interface CategoryCreateInput {
  label: string
  description?: string | null
  position?: number
}

/**
 * Input type for bulk updating categories
 */
export interface CategoryBulkItem {
  id: string
  label?: string
  description?: string | null
  position?: number
}

/**
 * Categories entity configuration
 */
export const categoriesConfig: EntityConfig<Category, CategoryCreateInput, CategoryBulkItem> = {
  tableName: 'categories',
  entityName: 'Category',

  cache: {
    keyGenerator: cacheKeys.categories,
    ttl: cacheTTL.medium,
  },

  selects: {
    list: 'id, study_id, label, description, position, created_at',
    listWithOwnership: 'id, study_id, label, description, position, created_at, studies!inner(id)',
    get: '*',
    create: '*',
    update: '*',
    bulkUpdate: 'id, study_id, label, description, position, created_at',
  },

  orderBy: {
    column: 'position',
    ascending: true,
  },

  fieldTransformers: {
    update: (input) => {
      const updates: Record<string, unknown> = {}
      if (input.label !== undefined) updates.label = input.label.trim()
      if (input.description !== undefined) updates.description = input.description?.trim() || null
      if (input.position !== undefined) updates.position = input.position
      return updates
    },
  },

  errorHandlers: [],

  upsertStrategy: 'parallel',

  buildInsertData: (studyId, input) => ({
    study_id: studyId,
    label: input.label.trim(),
    description: input.description?.trim() || null,
    position: input.position ?? 0,
  }),

  buildUpsertData: (studyId, item) => ({
    id: item.id,
    study_id: studyId,
    label: item.label ?? '',
    description: item.description ?? null,
    position: item.position ?? 0,
  }),
}
