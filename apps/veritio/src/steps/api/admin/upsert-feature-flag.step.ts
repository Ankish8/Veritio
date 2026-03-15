import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const bodySchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean(),
  scope: z.string().optional(),
  scopeIds: z.array(z.string()).optional(),
})

export const config = {
  name: 'AdminUpsertFeatureFlag',
  description: 'Create or update a feature flag',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/admin/feature-flags',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: ['admin-audit-log'],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const body = bodySchema.parse(req.body)
  const userId = req.headers['x-user-id'] as string

  logger.info('Upserting feature flag', { key: body.key, id: body.id })

  const supabase = getMotiaSupabaseClient()

  const record: Record<string, unknown> = {
    key: body.key,
    name: body.name,
    description: body.description ?? null,
    enabled: body.enabled,
    scope: body.scope ?? null,
    scope_ids: body.scopeIds ?? null,
    updated_at: new Date().toISOString(),
  }

  if (body.id) {
    // Update existing
    const { data, error } = await (supabase as any)
      .from('feature_flags')
      .update(record)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update feature flag', { error: error.message })
      return {
        status: 500,
        body: { error: 'Failed to update feature flag' },
      }
    }

    enqueue({
      topic: 'admin-audit-log',
      data: { userId, action: 'feature_flag_updated', resourceType: 'feature_flag', resourceId: body.id, metadata: { key: body.key } },
    }).catch(() => {})

    return { status: 200, body: data }
  } else {
    // Create new
    record.created_by = userId

    const { data, error } = await (supabase as any)
      .from('feature_flags')
      .insert(record)
      .select()
      .single()

    if (error) {
      logger.error('Failed to create feature flag', { error: error.message })
      return {
        status: 500,
        body: { error: 'Failed to create feature flag' },
      }
    }

    enqueue({
      topic: 'admin-audit-log',
      data: { userId, action: 'feature_flag_created', resourceType: 'feature_flag', resourceId: data.id, metadata: { key: body.key } },
    }).catch(() => {})

    return { status: 201, body: data }
  }
}
