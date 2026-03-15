import type { StepConfig } from 'motia'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { sessionAuthMiddleware } from '../../../middlewares/session-auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { initiateMultipartUpload, generateRecordingPath } from '../../../services/storage/r2-client'

const bodySchema = z.object({
  study_id: z.string().uuid(),
  participant_id: z.string().uuid(),
  capture_mode: z.enum(['audio', 'screen_audio', 'screen_audio_webcam']),
  scope: z.enum(['session', 'task', 'question']),
  task_attempt_id: z.string().uuid().optional(),
})

const responseSchema = z.object({
  recording_id: z.string().uuid(),
  upload_id: z.string(),
  // For screen_audio_webcam mode, separate webcam recording
  webcam_recording_id: z.string().uuid().optional(),
  webcam_upload_id: z.string().optional(),
})

export const config = {
  name: 'InitializeRecording',
  description: 'Initialize a new recording session',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/recordings/initialize',
    middleware: [sessionAuthMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: responseSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['recording-initialized'],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const sessionToken = req.headers['x-session-token'] as string

  const body = bodySchema.parse(req.body)

  logger.info('Initializing recording', {
    studyId: body.study_id,
    participantId: body.participant_id,
    captureMode: body.capture_mode,
    scope: body.scope,
  })

  const supabase = getMotiaSupabaseClient()

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('id, session_token')
    .eq('id', body.participant_id)
    .eq('study_id', body.study_id)
    .single()

  if (participantError || !participant) {
    logger.warn('Participant not found', { participantId: body.participant_id })
    return {
      status: 404,
      body: { error: 'Participant not found' },
    }
  }

  if (participant.session_token !== sessionToken) {
    logger.warn('Invalid session token for recording', { participantId: body.participant_id })
    return {
      status: 401,
      body: { error: 'Invalid session token' },
    }
  }

  const recordingId = randomUUID()
  const storagePath = generateRecordingPath(body.study_id, body.participant_id, recordingId)

  let uploadId: string
  try {
    uploadId = await initiateMultipartUpload({
      storagePath,
      contentType: 'video/webm',
      totalChunks: 0,
    })
  } catch (error) {
    logger.error('Failed to initiate multipart upload for primary recording', { error })
    return {
      status: 500,
      body: { error: 'Failed to initialize storage' },
    }
  }

  // For screen_audio_webcam, primary only captures screen+audio (webcam is separate)
  const primaryCaptureMode = body.capture_mode === 'screen_audio_webcam'
    ? 'screen_audio'
    : body.capture_mode

  const { error: insertError } = await supabase
    .from('recordings')
    .insert({
      id: recordingId,
      study_id: body.study_id,
      participant_id: body.participant_id,
      scope: body.scope,
      task_attempt_id: body.task_attempt_id || null,
      storage_path: storagePath,
      storage_provider: 'r2',
      capture_mode: primaryCaptureMode,
      recording_type: 'primary',
      linked_recording_id: null,
      upload_id: uploadId,
      status: 'uploading',
      started_at: new Date().toISOString(),
    } as any)

  if (insertError) {
    logger.error('Failed to create primary recording record', { error: insertError })
    return {
      status: 500,
      body: { error: 'Failed to create recording' },
    }
  }

  let webcamRecordingId: string | undefined
  let webcamUploadId: string | undefined

  if (body.capture_mode === 'screen_audio_webcam') {
    webcamRecordingId = randomUUID()
    const webcamStoragePath = generateRecordingPath(body.study_id, body.participant_id, webcamRecordingId)

    try {
      webcamUploadId = await initiateMultipartUpload({
        storagePath: webcamStoragePath,
        contentType: 'video/webm',
        totalChunks: 0,
      })
    } catch (error) {
      logger.error('Failed to initiate multipart upload for webcam recording', { error })
      // Don't fail the whole request - primary recording is still valid
      webcamRecordingId = undefined
      webcamUploadId = undefined
    }

    if (webcamUploadId) {
      const { error: webcamInsertError } = await supabase
        .from('recordings')
        .insert({
          id: webcamRecordingId,
          study_id: body.study_id,
          participant_id: body.participant_id,
          scope: body.scope,
          task_attempt_id: body.task_attempt_id || null,
          storage_path: webcamStoragePath,
          storage_provider: 'r2',
          capture_mode: 'audio', // Webcam is video only, but using 'audio' as closest match
          recording_type: 'webcam',
          linked_recording_id: recordingId,
          upload_id: webcamUploadId,
          status: 'uploading',
          started_at: new Date().toISOString(),
        } as any)

      if (webcamInsertError) {
        logger.error('Failed to create webcam recording record', { error: webcamInsertError })
        webcamRecordingId = undefined
        webcamUploadId = undefined
      }
    }
  }

  enqueue({
    topic: 'recording-initialized',
    data: {
      resourceType: 'recording',
      resourceId: recordingId,
      action: 'initialize',
      studyId: body.study_id,
      participantId: body.participant_id,
      webcamRecordingId,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: {
      recording_id: recordingId,
      upload_id: uploadId,
      ...(webcamRecordingId && { webcam_recording_id: webcamRecordingId }),
      ...(webcamUploadId && { webcam_upload_id: webcamUploadId }),
    },
  }
}
