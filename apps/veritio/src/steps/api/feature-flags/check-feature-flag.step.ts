import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { isFeatureEnabled } from '../../../services/feature-flag-service'

export const config = {
  name: 'CheckFeatureFlag',
  description: 'Check if a feature flag is enabled',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/feature-flags/:key',
    middleware: [errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['feature-flags'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const key = req.pathParams.key as string

  if (!key) {
    return {
      status: 400,
      body: { error: 'Missing feature flag key' },
    }
  }

  const enabled = await isFeatureEnabled(key, logger)

  return {
    status: 200,
    body: { key, enabled },
  }
}
