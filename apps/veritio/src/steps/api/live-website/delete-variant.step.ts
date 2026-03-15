import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'DeleteLiveWebsiteVariant',
  description: 'Delete an A/B test variant for a live website study',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/studies/:studyId/live-website/variants/:variantId',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
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
  const supabase = getMotiaSupabaseClient()

  const { error } = await (supabase
    .from('live_website_variants' as any) as any)
    .delete()
    .eq('id', variantId)
    .eq('study_id', studyId)

  if (error) throw error

  return { status: 200, body: { success: true } }
}
