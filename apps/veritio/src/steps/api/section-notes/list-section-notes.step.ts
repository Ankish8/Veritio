import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listNotesBySection } from '../../../services/section-note-service'
import { flowQuestionSectionSchema } from '../../../services/types'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  section: flowQuestionSectionSchema,
})

const noteSchema = z.object({
  id: z.string().uuid(),
  study_id: z.string().uuid(),
  section: flowQuestionSectionSchema,
  user_id: z.string(),
  author_name: z.string(),
  content: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const config = {
  name: 'ListSectionNotes',
  description: 'List all notes for a specific questionnaire section',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/sections/:section/notes',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.array(noteSchema) as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['section-notes'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const params = paramsSchema.parse(req.pathParams)

  logger.info('Listing section notes', {
    userId,
    studyId: params.studyId,
    section: params.section
  })

  const supabase = getMotiaSupabaseClient()
  const { data: notes, error } = await listNotesBySection(supabase, params.studyId, params.section)

  if (error) {
    logger.error('Failed to list section notes', {
      userId,
      studyId: params.studyId,
      section: params.section,
      error: error.message
    })
    return {
      status: 500,
      body: { error: 'Failed to list notes' },
    }
  }

  logger.info('Section notes listed successfully', {
    userId,
    studyId: params.studyId,
    section: params.section,
    count: notes?.length || 0
  })

  return {
    status: 200,
    body: notes,
  }
}
