import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getCommentReadState } from '../../../services/comment-read-state-service'
import { classifyError } from '../../../lib/api/classify-error'

/**
 * Path shape is `/api/studies/:studyId/comment-read-state`, deliberately NOT
 * `/api/studies/:studyId/comments/read-state`: the latter is structurally
 * identical to the update/delete route `/api/studies/:studyId/comments/:commentId`,
 * and the engine rejects same-structure routes whose path parameters are named
 * differently.
 */

const responseSchema = z.object({
  lastReadAt: z.string().nullable(),
  unreadCount: z.number(),
})

export const config = {
  name: 'GetStudyCommentReadState',
  description: "Get the current user's comment read marker and unread count for a study",
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/comment-read-state',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
      200: responseSchema as any,
      400: z.object({ error: z.string() }) as any,
      401: z.object({ error: z.string() }) as any,
      403: z.object({ error: z.string() }) as any,
      404: z.object({ error: z.string() }) as any,
      500: z.object({ error: z.string() }) as any,
    },
  }],
  enqueues: [],
  flows: ['collaboration'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const studyId = req.pathParams?.studyId as string

  if (!studyId) {
    return { status: 400, body: { error: 'Study ID is required' } }
  }

  const supabase = getMotiaSupabaseClient()
  const { data, error } = await getCommentReadState(supabase, studyId, userId)

  if (error) {
    return classifyError(error, logger, 'Get comment read state', {
      fallbackMessage: 'Failed to fetch read state',
    })
  }

  return { status: 200, body: data! }
}
