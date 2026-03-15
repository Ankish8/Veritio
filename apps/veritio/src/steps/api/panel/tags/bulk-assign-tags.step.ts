import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelTagAssignmentService, createPanelTagService } from '../../../../services/panel/index'

const paramsSchema = z.object({
  tagId: z.string().uuid(),
})

const bodySchema = z.object({
  participant_ids: z.array(z.string().uuid()).min(1).max(1000),
})

export const config = {
  name: 'BulkAssignTag',
  description: 'Assign a tag to multiple participants',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/panel/tags/:tagId/bulk-assign',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: ['panel-tags-bulk-assigned'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const { tagId } = paramsSchema.parse(req.pathParams)
  const { participant_ids } = bodySchema.parse(req.body || {})

  logger.info('Bulk assigning tag', { userId, tagId, count: participant_ids.length })

  const supabase = getMotiaSupabaseClient()
  const tagService = createPanelTagService(supabase)
  const tagAssignmentService = createPanelTagAssignmentService(supabase)

  try {
    // Verify tag ownership
    const tag = await tagService.get(userId, organizationId, tagId)
    if (!tag) {
      logger.warn('Tag not found', { userId, tagId })
      return {
        status: 404,
        body: { error: 'Tag not found' },
      }
    }

    const assignedCount = await tagAssignmentService.bulkAssignTag(
      participant_ids,
      tagId,
      'manual'
    )

    logger.info('Tags bulk assigned successfully', { userId, tagId, assignedCount })

    enqueue({
      topic: 'panel-tags-bulk-assigned',
      data: {
        resourceType: 'panel-tag-assignment',
        action: 'bulk-create',
        userId,
        tagId,
        assignedCount
      },
    }).catch(() => {})

    return {
      status: 200,
      body: { assigned_count: assignedCount },
    }
  } catch (error) {
    logger.error('Failed to bulk assign tag', {
      userId,
      tagId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to bulk assign tag' },
    }
  }
}
