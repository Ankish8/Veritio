import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { deleteComposioConnection } from '../../../../services/composio/index'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { validateRequest } from '../../../../lib/api/validate-request'
import { getUserId, Errors, Success } from './shared'

const pathParamsSchema = z.object({
  toolkit: z.string().min(1),
})

export const config = {
  name: 'ComposioDisconnect',
  description: 'Disconnect a Composio toolkit',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/integrations/composio/:toolkit',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['composio-disconnected'],
  flows: ['auth'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = getUserId(req)
  const validation = validateRequest(pathParamsSchema, req.pathParams, logger)
  if (!validation.success) return validation.response

  const { toolkit } = validation.data
  logger.info('Disconnecting toolkit', { userId, toolkit })

  const supabase = getMotiaSupabaseClient()
  const { error } = await deleteComposioConnection(supabase, userId, toolkit)

  if (error) {
    logger.error('Failed to disconnect toolkit', { userId, toolkit, error: error.message })
    return Errors.serverError('Failed to disconnect toolkit')
  }

  logger.info('Toolkit disconnected', { userId, toolkit })
  await enqueue({ topic: 'composio-disconnected', data: { userId, toolkit } }).catch(() => {})

  return Success.deleted()
}
