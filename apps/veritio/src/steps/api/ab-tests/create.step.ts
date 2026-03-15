import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiRequest } from '../../../lib/motia/types'
import type { Json } from '@veritio/study-types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { createABTest } from '../../../services/ab-test-service'

export const config = {
  name: 'CreateABTest',
  description: 'Create a new A/B test for a question or section',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/ab-tests',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['ab-testing'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

const bodySchema = z.object({
  entity_type: z.enum(['question', 'section']),
  entity_id: z.string().uuid(),
  variant_a_content: z.record(z.string(), z.unknown()),
  variant_b_content: z.record(z.string(), z.unknown()),
  split_percentage: z.number().min(0).max(100).optional().default(50),
  is_enabled: z.boolean().optional().default(true),
})

export const handler = async (req: ApiRequest) => {
  const params = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body || {})
  const supabase = getMotiaSupabaseClient()

  const { data, error } = await createABTest(supabase, {
    study_id: params.studyId,
    entity_type: body.entity_type,
    entity_id: body.entity_id,
    variant_a_content: body.variant_a_content as Json,
    variant_b_content: body.variant_b_content as Json,
    split_percentage: body.split_percentage,
    is_enabled: body.is_enabled,
  })

  if (error) {
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  return {
    status: 201,
    body: { data },
  }
}
