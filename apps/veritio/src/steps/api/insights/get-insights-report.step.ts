import type { StepConfig } from 'motia'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import type { ApiRequest, ApiHandlerContext } from '../../../lib/motia/types'

export const config = {
  name: 'GetInsightsReport',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/insights/:reportId',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (
  req: ApiRequest<unknown, { studyId: string; reportId: string }>,
  { logger: _logger }: ApiHandlerContext,
) => {
  const { studyId, reportId } = req.pathParams
  const supabase = getMotiaSupabaseClient()

  const { data: report, error } = await supabase
    .from('ai_insights_reports' as any)
    .select('*')
    .eq('id', reportId)
    .eq('study_id', studyId)
    .single()

  if (error || !report) {
    return { status: 404, body: { error: 'Report not found' } }
  }

  return { status: 200, body: { report } }
}
