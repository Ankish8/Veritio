import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getTagsForStudy } from '../../../services/study-tags-service'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const config = {
  name: 'GetStudyStudyTags',
  description: 'Get tags assigned to a study',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/study-tags',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['research-repository'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId } = paramsSchema.parse(req.pathParams)

  logger.info('Getting study tags', { userId, studyId })

  const supabase = getMotiaSupabaseClient()
  const { data: tags, error } = await getTagsForStudy(supabase, studyId, userId)

  if (error) {
    if (error.message.includes('not found') || error.message.includes('Study not found')) {
      return {
        status: 404,
        body: { error: 'Study not found' },
      }
    }
    if (error.message.includes('authorized')) {
      return {
        status: 403,
        body: { error: error.message },
      }
    }
    logger.error('Failed to get study tags', { userId, studyId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to get study tags' },
    }
  }

  return {
    status: 200,
    body: tags,
  }
}
