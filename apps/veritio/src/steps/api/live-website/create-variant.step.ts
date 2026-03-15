import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const bodySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  position: z.number().int().min(0),
  url: z.string().default(''),
  weight: z.number().int().min(0).default(50),
})

export const config = {
  name: 'CreateLiveWebsiteVariant',
  description: 'Create an A/B test variant for a live website study',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/live-website/variants',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (req: ApiRequest, _ctx: ApiHandlerContext) => {
  const { studyId } = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  const { data, error } = await (supabase
    .from('live_website_variants' as any) as any)
    .insert({
      id: body.id,
      study_id: studyId,
      name: body.name,
      position: body.position,
      url: body.url,
      weight: body.weight,
    })
    .select()
    .single()

  if (error) throw error

  return { status: 201, body: { variant: data } }
}
