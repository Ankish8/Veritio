import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import type { ApiRequest, ApiHandlerContext } from '../../../lib/motia/types'

const bodySchema = z.object({
  segmentFilters: z.array(z.unknown()).optional(),
  regenerate: z.boolean().optional(),
})

export const config = {
  name: 'GenerateInsightsReport',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/insights/generate',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: ['insights-report-requested'],
} satisfies StepConfig

export const handler = async (
  req: ApiRequest<z.infer<typeof bodySchema>, { studyId: string }>,
  { enqueue, logger }: ApiHandlerContext,
) => {
  const { studyId } = req.pathParams
  const parsed = bodySchema.parse(req.body)
  const segmentFilters = parsed.segmentFilters ?? []
  const regenerate = parsed.regenerate ?? false
  const userId = req.headers['x-user-id'] as string

  const supabase = getMotiaSupabaseClient()

  // Check for existing in-progress report
  if (!regenerate) {
    const { data: existing } = await supabase
      .from('ai_insights_reports' as any)
      .select('id, status, progress')
      .eq('study_id', studyId)
      .eq('status', 'processing')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) {
      return {
        status: 200,
        body: { reportId: (existing as any).id, status: 'processing', progress: (existing as any).progress },
      }
    }
  }

  // Get study type and current participant count
  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, study_type, title')
    .eq('id', studyId)
    .single()

  if (studyError || !study) {
    return { status: 404, body: { error: 'Study not found' } }
  }

  const { count: participantCount } = await supabase
    .from('participants')
    .select('id', { count: 'exact', head: true })
    .eq('study_id', studyId)
    .eq('status', 'completed')

  // Create report row
  const { data: report, error: insertError } = await supabase
    .from('ai_insights_reports' as any)
    .insert({
      study_id: studyId,
      user_id: userId,
      status: 'processing',
      response_count_at_generation: participantCount ?? 0,
      segment_filters: segmentFilters,
      progress: { percentage: 0, currentSection: '' },
    })
    .select('id')
    .single()

  if (insertError || !report) {
    logger.error('Failed to create insights report row', { error: insertError?.message })
    return { status: 500, body: { error: 'Failed to create report' } }
  }

  const reportId = (report as any).id

  // Emit event for background processing
  enqueue({
    topic: 'insights-report-requested',
    data: {
      reportId,
      studyId,
      studyType: study.study_type,
      userId,
      segmentFilters,
    },
  }).catch(() => {})

  logger.info('Insights report generation started', { reportId, studyId })

  return {
    status: 202,
    body: { reportId, status: 'processing' },
  }
}
