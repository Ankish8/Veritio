import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelTagAssignmentService, createPanelParticipantService } from '../../../../services/panel/index'

const paramsSchema = z.object({
  participantId: z.string().uuid(),
  tagId: z.string().uuid(),
})

export const config = {
  name: 'RemoveTagFromParticipant',
  description: 'Remove a tag from a panel participant',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/panel/participants/:participantId/tags/:tagId',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['panel-tag-removed'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const { participantId, tagId } = paramsSchema.parse(req.pathParams)

  logger.info('Removing tag from participant', { userId, participantId, tagId })

  const supabase = getMotiaSupabaseClient()
  const participantService = createPanelParticipantService(supabase)
  const tagAssignmentService = createPanelTagAssignmentService(supabase)

  try {
    // Verify participant ownership
    const participant = await participantService.get(userId, organizationId, participantId)
    if (!participant) {
      logger.warn('Participant not found', { userId, participantId })
      return {
        status: 404,
        body: { error: 'Participant not found' },
      }
    }

    await tagAssignmentService.removeTag(participantId, tagId)

    logger.info('Tag removed successfully', { userId, participantId, tagId })

    enqueue({
      topic: 'panel-tag-removed',
      data: {
        resourceType: 'panel-tag-assignment',
        action: 'delete',
        userId,
        participantId,
        tagId
      },
    }).catch(() => {})

    return {
      status: 200,
      body: { success: true },
    }
  } catch (error) {
    logger.error('Failed to remove tag', {
      userId,
      participantId,
      tagId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to remove tag' },
    }
  }
}
