import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { signStreamToken } from '../../../lib/security/stream-token'

const responseSchema = z.object({
  token: z.string(),
  expiresInSeconds: z.number(),
})

export const config = {
  name: 'CreateStreamToken',
  description:
    'Mints a short-lived JWT the browser attaches (?token=) to the stream WebSocket upgrade — httpOnly session cookies cannot ride a cross-domain WS handshake',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/streams/token',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
      200: responseSchema as any,
      500: z.object({ error: z.string() }) as any,
    },
  }],
  enqueues: [],
  flows: ['auth'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  const token = await signStreamToken(userId)
  if (!token) {
    logger.error('Stream token signing unavailable — no STREAM_TOKEN_SECRET/BETTER_AUTH_SECRET configured')
    return {
      status: 500,
      body: { error: 'Stream token signing is not configured' },
    }
  }

  return {
    status: 200,
    body: { token, expiresInSeconds: 600 },
  }
}
