import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelIncentiveService } from '../../../../services/panel/index'
import { upsertIncentiveConfigSchema } from '../../../../lib/supabase/panel-types'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const config = {
  name: 'UpsertStudyIncentiveConfig',
  description: 'Create or update the incentive configuration for a study',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/studies/:studyId/incentive-config',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    bodySchema: upsertIncentiveConfigSchema as any,
  }],
  enqueues: ['incentive-config-updated'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId } = paramsSchema.parse(req.pathParams)
  const body = upsertIncentiveConfigSchema.parse(req.body || {})

  logger.info('Upserting study incentive config', { studyId, enabled: body.enabled })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelIncentiveService(supabase)

  try {
    const incentiveConfig = await service.upsertConfig(userId, studyId, body)

    logger.info('Study incentive config upserted', { studyId })

    enqueue({
      topic: 'incentive-config-updated',
      data: { resourceType: 'incentive-config', action: 'upsert', userId, studyId },
    }).catch(() => {})

    return {
      status: 200,
      body: incentiveConfig,
    }
  } catch (error) {
    logger.error('Failed to upsert study incentive config', {
      studyId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to update incentive configuration' },
    }
  }
}
