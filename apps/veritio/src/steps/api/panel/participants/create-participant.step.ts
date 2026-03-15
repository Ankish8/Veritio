import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelParticipantService, createPanelTagAssignmentService } from '../../../../services/panel/index'
import { createPanelParticipantSchema } from '../../../../lib/supabase/panel-types'

const bodySchema = createPanelParticipantSchema.extend({
  tag_ids: z.array(z.string().uuid()).optional(),
})

export const config = {
  name: 'CreatePanelParticipant',
  description: 'Create a new panel participant',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/panel/participants',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: ['panel-participant-created'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const body = bodySchema.parse(req.body || {})
  const { tag_ids, ...participantData } = body

  logger.info('Creating panel participant', { userId, email: participantData.email })

  const supabase = getMotiaSupabaseClient()
  const participantService = createPanelParticipantService(supabase)
  const tagAssignmentService = createPanelTagAssignmentService(supabase)

  try {
    // Check if email already exists
    const existing = await participantService.findByEmail(userId, organizationId, participantData.email)
    if (existing) {
      logger.warn('Participant with email already exists', { userId, email: participantData.email })
      return {
        status: 409,
        body: { error: 'A participant with this email already exists' },
      }
    }

    // Create participant
    const participant = await participantService.create(userId, organizationId, participantData)

    // Assign tags in parallel if provided
    if (tag_ids && tag_ids.length > 0) {
      await Promise.all(
        tag_ids.map((tagId) => tagAssignmentService.assignTag(participant.id, tagId, 'manual'))
      )
    }

    logger.info('Panel participant created successfully', { userId, participantId: participant.id })

    enqueue({
      topic: 'panel-participant-created',
      data: { resourceType: 'panel-participant', action: 'create', userId, participantId: participant.id },
    }).catch(() => {})

    return {
      status: 201,
      body: participant,
    }
  } catch (error) {
    logger.error('Failed to create panel participant', {
      userId,
      email: participantData.email,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to create participant' },
    }
  }
}
