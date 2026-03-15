import type { StepConfig } from 'motia'
import { z } from 'zod'
import { metrics } from '../../../lib/observability/metrics'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'

export const config = {
  name: 'GetMetrics',
  description: 'Get system metrics (internal endpoint)',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/internal/metrics',
    middleware: [errorHandlerMiddleware],
    responseSchema: {
    200: z.object({
      summary: z.object({
        totalRequests: z.number(),
        totalErrors: z.number(),
        avgLatency: z.number(),
        uptime: z.number(),
        endpoints: z.number(),
      }),
      requests: z.record(z.any()),
      errors: z.record(z.any()),
      timestamp: z.string(),
    }) as any,
  } as any,
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (req: any, { logger }: any) => {
  logger.info('Fetching system metrics')

  const metricsData = metrics.getMetrics()
  const summary = metrics.getSummary()

  return {
    status: 200,
    body: {
      summary,
      ...metricsData,
    },
  }
}
