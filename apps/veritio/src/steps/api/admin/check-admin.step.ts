import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'

export const config = {
  name: 'CheckAdmin',
  description: 'Check if the current authenticated user is a superadmin',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/admin/check',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
      200: z.object({ isAdmin: z.boolean() }) as any,
      401: z.object({ error: z.string() }) as any,
    },
  }],
  enqueues: [],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const superadminUserId = process.env.SUPERADMIN_USER_ID

  logger.info('Checking admin status', { userId })

  const isAdmin = Boolean(superadminUserId && userId === superadminUserId)

  return {
    status: 200,
    body: { isAdmin },
  }
}
