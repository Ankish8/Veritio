import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyManager } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { deleteStudy } from '../../../services/study-service'
import { cancelScheduledEvent } from '../../../services/scheduler-service'

export const config = {
  name: 'DeleteStudy',
  description: 'Delete a study',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/studies/:studyId',
    middleware: [authMiddleware, requireStudyManager('studyId'), errorHandlerMiddleware],
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['study-deleted'],
  flows: ['study-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId } = req.pathParams

  logger.info('Deleting study', { userId, studyId })

  const jobId = `study-close-${studyId}`
  await cancelScheduledEvent(jobId)

  const supabase = getMotiaSupabaseClient()
  const { success, error } = await deleteStudy(supabase, studyId, userId)

  if (error) {
    if (error.message === 'Study not found') {
      logger.warn('Study not found for deletion', { userId, studyId })
      return {
        status: 404,
        body: { error: 'Study not found' },
      }
    }

    if (error.message.includes('Permission denied')) {
      logger.warn('Permission denied for study deletion', { userId, studyId, error: error.message })
      return {
        status: 403,
        body: { error: error.message },
      }
    }

    logger.error('Failed to delete study', { userId, studyId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to delete study' },
    }
  }

  logger.info('Study deleted successfully', { userId, studyId })

  enqueue({
    topic: 'study-deleted',
    data: { resourceType: 'study', resourceId: studyId, action: 'delete', userId, studyId },
  }).catch(() => {})

  return {
    status: 200,
    body: { success },
  }
}
