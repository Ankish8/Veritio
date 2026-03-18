import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { createStudyComment, parseMentions } from '../../../services/comments-service'
import { createCommentSchema } from '../../../lib/supabase/collaboration-types'
import { classifyError } from '../../../lib/api/classify-error'

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
  name: 'CreateStudyComment',
  description: 'Create a comment on a study (requires editor role)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/comments',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: createCommentSchema as any,
    responseSchema: {
    201: responseSchema as any,
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
  enqueues: ['comment-created'],
  flows: ['collaboration'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const studyId = req.pathParams?.studyId as string

  if (!studyId) {
    return {
      status: 400,
      body: { error: 'Study ID is required' },
    }
  }

  const validation = validateRequest(createCommentSchema, req.body, logger)
  if (!validation.success) return validation.response

  const { content, parent_comment_id } = validation.data

  logger.info('Creating comment', { userId, studyId, isReply: !!parent_comment_id })

  const supabase = getMotiaSupabaseClient()
  const { data: comment, error } = await createStudyComment(supabase, studyId, userId, {
    content,
    parentCommentId: parent_comment_id,
  })

  if (error) {
    return classifyError(error, logger, 'Create comment', {
      fallbackMessage: 'Failed to create comment',
    })
  }

  logger.info('Comment created successfully', { userId, studyId, commentId: comment?.id })

  const mentions = parseMentions(content)
  enqueue({
    topic: 'comment-created',
    data: {
      commentId: comment!.id,
      studyId,
      authorUserId: userId,
      mentions,
      isReply: !!parent_comment_id,
      parentCommentId: parent_comment_id || null,
    },
  }).catch(() => {})

  return {
    status: 201,
    body: comment!,
  }
}
