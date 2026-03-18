import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelTagAssignmentService, createPanelParticipantService } from '../../../../services/panel/index'
import { assignTagSchema } from '../../../../lib/supabase/panel-types'
import { classifyError } from '../../../../lib/api/classify-error'

const paramsSchema = z.object({
  participantId: z.string().uuid(),
})

export const config = {
  name: 'AssignTagToParticipant',
  description: 'Assign a tag to a panel participant',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/panel/participants/:participantId/tags',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: assignTagSchema as any,
  }],
  enqueues: ['panel-tag-assigned'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const { participantId } = paramsSchema.parse(req.pathParams)
  const body = assignTagSchema.parse(req.body || {})

  logger.info('Assigning tag to participant', { userId, participantId, tagId: body.panel_tag_id })

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

    const assignment = await tagAssignmentService.assignTag(
      participantId,
      body.panel_tag_id,
      body.source
    )

    logger.info('Tag assigned successfully', { userId, participantId, tagId: body.panel_tag_id })

    enqueue({
      topic: 'panel-tag-assigned',
      data: {
        resourceType: 'panel-tag-assignment',
        action: 'create',
        userId,
        participantId,
        tagId: body.panel_tag_id
      },
    }).catch(() => {})

    return {
      status: 201,
      body: assignment,
    }
  } catch (error) {
    return classifyError(error, logger, 'Assign tag', {
      fallbackMessage: 'Failed to assign tag',
    })
  }
}
