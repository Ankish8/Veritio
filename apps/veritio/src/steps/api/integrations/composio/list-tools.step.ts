import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { isComposioConfigured, listToolsForToolkit } from '../../../../services/composio/index'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { validateRequest } from '../../../../lib/api/validate-request'
import { ALLOWED_COMPOSIO_TOOLS } from '../../../../lib/composio/allowed-tools'
import { Errors, Success } from './shared'

const pathParamsSchema = z.object({
  toolkit: z.string().min(1),
})

const querySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const config = {
  name: 'ComposioListTools',
  description: 'List tools for a Composio toolkit',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/integrations/composio/toolkits/:toolkit/tools',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['integrations'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  if (!isComposioConfigured()) {
    return Success.ok({ tools: [], configured: false })
  }

  const paramsValidation = validateRequest(pathParamsSchema, req.pathParams, logger)
  if (!paramsValidation.success) return paramsValidation.response

  const queryValidation = validateRequest(querySchema, req.queryParams, logger)
  if (!queryValidation.success) return queryValidation.response

  const { toolkit } = paramsValidation.data
  logger.info('Listing tools for toolkit', { toolkit, params: queryValidation.data })

  const { data: tools, error } = await listToolsForToolkit(toolkit, queryValidation.data)

  if (error) {
    logger.error('Failed to list tools', { toolkit, error: error.message })
    return Errors.serverError('Failed to list tools')
  }

  // Filter to only allowed tools
  const allowedTools = tools.filter((tool) => ALLOWED_COMPOSIO_TOOLS.includes(tool.slug as never))

  logger.info('Filtered to allowed tools', {
    toolkit,
    totalTools: tools.length,
    allowedTools: allowedTools.length,
  })

  return Success.ok({ configured: true, toolkit, tools: allowedTools })
}
