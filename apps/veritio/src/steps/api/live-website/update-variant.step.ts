import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().optional(),
  weight: z.number().int().min(0).optional(),
  position: z.number().int().min(0).optional(),
})

export const config = {
  name: 'UpdateLiveWebsiteVariant',
  description: 'Update an A/B test variant for a live website study',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/studies/:studyId/live-website/variants/:variantId',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  variantId: z.string().uuid(),
})

export const handler = async (req: ApiRequest, _ctx: ApiHandlerContext) => {
  const { studyId, variantId } = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  const { data, error } = await (supabase
    .from('live_website_variants' as any) as any)
    .update(body)
    .eq('id', variantId)
    .eq('study_id', studyId)
    .select()
    .single()

  if (error) throw error

  return { status: 200, body: { variant: data } }
}
