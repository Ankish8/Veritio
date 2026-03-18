import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { listAvailableTriggers } from '../../../../services/composio/triggers'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { validateRequest } from '../../../../lib/api/validate-request'
import { Errors, Success } from './shared'

const querySchema = z.object({
  toolkit: z.string().min(1),
})

export const config = {
  name: 'ComposioListAvailableTriggers',
  description: 'List available trigger types for a toolkit',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/integrations/composio/triggers/available',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['auth'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const validation = validateRequest(querySchema, req.queryParams, logger)
  if (!validation.success) return validation.response

  const { toolkit } = validation.data
  logger.info('Listing available triggers', { toolkit })

  const { data, error } = await listAvailableTriggers(toolkit)

  if (error) {
    logger.error('Failed to list available triggers', { toolkit, error: error.message })
    return Errors.serverError('Failed to list available triggers')
  }

  return Success.ok({ triggers: data })
}
