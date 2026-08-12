import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { setCommentResolved } from '../../../services/comments-service'
import { classifyError } from '../../../lib/api/classify-error'

const bodySchema = z.object({
  resolved: z.boolean(),
})

export const config = {
  name: 'ResolveComment',
  description: 'Resolve or reopen a comment thread',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/studies/:studyId/comments/:commentId/resolution',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
      200: z.object({ id: z.string(), resolved_at: z.string().nullable() }).passthrough() as any,
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
  const { data: comment, error } = await setCommentResolved(
    supabase,
    commentId,
    userId,
    validation.data.resolved
  )

  if (error) {
    return classifyError(error, logger, 'Resolve comment', {
      fallbackMessage: 'Failed to update resolution',
    })
  }

  enqueue({
    topic: 'comment-updated',
    data: { commentId, studyId, kind: 'updated' as const, userId },
  }).catch(() => {})

  return { status: 200, body: comment! }
}
