import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { setStudyTags } from '../../../services/study-tags-service'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

const bodySchema = z.object({
  tag_ids: z.array(z.string().uuid()),
})

export const config = {
  name: 'SetStudyStudyTags',
  description: 'Set tags assigned to a study',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/studies/:studyId/study-tags',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['study-tags-updated'],
  flows: ['research-repository'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId } = paramsSchema.parse(req.pathParams)

  const validation = validateRequest(bodySchema, req.body, logger)
  if (!validation.success) return validation.response

  logger.info('Setting study tags', { userId, studyId, tagCount: validation.data.tag_ids.length })

  const supabase = getMotiaSupabaseClient()
  const { data: tags, error } = await setStudyTags(supabase, studyId, validation.data.tag_ids, userId)

  if (error) {
    if (error.message.includes('not found')) {
      return {
        status: 404,
        body: { error: error.message },
      }
    }
    if (error.message.includes('authorized')) {
      return {
        status: 403,
        body: { error: error.message },
      }
    }
    logger.error('Failed to set study tags', { userId, studyId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to set study tags' },
    }
  }

  logger.info('Study tags set successfully', { userId, studyId, tagCount: tags?.length })

  enqueue({
    topic: 'study-tags-updated',
    data: {
      studyId,
      tagIds: validation.data.tag_ids,
      updatedBy: userId,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: tags,
  }
}
