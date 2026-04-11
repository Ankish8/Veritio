import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../lib/motia/types'

export const config = {
  name: 'Ping',
  description: 'Simple ping endpoint that returns 200 immediately',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/ping',
    middleware: [],
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (_req: ApiRequest, { logger }: ApiHandlerContext) => {
  logger.info('Ping received')
  return {
    status: 200,
    body: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
    },
  }
}
