import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getAdminAiConfig } from '../../../services/admin-ai-config-service'

export const config = {
  name: 'AdminGetAiConfig',
  description: 'Get admin AI model configuration',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/admin/ai-config',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (_req: ApiRequest, { logger }: ApiHandlerContext) => {
  logger.info('Fetching admin AI config')

  const supabase = getMotiaSupabaseClient()
  const config = await getAdminAiConfig(supabase)

  return { status: 200, body: config }
}
