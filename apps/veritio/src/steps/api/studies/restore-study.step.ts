import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyManager } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { restoreStudy } from '../../../services/study-service'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const responseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  is_archived: z.boolean(),
})

export const config = {
  name: 'RestoreStudy',
  description: 'Restore an archived study',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:id/restore',
    middleware: [authMiddleware, requireStudyManager('id'), errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['study-restored'],
  flows: ['study-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { id: studyId } = paramsSchema.parse(req.pathParams)

  logger.info('Restoring study', { userId, studyId })

  const supabase = getMotiaSupabaseClient()
  const { data: study, error } = await restoreStudy(supabase, studyId, userId)

  if (error) {
    if (error.message === 'Study not found') {
      return {
        status: 404,
        body: { error: 'Study not found' },
      }
    }
    if (error.message.includes('Permission denied')) {
      logger.warn('Permission denied for study restore', { userId, studyId, error: error.message })
      return {
        status: 403,
        body: { error: error.message },
      }
    }
    logger.error('Failed to restore study', { userId, studyId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to restore study' },
    }
  }

  logger.info('Study restored successfully', { userId, studyId })

  enqueue({
    topic: 'study-restored',
    data: { resourceType: 'study', action: 'restore', userId, resourceId: studyId },
  }).catch(() => {})

  return {
    status: 200,
    body: { id: study!.id, title: study!.title, is_archived: study!.is_archived },
  }
}
