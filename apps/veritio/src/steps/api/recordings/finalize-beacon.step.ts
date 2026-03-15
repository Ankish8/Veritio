import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { completeMultipartUpload } from '../../../services/storage/r2-client'
import { errorResponse } from '../../../lib/response-helpers'

const bodySchema = z.object({
  sessionToken: z.string(),
  participantId: z.string().uuid(),
})

export const config = {
  name: 'FinalizeRecordingBeacon',
  description: 'Finalize a recording via sendBeacon (no custom headers)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/recordings/:recordingId/finalize-beacon',
    middleware: [errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['recording-finalized'],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const { recordingId } = req.pathParams

  // Parse body - sendBeacon sends as text/plain
  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    )
  } catch {
    return errorResponse.badRequest('Invalid request body')
  }

  const { sessionToken, participantId } = body

  logger.info('Beacon finalize attempt', { recordingId, participantId })

  const supabase = getMotiaSupabaseClient()

  const { data: recording, error: recordingError } = await supabase
    .from('recordings')
    .select('id, study_id, participant_id, storage_path, upload_id, chunk_etags, status, started_at')
    .eq('id', recordingId)
    .single() as any

  if (recordingError || !recording) {
    logger.warn('Recording not found for beacon finalize', { recordingId })
    return errorResponse.notFound('Recording not found')
  }

  if (recording.participant_id !== participantId) {
    logger.warn('Participant mismatch for beacon finalize', { recordingId, participantId })
    return errorResponse.unauthorized('Unauthorized')
  }

  const { data: participant } = await supabase
    .from('participants')
    .select('session_token, status')
    .eq('id', participantId)
    .single()

  if (!participant || participant.session_token !== sessionToken) {
    logger.warn('Invalid session token for beacon finalize', { recordingId })
    return errorResponse.unauthorized('Invalid session token')
  }

  if (recording.status !== 'uploading') {
    logger.info('Recording not in uploading status, skipping beacon finalize', {
      recordingId,
      status: recording.status,
    })
    return { status: 200, body: { success: true } }
  }

  const chunkEtags = (recording.chunk_etags as any[]) || []

  if (chunkEtags.length === 0) {
    // If the participant completed the study, this isn't abandonment — recording just failed to capture data
    const isCompleted = participant.status === 'completed'
    const newStatus = isCompleted ? 'failed' : 'abandoned'
    const statusMessage = isCompleted
      ? 'No recording data captured'
      : 'User left before any data was uploaded'

    logger.info(`No chunks uploaded, marking as ${newStatus}`, { recordingId, participantStatus: participant.status })
    await supabase
      .from('recordings')
      .update({
        status: newStatus,
        status_message: statusMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordingId)

    return { status: 200, body: { success: true } }
  }

  const sortedParts = chunkEtags
    .map((chunk: any) => ({
      PartNumber: chunk.PartNumber,
      ETag: chunk.ETag,
    }))
    .sort((a, b) => a.PartNumber - b.PartNumber)

  try {
    await completeMultipartUpload(
      recording.storage_path,
      recording.upload_id,
      sortedParts
    )

    const startedAt = new Date(recording.started_at)
    const completedAt = new Date()
    const durationMs = completedAt.getTime() - startedAt.getTime()

    await supabase
      .from('recordings')
      .update({
        status: 'ready',
        completed_at: completedAt.toISOString(),
        duration_ms: durationMs,
        updated_at: completedAt.toISOString(),
      })
      .eq('id', recordingId)

    logger.info('Beacon finalize successful', { recordingId, durationMs })

    enqueue({
      topic: 'recording-finalized',
      data: {
        resourceType: 'recording',
        resourceId: recordingId,
        action: 'finalize',
        studyId: recording.study_id,
        participantId: recording.participant_id,
        storagePath: recording.storage_path,
      },
    }).catch(() => {})

    return { status: 200, body: { success: true } }
  } catch (error) {
    // Mark as failed - will be cleaned up by cron
    logger.error('Beacon finalize failed', { error, recordingId })

    await supabase
      .from('recordings')
      .update({
        status: 'failed',
        status_message: 'Failed to finalize on page unload',
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordingId)

    return { status: 200, body: { success: true } } // Return 200 anyway - beacon can't handle errors
  }
}
