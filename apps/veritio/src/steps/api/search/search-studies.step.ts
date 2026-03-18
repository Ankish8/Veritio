import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { searchStudies } from '../../../services/cross-study-search-service'
import { classifyError } from '../../../lib/api/classify-error'

const paramsSchema = z.object({
  orgId: z.string().uuid(),
})

const bodySchema = z.object({
  // Filters
  query: z.string().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
  project_ids: z.array(z.string().uuid()).optional(),
  study_types: z.array(z.enum([
    'card_sort', 'tree_test', 'survey', 'prototype_test', 'first_click', 'first_impression', 'live_website_test'
  ])).optional(),
  statuses: z.array(z.enum(['draft', 'active', 'paused', 'completed'])).optional(),
  date_range: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  has_participants: z.boolean().optional(),
  min_participants: z.number().int().min(0).optional(),
  // Pagination & sorting
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().uuid().optional(),
  include_facets: z.boolean().optional(),
  sort_by: z.enum(['relevance', 'created_at', 'updated_at', 'title']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
})

export const config = {
  name: 'SearchStudies',
  description: 'Cross-study search with filters',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/organizations/:orgId/studies/search',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['research-repository'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { orgId } = paramsSchema.parse(req.pathParams)

  const validation = validateRequest(bodySchema, req.body, logger)
  if (!validation.success) return validation.response

  const { limit, cursor, include_facets, sort_by, sort_order, ...filters } = validation.data

  logger.info('Searching studies', { userId, orgId, query: filters.query })

  const supabase = getMotiaSupabaseClient()
  const { data, error } = await searchStudies(supabase, orgId, userId, filters, {
    limit,
    cursor,
    includeFacets: include_facets,
    sortBy: sort_by,
    sortOrder: sort_order,
  })

  if (error) {
    return classifyError(error, logger, 'Search studies', {
      fallbackMessage: 'Failed to search studies',
    })
  }

  return {
    status: 200,
    body: data,
  }
}
