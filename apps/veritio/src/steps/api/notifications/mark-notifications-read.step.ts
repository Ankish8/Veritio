import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { markNotificationsRead } from '../../../services/notification-service'
import { classifyError } from '../../../lib/api/classify-error'

const bodySchema = z.object({
  /** Omit to mark every unread notification read. */
  ids: z.array(z.string().uuid()).max(200).optional(),
})

export const config = {
  name: 'MarkNotificationsRead',
  description: "Mark some or all of the calling user's notifications as read",
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/notifications/read',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
      200: z.object({ unreadCount: z.number() }) as any,
      400: z.object({ error: z.string() }) as any,
      401: z.object({ error: z.string() }) as any,
      500: z.object({ error: z.string() }) as any,
    },
  }],
  enqueues: [],
  flows: ['notifications'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  const parsed = bodySchema.safeParse(req.body ?? {})
  const ids = parsed.success ? parsed.data.ids : undefined

  const supabase = getMotiaSupabaseClient()
  const { data, error } = await markNotificationsRead(supabase, userId, ids)

  if (error) {
    return classifyError(error, logger, 'Mark notifications read', {
      fallbackMessage: 'Failed to update notifications',
    })
  }

  return { status: 200, body: data! }
}
