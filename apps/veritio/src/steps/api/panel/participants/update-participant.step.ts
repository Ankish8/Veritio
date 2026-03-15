import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelParticipantService, createPanelTagAssignmentService } from '../../../../services/panel/index'
import { updatePanelParticipantSchema } from '../../../../lib/supabase/panel-types'

const paramsSchema = z.object({
  participantId: z.string().uuid(),
})

const bodySchema = updatePanelParticipantSchema.extend({
  tag_ids: z.array(z.string().uuid()).optional(),
})

export const config = {
  name: 'UpdatePanelParticipant',
  description: 'Update a panel participant',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/panel/participants/:participantId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: ['panel-participant-updated'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const { participantId } = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body || {})
  const { tag_ids, ...updateData } = body

  logger.info('Updating panel participant', { userId, participantId })

  const supabase = getMotiaSupabaseClient()
  const participantService = createPanelParticipantService(supabase)
  const tagAssignmentService = createPanelTagAssignmentService(supabase)

  try {
    // Verify ownership
    const existing = await participantService.get(userId, organizationId, participantId)
    if (!existing) {
      logger.warn('Panel participant not found', { userId, participantId })
      return {
        status: 404,
        body: { error: 'Participant not found' },
      }
    }

    // Update participant
    const participant = await participantService.update(userId, organizationId, participantId, updateData)

    // Update tags if provided
    if (tag_ids !== undefined) {
      await tagAssignmentService.replaceParticipantTags(participantId, tag_ids, 'manual')
    }

    logger.info('Panel participant updated successfully', { userId, participantId })

    enqueue({
      topic: 'panel-participant-updated',
      data: { resourceType: 'panel-participant', action: 'update', userId, participantId },
    }).catch(() => {})

    return {
      status: 200,
      body: participant,
    }
  } catch (error) {
    logger.error('Failed to update panel participant', {
      userId,
      participantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to update participant' },
    }
  }
}
