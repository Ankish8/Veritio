import type { StepConfig } from 'motia'
// NOTE: 5 levels up to reach root /middlewares/ (not src/middlewares/ which is broken)
import { authMiddleware } from '../../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { deleteFigmaConnection } from '../../../../services/figma/figma-oauth'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'

export const config = {
  name: 'FigmaDisconnect',
  description: 'Disconnect Figma account',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/integrations/figma',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['figma-disconnected'],
  flows: ['auth'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  logger.info('Disconnecting Figma account', { userId })

  const supabase = getMotiaSupabaseClient()
  const { error } = await deleteFigmaConnection(supabase, userId)

  if (error) {
    logger.error('Failed to disconnect Figma', { userId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to disconnect Figma account' },
    }
  }

  logger.info('Figma account disconnected', { userId })

  enqueue({
    topic: 'figma-disconnected',
    data: { userId },
  }).catch(() => {})

  return {
    status: 200,
    body: { success: true },
  }
}
