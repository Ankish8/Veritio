import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const responseSchema = z.object({
  id: z.string().uuid(),
  study_id: z.string().uuid(),
  user_id: z.string(),
  integration: z.string(),
  format: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  progress: z.any(),
  destination_url: z.string().nullable(),
  error_message: z.string().nullable(),
  error_code: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  completed_at: z.string().nullable(),
})

export const config = {
  name: 'GetExportJobStatus',
  description: 'Get status of an export job',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/export-jobs/:jobId/status',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['export-lifecycle'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { jobId } = req.pathParams

  logger.info('Getting export job status', { userId, jobId })

  const supabase = getMotiaSupabaseClient()

  // Fetch export job
  const { data: job, error: fetchError } = await (supabase as any)
    .from('export_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (fetchError || !job) {
    logger.warn('Export job not found', { jobId })
    return {
      status: 404,
      body: { error: 'Export job not found' },
    }
  }

  // Verify ownership
  if (job.user_id !== userId) {
    logger.warn('User does not own export job', { userId, jobId, ownerId: job.user_id })
    return {
      status: 403,
      body: { error: 'Access denied' },
    }
  }

  logger.info('Export job status fetched', { jobId, status: job.status })

  return {
    status: 200,
    body: job,
  }
}
