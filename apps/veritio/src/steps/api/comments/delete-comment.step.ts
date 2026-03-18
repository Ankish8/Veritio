import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { deleteComment } from '../../../services/comments-service'
import { classifyError } from '../../../lib/api/classify-error'

export const config = {
  name: 'DeleteComment',
  description: 'Delete a comment (author or admin)',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/comments/:id',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['comment-deleted'],
  flows: ['collaboration'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const commentId = req.pathParams?.id as string

  if (!commentId) {
    return {
      status: 400,
      body: { error: 'Comment ID is required' },
    }
  }

  logger.info('Deleting comment', { userId, commentId })

  const supabase = getMotiaSupabaseClient()
  const { error } = await deleteComment(supabase, commentId, userId)

  if (error) {
    return classifyError(error, logger, 'Delete comment', {
      fallbackMessage: 'Failed to delete comment',
    })
  }

  logger.info('Comment deleted successfully', { userId, commentId })

  enqueue({
    topic: 'comment-deleted',
    data: {
      commentId,
      userId,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { success: true },
  }
}
