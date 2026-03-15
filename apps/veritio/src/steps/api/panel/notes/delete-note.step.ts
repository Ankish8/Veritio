import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelNoteService } from '../../../../services/panel/index'

const paramsSchema = z.object({
  noteId: z.string().uuid(),
})

export const config = {
  name: 'DeleteParticipantNote',
  description: 'Delete a participant note',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/panel/notes/:noteId',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['panel-note-deleted'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { noteId } = paramsSchema.parse(req.pathParams)

  logger.info('Deleting participant note', { userId, noteId })

  const supabase = getMotiaSupabaseClient()
  const noteService = createPanelNoteService(supabase)

  try {
    const existing = await noteService.get(noteId)
    if (!existing) {
      return {
        status: 404,
        body: { error: 'Note not found' },
      }
    }

    if (existing.user_id !== userId) {
      return {
        status: 403,
        body: { error: 'You can only delete your own notes' },
      }
    }

    await noteService.delete(noteId, userId)

    logger.info('Participant note deleted', { userId, noteId })

    enqueue({
      topic: 'panel-note-deleted',
      data: { resourceType: 'panel-note', action: 'delete', userId, noteId },
    }).catch(() => {})

    return {
      status: 200,
      body: { success: true },
    }
  } catch (error) {
    logger.error('Failed to delete participant note', {
      userId,
      noteId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to delete note' },
    }
  }
}
