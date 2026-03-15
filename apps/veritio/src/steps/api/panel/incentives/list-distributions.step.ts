import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelIncentiveService } from '../../../../services/panel/index'
import { INCENTIVE_STATUS } from '../../../../lib/supabase/panel-types'

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  sort_by: z.string().optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  study_id: z.string().uuid().optional(),
  status: z.enum(INCENTIVE_STATUS).optional(),
})

export const config = {
  name: 'ListIncentiveDistributions',
  description: 'List all incentive distributions for the current user',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/panel/incentives',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['incentive-distributions-listed'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const query = querySchema.parse(req.queryParams || {})

  logger.info('Listing incentive distributions', { userId, organizationId, query })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelIncentiveService(supabase)

  try {
    const result = await service.listDistributions(
      userId,
      organizationId,
      {
        study_id: query.study_id,
        status: query.status,
      },
      {
        page: query.page,
        limit: query.limit,
        sort_by: query.sort_by,
        sort_order: query.sort_order,
      }
    )

    logger.info('Incentive distributions listed', { userId, count: result.data.length })

    enqueue({
      topic: 'incentive-distributions-listed',
      data: { resourceType: 'incentive-distribution', action: 'list', userId, count: result.total },
    }).catch(() => {})

    return {
      status: 200,
      body: result,
    }
  } catch (error) {
    logger.error('Failed to list incentive distributions', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to list distributions' },
    }
  }
}
