import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { toggleCommentReaction, ALLOWED_REACTIONS } from '../../../services/comments-service'
import { classifyError } from '../../../lib/api/classify-error'

const bodySchema = z.object({
  emoji: z.enum(ALLOWED_REACTIONS as unknown as [string, ...string[]]),
})

export const config = {
  name: 'ReactToComment',
  description: 'Toggle an emoji reaction on a comment for the calling user',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/comments/:commentId/reactions',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
      200: z.object({ reacted: z.boolean() }) as any,
      400: z.object({ error: z.string() }) as any,
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
  const commentId = req.pathParams?.commentId as string
  const studyId = req.pathParams?.studyId as string

  if (!commentId) {
    return { status: 400, body: { error: 'Comment ID is required' } }
  }

  const validation = validateRequest(bodySchema, req.body, logger)
  if (!validation.success) return validation.response

  const supabase = getMotiaSupabaseClient()
  const { data, error } = await toggleCommentReaction(
    supabase,
    commentId,
    userId,
    validation.data.emoji
  )

  if (error) {
    return classifyError(error, logger, 'React to comment', {
      fallbackMessage: 'Failed to update reaction',
    })
  }

  enqueue({
    topic: 'comment-updated',
    data: { commentId, studyId, kind: 'updated' as const, userId },
  }).catch(() => {})

  return { status: 200, body: data! }
}
