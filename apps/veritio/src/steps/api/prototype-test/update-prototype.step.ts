import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { updatePrototype } from '../../../services/prototype-service'
import { updatePrototypeSchema } from '../../../services/types'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'

export const config = {
  name: 'UpdatePrototype',
  description: 'Update prototype metadata (password, etc)',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/studies/:studyId/prototype',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: ['prototype-updated'],
  flows: ['study-content'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (req: ApiRequest, { enqueue, logger }: ApiHandlerContext) => {
  const params = paramsSchema.parse(req.pathParams)
  const body = updatePrototypeSchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()
  const userId = req.headers['x-user-id'] as string

  const { data: prototype, error } = await updatePrototype(supabase, params.studyId, body)

  if (error) {
    logger.error('Failed to update prototype', { error: error.message, studyId: params.studyId })
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  enqueue({
    topic: 'prototype-updated',
    data: { resourceType: 'prototype', action: 'update', userId, studyId: params.studyId },
  }).catch(() => {})

  return {
    status: 200,
    body: { data: prototype },
  }
}
