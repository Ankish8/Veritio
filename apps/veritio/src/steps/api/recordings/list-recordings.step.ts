import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const recordingSchema = z.object({
  id: z.string().uuid(),
  participant_id: z.string().uuid(),
  scope: z.enum(['session', 'task']),
  task_attempt_id: z.string().uuid().nullable(),
  capture_mode: z.enum(['audio', 'screen_audio', 'screen_audio_webcam']),
  duration_ms: z.number().nullable(),
  file_size_bytes: z.number().nullable(),
  status: z.string(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
  // Transcript status
  has_transcript: z.boolean(),
  transcript_status: z.string().nullable(),
  transcript_word_count: z.number().nullable(),
})

const responseSchema = z.object({
  data: z.array(recordingSchema),
  count: z.number(),
})

export const config = {
  name: 'ListStudyRecordings',
  description: 'List all recordings for a study',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/recordings',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId } = req.pathParams

  const supabase = getMotiaSupabaseClient()

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, user_id')
    .eq('id', studyId)
    .eq('user_id', userId)
    .single()

  if (studyError || !study) {
    logger.warn('Study not found or access denied', { studyId, userId })
    return {
      status: 403,
      body: { error: 'Access denied' },
    }
  }

  // Self-referencing joins fail on partitioned tables (PostgREST FK ambiguity)
  // so we use a separate query for webcam detection below.
  const { data: recordings, error: recordingsError, count } = await supabase
    .from('recordings')
    .select(`
      id,
      participant_id,
      scope,
      task_attempt_id,
      capture_mode,
      duration_ms,
      file_size_bytes,
      status,
      started_at,
      completed_at,
      created_at,
      recording_type,
      transcripts (
        status,
        word_count
      )
    `, { count: 'exact' })
    .eq('study_id', studyId)
    .eq('recording_type', 'primary')
    .is('deleted_at', null)
    .order('created_at', { ascending: false }) as any

  if (recordingsError) {
    logger.error('Failed to fetch recordings', { error: recordingsError, studyId })
    return {
      status: 500,
      body: { error: 'Failed to fetch recordings' },
    }
  }

  const primaryIds = (recordings || []).map((r: any) => r.id)
  const webcamLinkedIds = new Set<string>()

  if (primaryIds.length > 0) {
    const { data: webcamRecordings } = await supabase
      .from('recordings')
      .select('linked_recording_id')
      .eq('study_id', studyId)
      .eq('recording_type', 'webcam')
      .in('linked_recording_id', primaryIds) as any

    for (const w of webcamRecordings || []) {
      if (w.linked_recording_id) webcamLinkedIds.add(w.linked_recording_id)
    }
  }

  const recordingsWithTranscripts = (recordings || []).map((recording: any) => {
    const transcript = recording.transcripts?.[0]
    const hasWebcam = webcamLinkedIds.has(recording.id)

    let displayCaptureMode = recording.capture_mode
    if (hasWebcam && recording.capture_mode === 'screen_audio') {
      displayCaptureMode = 'screen_audio_webcam'
    }

    return {
      id: recording.id,
      participant_id: recording.participant_id,
      scope: recording.scope,
      task_attempt_id: recording.task_attempt_id,
      capture_mode: displayCaptureMode,
      duration_ms: recording.duration_ms,
      file_size_bytes: recording.file_size_bytes,
      status: recording.status,
      started_at: recording.started_at,
      completed_at: recording.completed_at,
      created_at: recording.created_at,
      has_transcript: !!transcript,
      transcript_status: transcript?.status || null,
      transcript_word_count: transcript?.word_count || null,
    }
  })

  return {
    status: 200,
    body: {
      data: recordingsWithTranscripts,
      count: count || 0,
    },
  }
}
