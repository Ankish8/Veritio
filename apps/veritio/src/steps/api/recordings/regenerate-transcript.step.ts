import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const responseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

export const config = {
  name: 'RegenerateTranscript',
  description: 'Re-trigger batch transcription for a recording (e.g., when live transcription failed)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/recordings/:recordingId/regenerate-transcript',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    responseSchema: {
      200: responseSchema as any,
      400: z.object({ error: z.string() }) as any,
      404: z.object({ error: z.string() }) as any,
      500: z.object({ error: z.string() }) as any,
    },
  }],
  enqueues: ['recording-finalized'],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const { studyId, recordingId } = req.pathParams

  logger.info('Regenerating transcript', { studyId, recordingId })

  const supabase = getMotiaSupabaseClient()

  // Verify recording exists and belongs to this study
  const { data: recording, error: recordingError } = await supabase
    .from('recordings')
    .select('id, study_id, participant_id, storage_path, capture_mode')
    .eq('id', recordingId)
    .eq('study_id', studyId)
    .single() as any

  if (recordingError || !recording) {
    return {
      status: 404,
      body: { error: 'Recording not found' },
    }
  }

  // Only recordings with audio can be transcribed
  const hasAudio = ['audio', 'screen_audio', 'screen_audio_webcam'].includes(recording.capture_mode)
  if (!hasAudio) {
    return {
      status: 400,
      body: { error: 'Recording does not contain audio' },
    }
  }

  // Delete existing transcript so batch transcription creates a fresh one
  const { data: existingTranscript } = await supabase
    .from('transcripts')
    .select('id, status')
    .eq('recording_id', recordingId)
    .single() as any

  if (existingTranscript) {
    // Don't regenerate if already processing
    if (existingTranscript.status === 'processing') {
      return {
        status: 400,
        body: { error: 'Transcription is already in progress' },
      }
    }

    // Reset transcript to trigger fresh batch processing
    await supabase
      .from('transcripts')
      .update({
        status: 'processing',
        retry_count: 0,
        error_message: null,
        provider: null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', existingTranscript.id)
  }

  // Update recording status
  await supabase
    .from('recordings')
    .update({
      status: 'transcribing',
      status_message: 'Regenerating transcript...',
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', recordingId)

  // Fire recording-finalized event to trigger the transcription pipeline
  await enqueue({
    topic: 'recording-finalized',
    data: {
      resourceType: 'recording',
      resourceId: recordingId,
      action: 'finalize',
      studyId,
      participantId: recording.participant_id,
      storagePath: recording.storage_path,
    },
  })

  logger.info('Transcript regeneration triggered', { studyId, recordingId })

  return {
    status: 200,
    body: {
      success: true,
      message: 'Transcription regeneration started. This usually takes 1-2 minutes.',
    },
  }
}
