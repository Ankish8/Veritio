import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { createSectionNote } from '../../../services/section-note-service'
import { flowQuestionSectionSchema } from '../../../services/types'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  section: flowQuestionSectionSchema,
})

const bodySchema = z.object({
  content: z.string().min(1).max(5000),
  authorName: z.string().min(1).max(100),
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
  name: 'CreateSectionNote',
  description: 'Create a new note on a questionnaire section',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/sections/:section/notes',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    201: noteSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['section-note-created'],
  flows: ['section-notes'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const params = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body)

  logger.info('Creating section note', {
    userId,
    studyId: params.studyId,
    section: params.section
  })

  const supabase = getMotiaSupabaseClient()
  const { data: note, error } = await createSectionNote(supabase, {
    studyId: params.studyId,
    section: params.section,
    userId,
    authorName: body.authorName,
    content: body.content,
  })

  if (error) {
    logger.error('Failed to create section note', {
      userId,
      studyId: params.studyId,
      section: params.section,
      error: error.message
    })
    return {
      status: 500,
      body: { error: 'Failed to create note' },
    }
  }

  logger.info('Section note created successfully', {
    userId,
    studyId: params.studyId,
    section: params.section,
    noteId: note?.id
  })

  enqueue({
    topic: 'section-note-created',
    data: {
      resourceType: 'section-note',
      action: 'create',
      userId,
      studyId: params.studyId,
      section: params.section,
      noteId: note?.id
    },
  }).catch(() => {})

  return {
    status: 201,
    body: note,
  }
}
