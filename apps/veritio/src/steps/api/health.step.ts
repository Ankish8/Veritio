import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../lib/motia/types'
import { errorHandlerMiddleware } from '../../middlewares/error-handler.middleware'
import { checkHealth } from '../../services/health-service'

const serviceHealthSchema = z.object({
  status: z.enum(['up', 'down']),
  latency_ms: z.number(),
  error: z.string().optional(),
})

const responseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  version: z.string(),
  timestamp: z.string(),
  services: z.object({
    database: serviceHealthSchema,
    redis: serviceHealthSchema,
  }),
})

export const config = {
  name: 'Health',
  description: 'Health check endpoint for monitoring service status',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/health',
    middleware: [errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    503: responseSchema as any,
  },
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (_req: ApiRequest, { logger }: ApiHandlerContext) => {
  const health = await checkHealth()

  if (health.status !== 'healthy') {
    logger.warn('Health check failed', {
      database: health.services.database,
      redis: health.services.redis,
    })
  }

  return {
    status: health.status === 'healthy' ? 200 : 503,
    body: health,
  }
}
