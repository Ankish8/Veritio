import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { upsertPrototype } from '../../../services/prototype-service'
import { createPrototypeSchema } from '../../../services/types'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'

export const config = {
  name: 'UpsertPrototype',
  description: 'Create or update prototype for a study',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/studies/:studyId/prototype',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: ['prototype-upserted'],
  flows: ['study-content'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (req: ApiRequest, { enqueue }: ApiHandlerContext) => {
  const params = paramsSchema.parse(req.pathParams)
  const body = createPrototypeSchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()
  const userId = req.headers['x-user-id'] as string

  const { data: prototype, error } = await upsertPrototype(supabase, params.studyId, body)

  if (error) {
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  enqueue({
    topic: 'prototype-upserted',
    data: { resourceType: 'prototype', action: 'upsert', userId, studyId: params.studyId },
  }).catch(() => {})

  return {
    status: 200,
    body: { data: prototype },
  }
}
