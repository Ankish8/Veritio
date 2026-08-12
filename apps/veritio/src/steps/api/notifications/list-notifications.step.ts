import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listNotifications } from '../../../services/notification-service'
import { classifyError } from '../../../lib/api/classify-error'

const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  category: z.string(),
  group_key: z.string().nullable(),
  study_id: z.string().nullable(),
  metadata: z.any().nullable(),
  read: z.boolean(),
  created_at: z.string(),
})

export const config = {
  name: 'ListNotifications',
  description: "List the calling user's in-app notifications",
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/notifications',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
      200: z.object({
        notifications: z.array(notificationSchema),
        unreadCount: z.number(),
        unreadByCategory: z.record(z.number()),
        hasMore: z.boolean(),
      }) as any,
      401: z.object({ error: z.string() }) as any,
      500: z.object({ error: z.string() }) as any,
    },
  }],
  enqueues: [],
  flows: ['notifications'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  const limit = req.queryParams?.limit
    ? parseInt(req.queryParams.limit as string, 10)
    : undefined
  const unreadOnly = req.queryParams?.unreadOnly === 'true'
  const before = req.queryParams?.before as string | undefined
  const category = req.queryParams?.category as string | undefined

  const supabase = getMotiaSupabaseClient()
  const { data, error } = await listNotifications(supabase, userId, {
    limit,
    unreadOnly,
    before,
    category,
  })

  if (error) {
    return classifyError(error, logger, 'List notifications', {
      fallbackMessage: 'Failed to fetch notifications',
    })
  }

  return { status: 200, body: data! }
}
