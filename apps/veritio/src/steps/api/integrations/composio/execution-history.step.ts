import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { getUserId, Errors, Success } from './shared'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const config = {
  name: 'ComposioExecutionHistory',
  description: 'Get tool execution audit log',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/integrations/composio/executions',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['integrations'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = getUserId(req)
  const query = querySchema.safeParse(req.queryParams)

  if (!query.success) {
    return Errors.invalidParams(query.error.issues)
  }

  const { limit } = query.data
  logger.info('Fetching execution history', { userId, limit })

  const supabase = getMotiaSupabaseClient()
  const { data, error } = await (supabase as any).from('composio_tool_executions')
    .select('*')
    .eq('user_id', userId)
    .order('executed_at', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error('Failed to fetch execution history', { userId, error: error.message })
    return Errors.serverError('Failed to fetch execution history')
  }

  return Success.ok({ executions: data || [] })
}
