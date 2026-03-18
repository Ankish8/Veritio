import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { isIntegrationSupported } from '../../../services/export/adapter-factory'

const bodySchema = z.object({
  integration: z.enum(['googlesheets', 'googledocs', 'notion', 'airtable', 'csv_download']),
  format: z.enum(['raw', 'summary', 'both']).default('raw'),
  config: z.record(z.unknown()).optional(),
})

const responseSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  estimatedDuration: z.string(),
})

export const config = {
  name: 'CreateExportJob',
  description: 'Create a new export job for study data',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/export',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    201: responseSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['export-job-created'],
  flows: ['export-lifecycle'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId } = req.pathParams

  const validation = validateRequest(bodySchema, req.body, logger)
  if (!validation.success) return validation.response

  const { integration, format, config: exportConfig } = validation.data

  logger.info('Creating export job', { userId, studyId, integration, format })

  // Validate integration is supported
  if (!isIntegrationSupported(integration)) {
    logger.warn('Unsupported integration requested', { integration })
    return {
      status: 400,
      body: { error: `Integration ${integration} is not yet supported` },
    }
  }

  const supabase = getMotiaSupabaseClient()

  // Check if integration requires connection (not CSV)
  if (integration !== 'csv_download') {
    const { data: connection } = await (supabase as any)
      .from('composio_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('toolkit', integration)
      .single()

    if (!connection) {
      logger.warn('Integration not connected', { userId, integration })
      return {
        status: 400,
        body: { error: `${integration} integration not connected. Please connect it first.` },
      }
    }
  }

  // Count participants for estimation
  const { count: participantCount } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('study_id', studyId)
    .eq('status', 'completed')

  const totalParticipants = participantCount || 0

  // Create export job
  const { data: job, error: createError } = await (supabase as any)
    .from('export_jobs')
    .insert({
      user_id: userId,
      study_id: studyId,
      integration,
      format,
      config: exportConfig || {},
      status: 'pending',
      progress: {
        percentage: 0,
        processedParticipants: 0,
        totalParticipants,
        current_step: 'Queued',
      },
    })
    .select()
    .single()

  if (createError || !job) {
    logger.error('Failed to create export job', { error: createError?.message })
    return {
      status: 500,
      body: { error: 'Failed to create export job' },
    }
  }

  logger.info('Export job created', { jobId: job.id, userId, studyId })

  // Emit event for background worker
  enqueue({
    topic: 'export-job-created',
    data: {
      job_id: job.id,
      user_id: userId,
      study_id: studyId,
      integration,
      format,
    },
  }).catch(() => {})

  // Estimate duration (rough: ~2 seconds per 100 participants)
  const estimatedSeconds = Math.max(30, Math.ceil((totalParticipants / 100) * 2))
  const estimatedDuration =
    estimatedSeconds < 60
      ? `~${estimatedSeconds} seconds`
      : `~${Math.ceil(estimatedSeconds / 60)} minutes`

  return {
    status: 201,
    body: {
      jobId: job.id,
      status: job.status,
      estimatedDuration,
    },
  }
}
