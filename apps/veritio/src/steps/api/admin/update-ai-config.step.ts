import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { validateRequest } from '../../../lib/api/validate-request'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { updateAdminAiConfig } from '../../../services/admin-ai-config-service'

const providerSchema = z.object({
  apiKey: z.string().max(500).nullable().optional(),
  baseUrl: z.string().url().max(2048).nullable().optional(),
  model: z.string().max(200).nullable().optional(),
  dailyLimit: z.number().int().min(0).max(100000).optional(),
}).optional()

const bodySchema = z.object({
  openai: providerSchema,
  mercury: providerSchema,
})

export const config = {
  name: 'AdminUpdateAiConfig',
  description: 'Update admin AI model configuration',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/admin/ai-config',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: ['admin-audit-log'],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  const validation = validateRequest(bodySchema, req.body, logger)
  if (!validation.success) return validation.response

  // Don't log API keys
  const { openai, mercury } = validation.data
  logger.info('Updating admin AI config', {
    userId,
    openaiFields: openai ? Object.keys(openai).filter(k => k !== 'apiKey') : [],
    mercuryFields: mercury ? Object.keys(mercury).filter(k => k !== 'apiKey') : [],
  })

  const supabase = getMotiaSupabaseClient()
  const result = await updateAdminAiConfig(supabase, validation.data, userId)

  enqueue({
    topic: 'admin-audit-log',
    data: { userId, action: 'admin_ai_config_updated', resourceType: 'admin_ai_config', metadata: {} },
  }).catch(() => {})

  return { status: 200, body: result }
}
