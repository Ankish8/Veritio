import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getPreferences } from '../../../services/notification-preferences-service'
import { classifyError } from '../../../lib/api/classify-error'

const channelSchema = z.object({ inApp: z.boolean(), email: z.boolean() })

export const config = {
  name: 'GetNotificationPreferences',
  description: "Get the calling user's per-category notification channel preferences",
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/notification-preferences',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
      200: z.object({
        mention: channelSchema,
        study: channelSchema,
        job: channelSchema,
        system: channelSchema,
        billing: channelSchema,
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

  try {
    const supabase = getMotiaSupabaseClient()
    return { status: 200, body: await getPreferences(supabase, userId) }
  } catch (error) {
    return classifyError(
      error instanceof Error ? error : new Error('Failed to fetch preferences'),
      logger,
      'Get notification preferences',
      { fallbackMessage: 'Failed to fetch preferences' }
    )
  }
}
