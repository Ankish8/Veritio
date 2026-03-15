import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { deleteSectionNote } from '../../../services/section-note-service'

const paramsSchema = z.object({
  noteId: z.string().uuid(),
})

export const config = {
  name: 'DeleteSectionNote',
  description: 'Delete a section note (only author can delete)',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/notes/section/:noteId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['section-note-deleted'],
  flows: ['section-notes'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const params = paramsSchema.parse(req.pathParams)

  logger.info('Deleting section note', { userId, noteId: params.noteId })

  const supabase = getMotiaSupabaseClient()
  const { error } = await deleteSectionNote(supabase, params.noteId, userId)

  if (error) {
    if (error.message === 'Note not found') {
      logger.warn('Section note not found', { userId, noteId: params.noteId })
      return {
        status: 404,
        body: { error: 'Note not found' },
      }
    }

    if (error.message === 'Not authorized to delete this note') {
      logger.warn('Unauthorized section note delete attempt', { userId, noteId: params.noteId })
      return {
        status: 403,
        body: { error: 'Not authorized to delete this note' },
      }
    }

    logger.error('Failed to delete section note', {
      userId,
      noteId: params.noteId,
      error: error.message
    })
    return {
      status: 500,
      body: { error: 'Failed to delete note' },
    }
  }

  logger.info('Section note deleted successfully', { userId, noteId: params.noteId })

  enqueue({
    topic: 'section-note-deleted',
    data: {
      resourceType: 'section-note',
      action: 'delete',
      userId,
      noteId: params.noteId
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { success: true },
  }
}
