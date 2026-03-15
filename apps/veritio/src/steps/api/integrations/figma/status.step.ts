import type { StepConfig } from 'motia'
// NOTE: 5 levels up to reach root /middlewares/ (not src/middlewares/ which is broken)
import { authMiddleware } from '../../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { getFigmaConnection, isFigmaOAuthConfigured } from '../../../../services/figma/figma-oauth'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'

export const config = {
  name: 'FigmaConnectionStatus',
  description: 'Get Figma connection status for current user',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/integrations/figma/status',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['auth'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  // Check if OAuth is configured at all
  const isConfigured = isFigmaOAuthConfigured()

  if (!isConfigured) {
    return {
      status: 200,
      body: {
        configured: false,
        connected: false,
        figmaUser: null,
      },
    }
  }

  // Get user's Figma connection
  const supabase = getMotiaSupabaseClient()
  const { data: connection, error } = await getFigmaConnection(supabase, userId)

  if (error) {
    logger.error('Failed to get Figma connection status', { userId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to check Figma connection' },
    }
  }

  if (!connection) {
    return {
      status: 200,
      body: {
        configured: true,
        connected: false,
        figmaUser: null,
      },
    }
  }

  // Calculate token health status
  const tokenExpiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at)
    : null
  const now = Date.now()

  // Token health: healthy (>1hr), warning (5min-1hr), expired (<5min or past)
  let tokenHealth: 'healthy' | 'warning' | 'expired' = 'healthy'
  let tokenExpiresIn: number | null = null

  if (tokenExpiresAt) {
    tokenExpiresIn = tokenExpiresAt.getTime() - now
    if (tokenExpiresIn < 5 * 60 * 1000) {
      // Less than 5 minutes or expired
      tokenHealth = 'expired'
    } else if (tokenExpiresIn < 60 * 60 * 1000) {
      // Less than 1 hour
      tokenHealth = 'warning'
    }
  }

  // Return connection info (without sensitive token data)
  return {
    status: 200,
    body: {
      configured: true,
      connected: true,
      figmaUser: {
        id: connection.figma_user_id,
        email: connection.figma_email,
        handle: connection.figma_handle,
        imgUrl: connection.figma_img_url,
        connectedAt: connection.connected_at,
      },
      tokenHealth,
      tokenExpiresAt: connection.token_expires_at,
    },
  }
}
