import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelNoteService, createPanelParticipantService } from '../../../../services/panel/index'
import { createNoteSchema } from '../../../../lib/supabase/panel-types'

const paramsSchema = z.object({
  participantId: z.string().uuid(),
})

export const config = {
  name: 'CreateParticipantNote',
  description: 'Create a new note for a participant',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/panel/participants/:participantId/notes',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: createNoteSchema as any,
  }],
  enqueues: ['panel-note-created'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const { participantId } = paramsSchema.parse(req.pathParams)
  const body = createNoteSchema.parse(req.body || {})

  logger.info('Creating participant note', { userId, participantId })

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

    const note = await noteService.create(userId, {
      panel_participant_id: participantId,
      content: body.content,
    })

    logger.info('Participant note created', { userId, participantId, noteId: note.id })

    enqueue({
      topic: 'panel-note-created',
      data: { resourceType: 'panel-note', action: 'create', userId, participantId, noteId: note.id },
    }).catch(() => {})

    return {
      status: 201,
      body: note,
    }
  } catch (error) {
    logger.error('Failed to create participant note', {
      userId,
      participantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to create note' },
    }
  }
}
