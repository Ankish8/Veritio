import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'GetSemanticLabels',
  description: 'Get AI-generated semantic labels for live website events',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/live-website/semantic-labels',
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

  const { data, error } = await supabase
    .from('live_website_semantic_labels' as any)
    .select('*')
    .eq('study_id', studyId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return { status: 500, body: { error: error.message } }
  }

  return {
    status: 200,
    body: { labels: data || null },
  }
}
