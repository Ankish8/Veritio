import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import bcrypt from 'bcryptjs'
import { errorResponse } from '../../../lib/response-helpers'
import { generateSignedReportUrl } from '../../../services/report-download-service'

export const config = {
  name: 'PublicDownloadInsightsReport',
  description: 'Download insights report PDF via public results token (no auth required)',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/public-results/:token/insights/download',
    middleware: [errorHandlerMiddleware],
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (
  req: ApiRequest<unknown, { token: string }>,
  { logger }: ApiHandlerContext,
) => {
  const { token } = req.pathParams
  const supabase = getMotiaSupabaseClient()

  // Find study by public results token
  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, sharing_settings')
    .eq('public_results_token' as any, token)
    .single()

  if (studyError || !study) {
    return errorResponse.notFound('Study not found')
  }

  const sharingSettings = (study.sharing_settings as Record<string, any>) || {}
  const publicResults = sharingSettings.publicResults || {}

  // Validate public results is enabled
  if (!publicResults.enabled) {
    return errorResponse.notFound('Public results not enabled')
  }

  // Validate AI insights metric is enabled
  const enabledMetrics = publicResults.enabledMetrics || []
  if (!enabledMetrics.includes('aiInsights')) {
    return errorResponse.forbidden('AI insights not enabled for public sharing')
  }

  // Check password if set
  const passwordHeader = req.headers['x-share-password'] as string | undefined
  if (publicResults.passwordHash) {
    if (!passwordHeader) {
      return errorResponse.unauthorized('Password required')
    }
    const isValid = await bcrypt.compare(passwordHeader, publicResults.passwordHash)
    if (!isValid) {
      return errorResponse.unauthorized('Invalid password')
    }
  } else if (publicResults.password) {
    // Legacy plain text password support
    if (!passwordHeader || passwordHeader !== publicResults.password) {
      if (passwordHeader) {
        return errorResponse.unauthorized('Invalid password')
      }
    }
  }

  // Fetch latest completed report
  const { data: report, error: reportError } = await supabase
    .from('ai_insights_reports' as any)
    .select('id, file_path')
    .eq('study_id', study.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single()

  if (reportError || !report) {
    logger.info('No completed report found', { studyId: study.id })
    return errorResponse.notFound('No report available for download')
  }

  const filePath = (report as any).file_path
  if (!filePath) {
    return errorResponse.notFound('Report file not available')
  }

  const { url, error: signError } = await generateSignedReportUrl(supabase, filePath, 'insights-reports')

  if (signError || !url) {
    logger.error('Failed to generate signed URL', { error: signError, filePath })
    return errorResponse.serverError('Failed to generate download URL')
  }

  return {
    status: 200,
    body: { downloadUrl: url },
  }
}
