import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { saveVariants } from '../../../services/live-website-service'

const variantSchema = z.object({
  id: z.string().uuid(),
  study_id: z.string().uuid(),
  name: z.string().min(1),
  position: z.number().int().min(0),
  url: z.string().default(''),
  weight: z.number().int().min(0).default(50),
})

const bodySchema = z.object({
  variants: z.array(variantSchema),
})

export const config = {
  name: 'BulkUpdateLiveWebsiteVariants',
  description: 'Bulk upsert (reorder) A/B test variants for a live website study',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/studies/:studyId/live-website/variants/reorder',
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

  await saveVariants(supabase, studyId, body.variants)

  return { status: 200, body: { success: true } }
}
