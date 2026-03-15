import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { sessionAuthMiddleware } from '../../../middlewares/session-auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { completeMultipartUpload, getPlaybackUrl } from '../../../services/storage/r2-client'
import { getAccurateMediaDurationMs } from '../../../services/media/probe-service'

const responseSchema = z.object({
  success: z.boolean(),
  recording_id: z.string(),
  status: z.string(),
})

export const config = {
  name: 'FinalizeRecording',
  description: 'Finalize a recording after all chunks are uploaded',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/recordings/:recordingId/finalize',
    middleware: [sessionAuthMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['recording-finalized'],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const sessionToken = req.headers['x-session-token'] as string
  const { recordingId } = req.pathParams

  const supabase = getMotiaSupabaseClient()

  const { data: recording, error: recordingError } = await supabase
    .from('recordings')
    .select('id, study_id, participant_id, storage_path, upload_id, chunk_etags, status, started_at')
    .eq('id', recordingId)
    .single() as any

  if (recordingError || !recording) {
    logger.warn('Recording not found', { recordingId })
    return {
      status: 404,
      body: { error: 'Recording not found' },
    }
  }

  const { data: participant } = await supabase
    .from('participants')
    .select('session_token')
    .eq('id', recording.participant_id)
    .single()

  if (!participant || participant.session_token !== sessionToken) {
    logger.warn('Invalid session token for finalize', { recordingId })
    return {
      status: 401,
      body: { error: 'Invalid session token' },
    }
  }

  if (recording.status !== 'uploading') {
    logger.warn('Recording not in uploading status', { recordingId, status: recording.status })
    return {
      status: 400,
      body: { error: 'Recording is not in uploading state' },
    }
  }

  const chunkEtags = (recording.chunk_etags as any[]) || []
  if (chunkEtags.length === 0) {
    logger.warn('No chunks uploaded for recording', { recordingId })
    return {
      status: 400,
      body: { error: 'No chunks uploaded' },
    }
  }

  const sortedParts = chunkEtags
    .map((chunk: any) => ({
      PartNumber: chunk.PartNumber,
      ETag: chunk.ETag,
    }))
    .sort((a, b) => a.PartNumber - b.PartNumber)

  const MAX_RETRIES = 5
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await completeMultipartUpload(
        recording.storage_path,
        recording.upload_id,
        sortedParts
      )

      lastError = null
      break
    } catch (error) {
      lastError = error as Error
      logger.warn('Failed to complete multipart upload', { error, recordingId, attempt })

      if (attempt < MAX_RETRIES) {
        const baseWaitMs = Math.pow(2, attempt - 1) * 1000
        const jitter = Math.random() * 500
        await new Promise(resolve => setTimeout(resolve, baseWaitMs + jitter))
      }
    }
  }

  if (lastError) {
    logger.error('Failed to complete multipart upload after all retries', { error: lastError, recordingId })

    // Mark as failed but recoverable — cron job can retry later
    await supabase
      .from('recordings')
      .update({
        status: 'failed',
        status_message: `Failed to finalize upload after ${MAX_RETRIES} attempts - recoverable`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordingId)

    return {
      status: 500,
      body: { error: 'Failed to finalize upload' },
    }
  }

  const completedAt = new Date()
  let durationMs: number

  try {
    const playbackUrl = await getPlaybackUrl(recording.storage_path, 300)
    durationMs = await getAccurateMediaDurationMs(playbackUrl)
    logger.info('Probed actual video duration', { recordingId, durationMs })
  } catch (probeError) {
    // Fall back to wall-clock time
    logger.warn('Failed to probe video duration, using wall-clock fallback', {
      recordingId,
      error: probeError instanceof Error ? probeError.message : 'Unknown error',
    })
    const startedAt = new Date(recording.started_at)
    durationMs = completedAt.getTime() - startedAt.getTime()
  }

  const { error: updateError } = await supabase
    .from('recordings')
    .update({
      status: 'ready',
      completed_at: completedAt.toISOString(),
      duration_ms: durationMs,
      updated_at: completedAt.toISOString(),
    })
    .eq('id', recordingId)

  if (updateError) {
    logger.error('Failed to update recording status', { error: updateError, recordingId })
    return {
      status: 500,
      body: { error: 'Failed to update recording' },
    }
  }

  logger.info('Recording finalized successfully', { recordingId, durationMs })

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

  return {
    status: 200,
    body: {
      success: true,
      recording_id: recordingId,
      status: 'ready',
    },
  }
}
