import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listStudyTags } from '../../../services/study-tags-service'
import { classifyError } from '../../../lib/api/classify-error'

const paramsSchema = z.object({
  orgId: z.string().uuid(),
})

export const config = {
  name: 'ListOrganizationStudyTags',
  description: 'List all study tags for an organization',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/organizations/:orgId/study-tags',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['research-repository'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { orgId } = paramsSchema.parse(req.pathParams)

  logger.info('Listing study tags', { userId, orgId })

  const supabase = getMotiaSupabaseClient()
  const { data: tags, error } = await listStudyTags(supabase, orgId, userId)

  if (error) {
    return classifyError(error, logger, 'List study tags', {
      fallbackMessage: 'Failed to list study tags',
    })
  }

  return {
    status: 200,
    body: tags,
  }
}
