import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { markCommentsRead } from '../../../services/comment-read-state-service'
import { classifyError } from '../../../lib/api/classify-error'

const bodySchema = z.object({
  /** Read up to this instant. Defaults to now. Never moves the marker back. */
  readAt: z.string().datetime().optional(),
})

const responseSchema = z.object({
  lastReadAt: z.string().nullable(),
  unreadCount: z.number(),
})

export const config = {
  name: 'MarkStudyCommentsRead',
  description: "Advance the current user's comment read marker for a study",
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/studies/:studyId/comment-read-state',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
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

  const parsed = bodySchema.safeParse(req.body ?? {})
  const readAt = parsed.success ? parsed.data.readAt : undefined

  const supabase = getMotiaSupabaseClient()
  const { data, error } = await markCommentsRead(supabase, studyId, userId, readAt)

  if (error) {
    return classifyError(error, logger, 'Mark comments read', {
      fallbackMessage: 'Failed to update read state',
    })
  }

  return { status: 200, body: data! }
}
