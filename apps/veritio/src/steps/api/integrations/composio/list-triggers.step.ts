import type { StepConfig } from 'motia'
import { authMiddleware } from '../../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { listTriggers } from '../../../../services/composio/triggers'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { getUserId, Errors, Success } from './shared'

export const config = {
  name: 'ComposioListTriggers',
  description: 'List Composio triggers for the current user',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/integrations/composio/triggers',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['auth'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = getUserId(req)
  const toolkit = req.queryParams?.toolkit as string | undefined

  logger.info('Listing triggers', { userId, toolkit })

  const supabase = getMotiaSupabaseClient()
  const { data, error } = await listTriggers(supabase, userId, toolkit)

  if (error) {
    logger.error('Failed to list triggers', { userId, error: error.message })
    return Errors.serverError('Failed to list triggers')
  }

  return Success.ok({ triggers: data })
}
