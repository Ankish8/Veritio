import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'AdminListFeatureFlags',
  description: 'List all feature flags',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/admin/feature-flags',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (_req: ApiRequest, { logger }: ApiHandlerContext) => {
  logger.info('Listing feature flags')

  const supabase = getMotiaSupabaseClient()

  const { data: flags, error } = await (supabase as any)
    .from('feature_flags')
    .select('*, creator:created_by(id, name, email)')
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Failed to list feature flags', { error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to list feature flags' },
    }
  }

  return {
    status: 200,
    body: { flags: flags ?? [] },
  }
}
