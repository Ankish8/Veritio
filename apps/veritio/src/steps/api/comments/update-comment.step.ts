import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { updateComment } from '../../../services/comments-service'
import { updateCommentSchema } from '../../../lib/supabase/collaboration-types'

const responseSchema = z.object({
  id: z.string().uuid(),
  study_id: z.string().uuid(),
  author_user_id: z.string(),
  content: z.string(),
  parent_comment_id: z.string().uuid().nullable(),
  thread_position: z.number(),
  mentions: z.array(z.string()),
  is_deleted: z.boolean(),
  deleted_at: z.string().nullable(),
  deleted_by_user_id: z.string().nullable(),
  edited_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const config = {
  name: 'UpdateComment',
  description: 'Update a comment (author only)',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/comments/:id',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: updateCommentSchema as any,
    responseSchema: {
    200: responseSchema as any,
    400: z.object({
      error: z.string(),
      details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['comment-updated'],
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

  const validation = validateRequest(updateCommentSchema, req.body, logger)
  if (!validation.success) return validation.response

  const { content } = validation.data

  logger.info('Updating comment', { userId, commentId })

  const supabase = getMotiaSupabaseClient()
  const { data: comment, error } = await updateComment(supabase, commentId, userId, content)

  if (error) {
    if (error.message.includes('Permission denied') || error.message.includes('only author')) {
      return {
        status: 403,
        body: { error: error.message },
      }
    }
    if (error.message.includes('not found') || error.message.includes('deleted')) {
      return {
        status: 404,
        body: { error: 'Comment not found' },
      }
    }
    logger.error('Failed to update comment', { userId, commentId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to update comment' },
    }
  }

  logger.info('Comment updated successfully', { userId, commentId })

  enqueue({
    topic: 'comment-updated',
    data: {
      commentId: comment!.id,
      studyId: comment!.study_id,
      userId,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: comment!,
  }
}
