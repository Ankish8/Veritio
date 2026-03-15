import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelParticipantService } from '../../../../services/panel/index'

const paramsSchema = z.object({
  participantId: z.string().uuid(),
})

export const config = {
  name: 'DeletePanelParticipant',
  description: 'Delete a panel participant',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/panel/participants/:participantId',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['panel-participant-deleted'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const { participantId } = paramsSchema.parse(req.pathParams)

  logger.info('Deleting panel participant', { userId, participantId })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelParticipantService(supabase)

  try {
    // Verify ownership
    const existing = await service.get(userId, organizationId, participantId)
    if (!existing) {
      logger.warn('Panel participant not found', { userId, participantId })
      return {
        status: 404,
        body: { error: 'Participant not found' },
      }
    }

    await service.delete(userId, organizationId, participantId)

    logger.info('Panel participant deleted successfully', { userId, participantId })

    enqueue({
      topic: 'panel-participant-deleted',
      data: { resourceType: 'panel-participant', action: 'delete', userId, participantId },
    }).catch(() => {})

    return {
      status: 200,
      body: { success: true },
    }
  } catch (error) {
    logger.error('Failed to delete panel participant', {
      userId,
      participantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to delete participant' },
    }
  }
}
