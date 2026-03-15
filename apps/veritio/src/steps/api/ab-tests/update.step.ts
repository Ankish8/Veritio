import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiRequest } from '../../../lib/motia/types'
import type { Json } from '@veritio/study-types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { updateABTest } from '../../../services/ab-test-service'

export const config = {
  name: 'UpdateABTest',
  description: 'Update an existing A/B test',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/studies/:studyId/ab-tests/:abTestId',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['ab-testing'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  abTestId: z.string().uuid(),
})

const bodySchema = z.object({
  variant_a_content: z.record(z.string(), z.unknown()).optional(),
  variant_b_content: z.record(z.string(), z.unknown()).optional(),
  split_percentage: z.number().min(0).max(100).optional(),
  is_enabled: z.boolean().optional(),
})

export const handler = async (req: ApiRequest) => {
  const params = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body || {})
  const supabase = getMotiaSupabaseClient()

  const { data, error } = await updateABTest(supabase, params.abTestId, {
    variant_a_content: body.variant_a_content as Json | undefined,
    variant_b_content: body.variant_b_content as Json | undefined,
    split_percentage: body.split_percentage,
    is_enabled: body.is_enabled,
  })

  if (error) {
    if (error.message === 'A/B test not found') {
      return {
        status: 404,
        body: { error: error.message },
      }
    }
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  return {
    status: 200,
    body: { data },
  }
}
