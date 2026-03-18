import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getTagsForStudy } from '../../../services/study-tags-service'
import { classifyError } from '../../../lib/api/classify-error'

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
    return classifyError(error, logger, 'Get study tags', {
      fallbackMessage: 'Failed to get study tags',
    })
  }

  return {
    status: 200,
    body: tags,
  }
}
