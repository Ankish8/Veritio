import type { StepConfig } from 'motia'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import type { ApiRequest, ApiHandlerContext } from '../../../lib/motia/types'

export const config = {
  name: 'GetLatestInsightsReport',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/insights/latest',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (
  req: ApiRequest<unknown, { studyId: string }>,
  { logger: _logger }: ApiHandlerContext,
) => {
  const { studyId } = req.pathParams
  const supabase = getMotiaSupabaseClient()

  // Get latest report (completed or processing)
  const { data: report, error } = await supabase
    .from('ai_insights_reports' as any)
    .select('*')
    .eq('study_id', studyId)
    .in('status', ['completed', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !report) {
    return { status: 200, body: { report: null, staleCount: 0 } }
  }

  // Get current completed participant count for stale detection
  const { count: currentCount } = await supabase
    .from('participants')
    .select('id', { count: 'exact', head: true })
    .eq('study_id', studyId)
    .eq('status', 'completed')

  const staleCount = Math.max(0, (currentCount ?? 0) - ((report as any).response_count_at_generation ?? 0))

  return {
    status: 200,
    body: {
      report,
      staleCount,
    },
  }
}
