import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { revokeShareLink } from '../../../services/share-link-service'

export const config = {
  name: 'RevokeShareLink',
  description: 'Revoke (deactivate) a share link (requires editor role)',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/share-links/:id',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['share-link-revoked'],
  flows: ['collaboration'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const linkId = req.pathParams?.id as string

  if (!linkId) {
    return {
      status: 400,
      body: { error: 'Share link ID is required' },
    }
  }

  logger.info('Revoking share link', { userId, linkId })

  const supabase = getMotiaSupabaseClient()
  const { error } = await revokeShareLink(supabase, linkId, userId)

  if (error) {
    if (error.message.includes('Permission denied')) {
      return {
        status: 403,
        body: { error: error.message },
      }
    }
    if (error.message.includes('not found')) {
      return {
        status: 404,
        body: { error: 'Share link not found' },
      }
    }
    logger.error('Failed to revoke share link', { userId, linkId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to revoke share link' },
    }
  }

  logger.info('Share link revoked successfully', { userId, linkId })

  enqueue({
    topic: 'share-link-revoked',
    data: {
      shareLinkId: linkId,
      userId,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { success: true },
  }
}
