import type { StepConfig } from 'motia'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import type { ApiRequest, ApiHandlerContext } from '../../../lib/motia/types'
import { errorResponse } from '../../../lib/response-helpers'

export const config = {
  name: 'DownloadInsightsReport',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/insights/:reportId/download',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (
  req: ApiRequest<unknown, { studyId: string; reportId: string }>,
  { logger }: ApiHandlerContext,
) => {
  const { studyId, reportId } = req.pathParams
  const supabase = getMotiaSupabaseClient()

  const { data: report, error } = await supabase
    .from('ai_insights_reports' as any)
    .select('file_path, status')
    .eq('id', reportId)
    .eq('study_id', studyId)
    .single()

  if (error || !report) {
    return errorResponse.notFound('Report not found')
  }

  const filePath = (report as any).file_path
  if ((report as any).status !== 'completed' || !filePath) {
    return errorResponse.badRequest('Report not ready for download')
  }

  // Generate signed URL (1 hour expiry)
  const { data: signedUrl, error: signError } = await supabase.storage
    .from('reports')
    .createSignedUrl(filePath, 3600)

  if (signError || !signedUrl) {
    logger.error('Failed to generate signed URL', { error: signError?.message, filePath })
    return errorResponse.serverError('Failed to generate download URL')
  }

  return {
    status: 200,
    body: { downloadUrl: signedUrl.signedUrl },
  }
}
