import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const responseSchema = z.object({
  success: z.boolean(),
  jobId: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
})

export const config = {
  name: 'CancelExportJob',
  description: 'Cancel an in-progress export job',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/export-jobs/:jobId/cancel',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['export-job-cancelled'],
  flows: ['export-lifecycle'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { jobId } = req.pathParams

  logger.info('Cancelling export job', { userId, jobId })

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

  // Check if job can be cancelled
  if (job.status !== 'pending' && job.status !== 'processing') {
    logger.warn('Job cannot be cancelled', { jobId, status: job.status })
    return {
      status: 400,
      body: { error: `Cannot cancel job with status: ${job.status}` },
    }
  }

  // Update status to cancelled
  const { error: updateError } = await (supabase as any)
    .from('export_jobs')
    .update({
      status: 'cancelled',
      error_message: 'Cancelled by user',
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (updateError) {
    logger.error('Failed to cancel export job', { error: updateError.message })
    return {
      status: 500,
      body: { error: 'Failed to cancel export job' },
    }
  }

  logger.info('Export job cancelled', { jobId })

  // Emit cancellation event
  enqueue({
    topic: 'export-job-cancelled',
    data: {
      job_id: jobId,
      user_id: userId,
      study_id: job.study_id,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: {
      success: true,
      jobId,
      status: 'cancelled',
    },
  }
}
