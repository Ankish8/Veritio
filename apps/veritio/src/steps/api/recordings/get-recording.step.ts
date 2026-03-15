import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getPlaybackUrl } from '../../../services/storage/r2-client'

const transcriptSegmentSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
  speaker: z.string().optional(),
  confidence: z.number().optional(),
})

const transcriptSchema = z.object({
  id: z.string().uuid(),
  full_text: z.string().nullable(),
  segments: z.array(transcriptSegmentSchema),
  language: z.string().nullable(),
  model: z.string().nullable(),
  confidence_avg: z.number().nullable(),
  word_count: z.number().nullable(),
  status: z.string(),
})

const recordingEventSchema = z.object({
  id: z.string().uuid(),
  event_type: z.string(),
  timestamp_ms: z.number(),
  data: z.any().nullable(),
  created_at: z.string(),
})

const webcamRecordingSchema = z.object({
  id: z.string().uuid(),
  capture_mode: z.enum(['audio', 'screen_audio', 'screen_audio_webcam']),
  duration_ms: z.number().nullable(),
  status: z.string(),
  storage_path: z.string(),
}).nullable()

const responseSchema = z.object({
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
  storage_path: z.string(),
  transcript: transcriptSchema.nullable(),
  events: z.array(recordingEventSchema),
  playback_url: z.string().url().nullable(),
  webcam_recording: webcamRecordingSchema,
})

export const config = {
  name: 'GetRecording',
  description: 'Get a single recording with transcript and events',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/recordings/:recordingId',
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
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId, recordingId } = req.pathParams

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

  // No self-join — partitioned table FK ambiguity
  const { data: recording, error: recordingError } = await supabase
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
      storage_path,
      deleted_at,
      recording_type,
      transcripts (
        id,
        full_text,
        segments,
        language,
        model,
        confidence_avg,
        word_count,
        status,
        updated_at
      )
    `)
    .eq('id', recordingId)
    .eq('study_id', studyId)
    .single() as any

  if (recordingError || !recording) {
    logger.warn('Recording not found', { recordingId, studyId })
    return {
      status: 404,
      body: { error: 'Recording not found' },
    }
  }

  if (recording.deleted_at) {
    logger.warn('Recording is deleted', { recordingId })
    return {
      status: 404,
      body: { error: 'Recording has been deleted' },
    }
  }

  const { data: events, error: eventsError } = await supabase
    .from('recording_events')
    .select('id, event_type, timestamp_ms, data, created_at')
    .eq('recording_id', recordingId)
    .order('timestamp_ms', { ascending: true }) as any

  if (eventsError) {
    logger.error('Failed to fetch recording events', { error: eventsError, recordingId })
  }

  let playbackUrl: string | null = null
  if (recording.status === 'ready' || recording.status === 'completed') {
    try {
      playbackUrl = await getPlaybackUrl(recording.storage_path, 3600)
    } catch (error) {
      logger.error('Failed to generate playback URL', { error, recordingId })
    }
  }

  const transcript = recording.transcripts?.[0]
  const transformedTranscript = transcript
    ? {
        id: transcript.id,
        full_text: transcript.full_text,
        segments: (transcript.segments as any[]) || [],
        language: transcript.language,
        model: transcript.model,
        confidence_avg: transcript.confidence_avg,
        word_count: transcript.word_count,
        status: transcript.status,
      }
    : null

  const { data: webcamRecordings } = await supabase
    .from('recordings')
    .select('id, capture_mode, duration_ms, status, storage_path')
    .eq('linked_recording_id', recordingId)
    .eq('recording_type', 'webcam')
    .limit(1) as any

  const webcamRecording = webcamRecordings?.[0] ?? null

  const response = {
    id: recording.id,
    participant_id: recording.participant_id,
    scope: recording.scope,
    task_attempt_id: recording.task_attempt_id,
    capture_mode: recording.capture_mode,
    duration_ms: recording.duration_ms,
    file_size_bytes: recording.file_size_bytes,
    status: recording.status,
    started_at: recording.started_at,
    completed_at: recording.completed_at,
    created_at: recording.created_at,
    storage_path: recording.storage_path,
    transcript: transformedTranscript,
    events: events || [],
    playback_url: playbackUrl,
    webcam_recording: webcamRecording,
  }

  return {
    status: 200,
    body: response,
  }
}
