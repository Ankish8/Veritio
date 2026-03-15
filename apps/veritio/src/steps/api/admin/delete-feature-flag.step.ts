import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'AdminDeleteFeatureFlag',
  description: 'Delete a feature flag by ID',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/admin/feature-flags/:id',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
  }],
  enqueues: ['admin-audit-log'],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const flagId = req.pathParams.id
  const userId = req.headers['x-user-id'] as string

  if (!flagId) {
    return {
      status: 400,
      body: { error: 'Feature flag ID is required' },
    }
  }

  logger.info('Deleting feature flag', { id: flagId })

  const supabase = getMotiaSupabaseClient()

  const { error } = await (supabase as any)
    .from('feature_flags')
    .delete()
    .eq('id', flagId)

  if (error) {
    logger.error('Failed to delete feature flag', { error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to delete feature flag' },
    }
  }

  enqueue({
    topic: 'admin-audit-log',
    data: { userId, action: 'feature_flag_deleted', resourceType: 'feature_flag', resourceId: flagId },
  }).catch(() => {})

  return {
    status: 200,
    body: { success: true },
  }
}
