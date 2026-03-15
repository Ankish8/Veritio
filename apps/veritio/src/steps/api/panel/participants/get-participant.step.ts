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
  name: 'GetPanelParticipant',
  description: 'Get a panel participant by ID with full details',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/panel/participants/:participantId',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['panel-participant-fetched'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const { participantId } = paramsSchema.parse(req.pathParams)

  logger.info('Getting panel participant', { userId, participantId })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelParticipantService(supabase)

  try {
    const participant = await service.get(userId, organizationId, participantId)

    if (!participant) {
      logger.warn('Panel participant not found', { userId, participantId })
      return {
        status: 404,
        body: { error: 'Participant not found' },
      }
    }

    logger.info('Panel participant fetched successfully', { userId, participantId })

    // Await emit to prevent "Process ended while there are some promises outstanding"
    enqueue({
      topic: 'panel-participant-fetched',
      data: { resourceType: 'panel-participant', action: 'get', userId, participantId },
    }).catch(() => {})

    // Debug: Ensure data is JSON-serializable
    try {
      JSON.stringify(participant)
    } catch (serializeError) {
      logger.error('Participant data not serializable', {
        error: serializeError instanceof Error ? serializeError.message : 'Unknown',
        keys: Object.keys(participant),
      })
      return {
        status: 500,
        body: { error: 'Data serialization error' },
      }
    }

    return {
      status: 200,
      body: participant,
    }
  } catch (error) {
    logger.error('Failed to get panel participant', {
      userId,
      participantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to get participant' },
    }
  }
}
