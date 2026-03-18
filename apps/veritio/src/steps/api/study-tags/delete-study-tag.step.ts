import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { deleteStudyTag } from '../../../services/study-tags-service'
import { classifyError } from '../../../lib/api/classify-error'

const paramsSchema = z.object({
  tagId: z.string().uuid(),
})

export const config = {
  name: 'DeleteStudyTag',
  description: 'Delete a study tag',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/study-tags/:tagId',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['study-tag-deleted'],
  flows: ['research-repository'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { tagId } = paramsSchema.parse(req.pathParams)

  logger.info('Deleting study tag', { userId, tagId })

  const supabase = getMotiaSupabaseClient()
  const { error } = await deleteStudyTag(supabase, tagId, userId)

  if (error) {
    return classifyError(error, logger, 'Delete study tag', {
      fallbackMessage: 'Failed to delete study tag',
    })
  }

  logger.info('Study tag deleted successfully', { userId, tagId })

  enqueue({
    topic: 'study-tag-deleted',
    data: {
      tagId,
      deletedBy: userId,
    },
  }).catch(() => {})

  return {
    status: 204,
    body: null,
  }
}
