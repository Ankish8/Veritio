import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelNoteService, createPanelParticipantService } from '../../../../services/panel/index'

const paramsSchema = z.object({
  participantId: z.string().uuid(),
})

export const config = {
  name: 'ListParticipantNotes',
  description: 'List all notes for a participant',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/panel/participants/:participantId/notes',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const { participantId } = paramsSchema.parse(req.pathParams)

  logger.info('Listing participant notes', { userId, participantId })

  const supabase = getMotiaSupabaseClient()
  const participantService = createPanelParticipantService(supabase)
  const noteService = createPanelNoteService(supabase)

  try {
    // Verify participant ownership
    const participant = await participantService.get(userId, organizationId, participantId)
    if (!participant) {
      return {
        status: 404,
        body: { error: 'Participant not found' },
      }
    }

    const notes = await noteService.getForParticipant(participantId)

    logger.info('Participant notes listed', { userId, participantId, count: notes.length })

    return {
      status: 200,
      body: notes,
    }
  } catch (error) {
    logger.error('Failed to list participant notes', {
      userId,
      participantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to list notes' },
    }
  }
}
