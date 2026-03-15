/**
 * Cards Step Configuration
 *
 * Configuration for generating card-related API steps.
 * Cards use the 'pathParams' pattern for studyId and 'bare' response wrapping.
 */

import { z } from 'zod'
import {
  createCrudService,
  cardsConfig,
  type CardCreateInput,
  type CardBulkItem,
} from '../../crud-factory/index'
import {
  createCardSchema,
  updateCardSchema,
  bulkUpdateCardsSchema,
  cardImageSchema,
  type Card,
} from '../../../services/types'
import type { StepConfig } from '../types'

// Create the CRUD service instance
const cardCrudService = createCrudService(cardsConfig)

// Response schemas for Motia documentation
const cardResponseSchema = z.object({
  id: z.string().uuid(),
  study_id: z.string().uuid(),
  label: z.string(),
  description: z.string().nullable(),
  position: z.number(),
  image: cardImageSchema.optional(),
  created_at: z.string(),
})

const cardListResponseSchema = z.array(cardResponseSchema)

// Bulk update body wrapper
const bulkUpdateCardsBodySchema = z.object({
  cards: bulkUpdateCardsSchema,
})

/**
 * Step configuration for Cards
 *
 * Uses:
 * - studyIdSource: 'pathParams' (extracted from :studyId in path)
 * - responseWrap: 'bare' (returns data directly, not wrapped)
 */
export const cardsStepConfig: StepConfig<Card, CardCreateInput, CardBulkItem> = {
  entityName: 'Card',
  entityNamePlural: 'Cards',
  resourceType: 'card',
  basePath: '/api/studies/:studyId/cards',

  pathConfig: {
    entityIdParam: 'cardId',
    studyIdSource: 'pathParams',
  },

  flows: ['study-content', 'observability'],

  crudService: cardCrudService,

  operations: {
    create: {
      method: 'POST',
      bodySchema: createCardSchema,
      eventTopic: 'card-created',
      emitStrategy: 'await',
      responseWrap: 'bare',
      successStatus: 201,
      responseSchema: cardResponseSchema,
    },

    update: {
      method: 'PATCH',
      bodySchema: updateCardSchema,
      eventTopic: 'card-updated',
      emitStrategy: 'await',
      responseWrap: 'bare',
      responseSchema: cardResponseSchema,
    },

    delete: {
      method: 'DELETE',
      eventTopic: 'card-deleted',
      emitStrategy: 'await',
      responseWrap: 'bare',
    },

    list: {
      method: 'GET',
      eventTopic: 'cards-listed',
      emitStrategy: 'await',
      responseWrap: 'bare',
      responseSchema: cardListResponseSchema,
    },

    bulkUpdate: {
      method: 'PUT',
      bulkBodySchema: bulkUpdateCardsBodySchema,
      bulkItemsKey: 'cards',
      eventTopic: 'cards-bulk-updated',
      emitStrategy: 'await',
      responseWrap: 'bare',
      responseSchema: cardListResponseSchema,
    },
  },
}
