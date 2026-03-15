import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelParticipantService } from '../../../../services/panel/index'
import { PARTICIPANT_STATUS, PARTICIPANT_SOURCE } from '../../../../lib/supabase/panel-types'

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  sort_by: z.string().optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  status: z.enum(PARTICIPANT_STATUS).optional(),
  source: z.enum(PARTICIPANT_SOURCE).optional(),
  search: z.string().optional(),
  segment_id: z.string().uuid().optional(),
  tag_id: z.string().uuid().optional(),
})

export const config = {
  name: 'ListPanelParticipants',
  description: 'List all panel participants for the current user',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/panel/participants',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['panel-participants-listed'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const query = querySchema.parse(req.queryParams || {})

  logger.info('Listing panel participants', { userId, query })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelParticipantService(supabase)

  try {
    const result = await service.list(
      userId,
      organizationId,
      {
        status: query.status,
        source: query.source,
        search: query.search,
        segment_id: query.segment_id,
        tag_id: query.tag_id,
      },
      {
        page: query.page,
        limit: query.limit,
        sort_by: query.sort_by,
        sort_order: query.sort_order,
      }
    )

    logger.info('Panel participants listed successfully', {
      userId,
      count: result.data.length,
      total: result.total
    })

    enqueue({
      topic: 'panel-participants-listed',
      data: { resourceType: 'panel-participant', action: 'list', userId, count: result.total },
    }).catch(() => {})

    return {
      status: 200,
      body: result,
    }
  } catch (error) {
    logger.error('Failed to list panel participants', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to list participants' },
    }
  }
}
