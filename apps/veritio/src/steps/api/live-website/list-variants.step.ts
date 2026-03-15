import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getVariants } from '../../../services/live-website-service'

export const config = {
  name: 'ListLiveWebsiteVariants',
  description: 'List A/B test variants for a live website study',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/live-website/variants',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (req: ApiRequest, _ctx: ApiHandlerContext) => {
  const { studyId } = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()
  const variants = await getVariants(supabase, studyId)
  return { status: 200, body: { variants } }
}
