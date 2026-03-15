import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { createNote } from '../../../services/question-note-service'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  questionId: z.string().uuid(),
})

const bodySchema = z.object({
  content: z.string().min(1).max(5000),
  authorName: z.string().min(1).max(100),
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
  name: 'CreateQuestionNote',
  description: 'Create a new note on a questionnaire question',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/questions/:questionId/notes',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    201: noteSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['question-note-created'],
  flows: ['question-notes'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const params = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body)

  logger.info('Creating question note', {
    userId,
    studyId: params.studyId,
    questionId: params.questionId
  })

  const supabase = getMotiaSupabaseClient()
  const { data: note, error } = await createNote(supabase, {
    studyId: params.studyId,
    questionId: params.questionId,
    userId,
    authorName: body.authorName,
    content: body.content,
  })

  if (error) {
    logger.error('Failed to create note', {
      userId,
      studyId: params.studyId,
      questionId: params.questionId,
      error: error.message
    })
    return {
      status: 500,
      body: { error: 'Failed to create note' },
    }
  }

  logger.info('Note created successfully', {
    userId,
    studyId: params.studyId,
    questionId: params.questionId,
    noteId: note?.id
  })

  enqueue({
    topic: 'question-note-created',
    data: {
      resourceType: 'question-note',
      action: 'create',
      userId,
      studyId: params.studyId,
      questionId: params.questionId,
      noteId: note?.id
    },
  }).catch(() => {})

  return {
    status: 201,
    body: note,
  }
}
