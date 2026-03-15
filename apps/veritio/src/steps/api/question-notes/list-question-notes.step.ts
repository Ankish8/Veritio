import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listNotesByQuestion } from '../../../services/question-note-service'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  questionId: z.string().uuid(),
})

const noteSchema = z.object({
  id: z.string().uuid(),
  study_id: z.string().uuid(),
  question_id: z.string().uuid(),
  user_id: z.string(),
  author_name: z.string(),
  content: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const config = {
  name: 'ListQuestionNotes',
  description: 'List all notes for a specific question',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/questions/:questionId/notes',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.array(noteSchema) as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['question-notes'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const params = paramsSchema.parse(req.pathParams)

  logger.info('Listing question notes', {
    userId,
    studyId: params.studyId,
    questionId: params.questionId
  })

  const supabase = getMotiaSupabaseClient()
  const { data: notes, error } = await listNotesByQuestion(supabase, params.questionId)

  if (error) {
    logger.error('Failed to list notes', {
      userId,
      questionId: params.questionId,
      error: error.message
    })
    return {
      status: 500,
      body: { error: 'Failed to list notes' },
    }
  }

  logger.info('Notes listed successfully', {
    userId,
    questionId: params.questionId,
    count: notes?.length || 0
  })

  return {
    status: 200,
    body: notes,
  }
}
