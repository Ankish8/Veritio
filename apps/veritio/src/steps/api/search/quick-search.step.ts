import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { quickSearch } from '../../../services/cross-study-search-service'

const paramsSchema = z.object({
  orgId: z.string().uuid(),
})

const querySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(20).optional(),
})

export const config = {
  name: 'QuickSearch',
  description: 'Typeahead search for studies',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/organizations/:orgId/search',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['research-repository'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { orgId } = paramsSchema.parse(req.pathParams)

  const reqQuery = (req as any).query || {}
  const validation = validateRequest(querySchema, reqQuery, logger)
  if (!validation.success) return validation.response

  const { q, limit } = validation.data

  logger.info('Quick search', { userId, orgId, query: q })

  const supabase = getMotiaSupabaseClient()
  const { data, error } = await quickSearch(supabase, orgId, userId, q, {
    limit,
  })

  if (error) {
    if (error.message.includes('authorized')) {
      return {
        status: 403,
        body: { error: error.message },
      }
    }
    logger.error('Failed to quick search', { userId, orgId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to search' },
    }
  }

  return {
    status: 200,
    body: data,
  }
}
