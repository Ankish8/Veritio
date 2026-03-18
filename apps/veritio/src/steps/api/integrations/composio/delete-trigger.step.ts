import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { deleteTrigger } from '../../../../services/composio/triggers'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { validateRequest } from '../../../../lib/api/validate-request'
import { getUserId, Errors, Success } from './shared'

const pathParamsSchema = z.object({
  triggerId: z.string().uuid(),
})

export const config = {
  name: 'ComposioDeleteTrigger',
  description: 'Delete a Composio event trigger',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/integrations/composio/triggers/:triggerId',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['composio-trigger-deleted'],
  flows: ['auth'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = getUserId(req)
  const validation = validateRequest(pathParamsSchema, req.pathParams, logger)
  if (!validation.success) return validation.response

  const { triggerId } = validation.data
  logger.info('Deleting trigger', { userId, triggerId })

  const supabase = getMotiaSupabaseClient()
  const { success, error } = await deleteTrigger(supabase, triggerId, userId)

  if (error) {
    logger.error('Failed to delete trigger', { userId, triggerId, error: error.message })
    return Errors.serverError('Failed to delete trigger')
  }

  if (!success) {
    return Errors.notFound('Trigger')
  }

  logger.info('Trigger deleted', { userId, triggerId })
  await enqueue({ topic: 'composio-trigger-deleted', data: { userId, triggerId } }).catch(() => {})

  return Success.deleted()
}
