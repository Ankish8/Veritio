import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { deletePrototype } from '../../../services/prototype-service'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'

export const config = {
  name: 'DeletePrototype',
  description: 'Delete prototype and all its frames/tasks',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/studies/:studyId/prototype',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: ['prototype-deleted'],
  flows: ['study-content'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (req: ApiRequest, { enqueue, logger }: ApiHandlerContext) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()
  const userId = req.headers['x-user-id'] as string

  const { error } = await deletePrototype(supabase, params.studyId)

  if (error) {
    logger.error('Failed to delete prototype', { error: error.message, studyId: params.studyId })
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  enqueue({
    topic: 'prototype-deleted',
    data: { resourceType: 'prototype', action: 'delete', userId, studyId: params.studyId },
  }).catch(() => {})

  return {
    status: 200,
    body: { success: true },
  }
}
