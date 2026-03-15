import type { StepConfig } from 'motia'
// NOTE: 5 levels up to reach root /middlewares/ (not src/middlewares/ which is broken)
import { authMiddleware } from '../../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { generateAuthUrl, isFigmaOAuthConfigured } from '../../../../services/figma/figma-oauth'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import crypto from 'crypto'

export const config = {
  name: 'FigmaOAuthInitiate',
  description: 'Initiate Figma OAuth flow - redirects to Figma',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/integrations/figma',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['auth'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  // Check if OAuth is configured
  if (!isFigmaOAuthConfigured()) {
    logger.error('Figma OAuth not configured')
    return {
      status: 500,
      body: { error: 'Figma integration not configured. Please contact support.' },
    }
  }

  // Generate HMAC-signed state for CSRF protection
  // Format: userId:timestamp:hmac
  // The HMAC is computed over userId:timestamp using a server secret,
  // so the callback can verify authenticity without server-side storage.
  const stateSecret = process.env.FIGMA_CLIENT_SECRET
  if (!stateSecret) {
    logger.error('FIGMA_CLIENT_SECRET not configured for state signing')
    return {
      status: 500,
      body: { error: 'Figma integration not configured. Please contact support.' },
    }
  }

  const timestamp = Date.now().toString()
  const hmac = crypto
    .createHmac('sha256', stateSecret)
    .update(`${userId}:${timestamp}`)
    .digest('hex')
  const stateWithUser = `${userId}:${timestamp}:${hmac}`

  // Generate authorization URL
  const authUrl = generateAuthUrl(stateWithUser)

  logger.info('Initiating Figma OAuth', { userId })

  // Return the auth URL - frontend will redirect
  return {
    status: 200,
    body: {
      authUrl,
    },
  }
}
