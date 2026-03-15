import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelParticipantService } from '../../../../services/panel/index'

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
})

export const config = {
  name: 'BulkDeletePanelParticipants',
  description: 'Bulk delete panel participants',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/panel/participants/bulk-delete',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const { ids } = bodySchema.parse(req.body)

  logger.info('Bulk deleting panel participants', { userId, count: ids.length })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelParticipantService(supabase)

  try {
    const deleted = await service.bulkDelete(userId, organizationId, ids)

    logger.info('Panel participants bulk deleted', { userId, deleted })

    return {
      status: 200,
      body: { deleted },
    }
  } catch (error) {
    logger.error('Failed to bulk delete panel participants', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return {
      status: 500,
      body: { error: 'Failed to delete participants' },
    }
  }
}
