import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { deleteSegment } from '../../../services/segment-service'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  segmentId: z.string().uuid(),
})

export const config = {
  name: 'DeleteSegment',
  description: 'Delete a segment',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/studies/:studyId/segments/:segmentId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['segment-deleted'],
  flows: ['segments'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const params = paramsSchema.parse(req.pathParams)

  logger.info('Deleting segment', { userId, studyId: params.studyId, segmentId: params.segmentId })

  const supabase = getMotiaSupabaseClient()
  const { success, error } = await deleteSegment(supabase, params.segmentId)

  if (error) {
    logger.error('Failed to delete segment', { userId, segmentId: params.segmentId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to delete segment' },
    }
  }

  logger.info('Segment deleted successfully', { userId, segmentId: params.segmentId })

  enqueue({
    topic: 'segment-deleted',
    data: { resourceType: 'segment', action: 'delete', userId, studyId: params.studyId, segmentId: params.segmentId },
  }).catch(() => {})

  return {
    status: 200,
    body: { success },
  }
}
