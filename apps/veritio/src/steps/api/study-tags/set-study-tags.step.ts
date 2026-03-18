import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { setStudyTags } from '../../../services/study-tags-service'
import { classifyError } from '../../../lib/api/classify-error'

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

  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    logger.warn('Set study tags validation failed', { errors: parsed.error.issues })
    return {
      status: 400,
      body: {
        error: 'Validation failed',
        details: parsed.error.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    }
  }

  logger.info('Setting study tags', { userId, studyId, tagCount: parsed.data.tag_ids.length })

  const supabase = getMotiaSupabaseClient()
  const { data: tags, error } = await setStudyTags(supabase, studyId, parsed.data.tag_ids, userId)

  if (error) {
    return classifyError(error, logger, 'Set study tags', {
      fallbackMessage: 'Failed to set study tags',
    })
  }

  logger.info('Study tags set successfully', { userId, studyId, tagCount: tags?.length })

  enqueue({
    topic: 'study-tags-updated',
    data: {
      studyId,
      tagIds: parsed.data.tag_ids,
      updatedBy: userId,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: tags,
  }
}
