import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { generateProxyCompanionJs } from '../../../services/snippet/proxy-companion'

export const config = {
  name: 'ServeProxyCompanion',
  description: 'Serve the reverse proxy companion tracking script (public)',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/proxy-companion.js',
    middleware: [errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

export const handler = async (_req: ApiRequest, _ctx: ApiHandlerContext) => {
  const js = generateProxyCompanionJs()

  return {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
    body: js,
  }
}
