import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { isComposioConfigured, initiateConnection } from '../../../../services/composio/index'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { getUserId, Errors, Success } from './shared'

const querySchema = z.object({
  toolkit: z.string().min(1),
  returnUrl: z.string().optional(),
})

export const config = {
  name: 'ComposioOAuthInitiate',
  description: 'Initiate Composio OAuth flow for a toolkit',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/integrations/composio/initiate',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['auth'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  if (!isComposioConfigured()) {
    logger.error('Composio not configured')
    return Errors.notConfigured()
  }

  const userId = getUserId(req)
  const query = querySchema.safeParse(req.queryParams)

  if (!query.success) {
    return Errors.invalidParams(query.error.issues)
  }

  const { toolkit, returnUrl } = query.data
  const baseCallbackUrl =
    process.env.COMPOSIO_CALLBACK_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4001'}/api/integrations/composio/callback`

  const params = new URLSearchParams({
    userId,
    toolkit,
    ...(returnUrl && { returnUrl }),
  })
  const callbackWithState = `${baseCallbackUrl}?${params.toString()}`

  logger.info('Initiating OAuth', { userId, toolkit })

  const { authUrl, error } = await initiateConnection(userId, toolkit, callbackWithState)

  if (error) {
    logger.error('Failed to initiate OAuth', { toolkit, error: error.message })
    return Errors.serverError('Failed to initiate connection. Please try again.')
  }

  return Success.ok({ authUrl })
}
