import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { isComposioConfigured } from '../../../../services/composio/index'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { validateRequest } from '../../../../lib/api/validate-request'
import { getAllowedToolkits } from '../../../../lib/composio/allowed-tools'
import { Success } from './shared'

const querySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
})

export const config = {
  name: 'ComposioListToolkits',
  description: 'List available Composio toolkits',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/integrations/composio/toolkits',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['integrations'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  if (!isComposioConfigured()) {
    return Success.ok({ toolkits: [], categories: [], configured: false })
  }

  const validation = validateRequest(querySchema, req.queryParams, logger)
  if (!validation.success) {
    return Success.ok({ toolkits: [], categories: [], configured: true })
  }

  // Use static metadata — no external Composio API call needed.
  // The allowed toolkits list is small and fixed.
  const toolkits = getAllowedToolkits(validation.data.search)

  logger.info('Returning allowed toolkits', { count: toolkits.length })

  return Success.ok({
    configured: true,
    toolkits,
    nextCursor: null,
    total: toolkits.length,
    categories: [],
  })
}
