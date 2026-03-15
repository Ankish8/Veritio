import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { EventHandlerContext } from '../../lib/motia/types'
import { executeExport } from '../../services/export/export-service'

const inputSchema = z.object({
  job_id: z.string().uuid(),
  user_id: z.string(),
  study_id: z.string().uuid(),
  integration: z.string(),
  format: z.string(),
})

export const config = {
  name: 'ProcessExportJob',
  description: 'Process an export job in the background',
  triggers: [{
    type: 'queue',
    topic: 'export-job-created',
    input: inputSchema as any,
  }],
  enqueues: ['export-job-progress', 'export-job-completed', 'export-job-failed', 'notification'],
  flows: ['export-lifecycle'],
} satisfies StepConfig

export const handler = async (
  input: z.infer<typeof inputSchema>,
  ctx: EventHandlerContext
) => {
  const { job_id, user_id, study_id, integration: _integration } = input
  const { logger, enqueue } = ctx

  logger.info('Processing export job', { jobId: job_id, userId: user_id, studyId: study_id })

  try {
    const result = await executeExport(job_id, {
      logger,
      emit: async (event) => {
        await enqueue({ topic: event.topic, data: event.data as Record<string, unknown> }).catch(() => {})
      },
    })

    if (result.success) {
      logger.info('Export job completed successfully', {
        jobId: job_id,
        resourceUrl: result.resourceUrl,
        processedParticipants: result.processedParticipants,
      })
    } else {
      logger.error('Export job failed', {
        jobId: job_id,
        error: result.error,
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Export job processing error', {
      jobId: job_id,
      error: errorMessage,
    })

  }
}
