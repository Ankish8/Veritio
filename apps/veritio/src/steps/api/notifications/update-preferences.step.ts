import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { updatePreferences } from '../../../services/notification-preferences-service'
import { classifyError } from '../../../lib/api/classify-error'

const bodySchema = z.object({
  updates: z
    .array(
      z.object({
        category: z.enum(['mention', 'study', 'job', 'system', 'billing']),
        inApp: z.boolean().optional(),
        email: z.boolean().optional(),
      })
    )
    .min(1)
    .max(5),
})

export const config = {
  name: 'UpdateNotificationPreferences',
  description: "Update the calling user's notification channel preferences",
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/notification-preferences',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
      200: z.record(z.object({ inApp: z.boolean(), email: z.boolean() })) as any,
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

  const validation = validateRequest(bodySchema, req.body, logger)
  if (!validation.success) return validation.response

  const supabase = getMotiaSupabaseClient()
  const { data, error } = await updatePreferences(supabase, userId, validation.data.updates)

  if (error) {
    return classifyError(error, logger, 'Update notification preferences', {
      fallbackMessage: 'Failed to update preferences',
    })
  }

  return { status: 200, body: data! }
}
