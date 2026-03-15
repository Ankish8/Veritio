import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyManager } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'DuplicateStudy',
  description: 'Duplicate a study (triggers async duplication of all content)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/duplicate',
    middleware: [authMiddleware, requireStudyManager('studyId'), errorHandlerMiddleware],
  }],
  enqueues: ['study-duplication-requested'],
  flows: ['study-management'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

const bodySchema = z.object({
  title: z.string().min(1).max(255).optional(),
}).optional()

export const handler = async (req: ApiRequest, { logger: _logger, enqueue }: ApiHandlerContext) => {
  const params = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body || {})
  const supabase = getMotiaSupabaseClient()

  const { data: originalStudy, error: studyError } = await supabase
    .from('studies')
    .select('*')
    .eq('id', params.studyId)
    .single()

  if (studyError || !originalStudy) {
    return {
      status: 404,
      body: { error: 'Study not found' },
    }
  }

  const newTitle = body?.title || `${originalStudy.title} (Copy)`

  const { data: newStudy, error: createError } = await supabase
    .from('studies')
    .insert({
      project_id: originalStudy.project_id,
      user_id: originalStudy.user_id,
      study_type: originalStudy.study_type,
      title: newTitle,
      description: originalStudy.description,
      status: 'draft', // Always start as draft
      settings: originalStudy.settings,
      welcome_message: originalStudy.welcome_message,
      thank_you_message: originalStudy.thank_you_message,
      // Don't copy: share_code (auto-generated), launched_at, closed_at
    })
    .select()
    .single()

  if (createError || !newStudy) {
    return {
      status: 500,
      body: { error: 'Failed to create duplicate study' },
    }
  }

  enqueue({
    topic: 'study-duplication-requested',
    data: {
      originalStudyId: params.studyId,
      newStudyId: newStudy.id,
      userId: originalStudy.user_id,
    },
  }).catch(() => {})

  return {
    status: 202, // Accepted - duplication in progress
    body: {
      data: newStudy,
      message: 'Study duplication started. Content will be copied in the background.',
    },
  }
}
