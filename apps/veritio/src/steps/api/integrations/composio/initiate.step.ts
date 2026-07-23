import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import { authMiddleware } from '../../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { createComposioOAuthState, isComposioConfigured, initiateConnection } from '../../../../services/composio/index'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { validateRequest } from '../../../../lib/api/validate-request'
import { getUserId, Errors, Success } from './shared'

const querySchema = z.object({
  toolkit: z.string().min(1),
  returnUrl: z.string().optional().transform((val) => {
    if (!val) return val
    // Only allow relative paths (starting with /, but not //) to prevent open redirects
    if (val.startsWith('/') && !val.startsWith('//')) return val
    // Allow same-origin absolute URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4001'
    try {
      const url = new URL(val)
      if (url.origin === new URL(appUrl).origin) return val
    } catch { /* not a valid absolute URL */ }
    return undefined
  }),
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
  const validation = validateRequest(querySchema, req.queryParams, logger)
  if (!validation.success) return validation.response

  const { toolkit, returnUrl } = validation.data
  const baseCallbackUrl =
    process.env.COMPOSIO_CALLBACK_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4001'}/api/integrations/composio/callback`

  let state: string
  try {
    state = createComposioOAuthState({ userId, toolkit, ...(returnUrl ? { returnUrl } : {}) })
  } catch (err) {
    logger.error('Failed to sign Composio OAuth state', {
      error: err instanceof Error ? err.message : 'Unknown error',
    })
    return Errors.serverError('Failed to initiate connection. Please try again.')
  }

  const params = new URLSearchParams({ state })
  const callbackWithState = `${baseCallbackUrl}?${params.toString()}`

  logger.info('Initiating OAuth', { userId, toolkit })

  const { authUrl, error } = await initiateConnection(userId, toolkit, callbackWithState)

  if (error) {
    logger.error('Failed to initiate OAuth', { toolkit, error: error.message })
    return Errors.serverError('Failed to initiate connection. Please try again.')
  }

  return Success.ok({ authUrl })
}
