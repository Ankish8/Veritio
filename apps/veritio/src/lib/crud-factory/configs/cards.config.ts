import type { EntityConfig } from '../types'
import type { Card, CardImage } from '../../../services/types'
import { cacheKeys, cacheTTL } from '../../cache/memory-cache'

/**
 * Input type for creating a card
 */
export interface CardCreateInput {
  label: string
  description?: string | null
  position?: number
  image?: CardImage | null
}

/**
 * Input type for bulk updating cards
 */
export interface CardBulkItem {
  id: string
  label?: string
  description?: string | null
  position?: number
  image?: CardImage | null
}

/**
 * Cards entity configuration
 */
export const cardsConfig: EntityConfig<Card, CardCreateInput, CardBulkItem> = {
  tableName: 'cards',
  entityName: 'Card',

  cache: {
    keyGenerator: cacheKeys.cards,
    ttl: cacheTTL.medium,
  },

  selects: {
    list: 'id, study_id, label, description, position, image, created_at',
    listWithOwnership: 'id, study_id, label, description, position, image, created_at, studies!inner(id)',
    get: '*',
    create: '*',
    update: '*',
    bulkUpdate: 'id, study_id, label, description, position, image, created_at',
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
      if (input.image !== undefined) updates.image = input.image
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
    image: input.image ?? null,
  }),

  buildUpsertData: (studyId, item) => ({
    id: item.id,
    study_id: studyId,
    label: item.label ?? '',
    description: item.description ?? null,
    position: item.position ?? 0,
    image: item.image ?? null,
  }),
}
