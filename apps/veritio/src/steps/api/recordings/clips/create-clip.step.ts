import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createClip } from '../../../../services/recording/index'

const bodySchema = z.object({
  start_ms: z.number().min(0),
  end_ms: z.number().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  thumbnail_url: z.string().url().optional().nullable(),
  thumbnail_storage_path: z.string().optional().nullable(),
})

const clipSchema = z.object({
  id: z.string().uuid(),
  recording_id: z.string().uuid(),
  start_ms: z.number(),
  end_ms: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  thumbnail_storage_path: z.string().nullable(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const config = {
  name: 'CreateRecordingClip',
  description: 'Create a new clip on a recording',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/recordings/:recordingId/clips',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    201: z.object({ data: clipSchema }) as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['recording-clip-created'],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId, recordingId } = req.pathParams
  const body = bodySchema.parse(req.body)

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

  const { data: recording, error: recordingError } = await supabase
    .from('recordings')
    .select('id, duration_ms')
    .eq('id', recordingId)
    .eq('study_id', studyId)
    .is('deleted_at', null)
    .single() as any

  if (recordingError || !recording) {
    return {
      status: 404,
      body: { error: 'Recording not found' },
    }
  }

  if (recording.duration_ms && body.end_ms > recording.duration_ms) {
    return {
      status: 400,
      body: { error: 'Clip end time exceeds recording duration' },
    }
  }

  const { data: clip, error } = await createClip(supabase, {
    recordingId,
    startMs: body.start_ms,
    endMs: body.end_ms,
    title: body.title,
    description: body.description,
    thumbnailUrl: body.thumbnail_url,
    thumbnailStoragePath: body.thumbnail_storage_path,
    userId,
  })

  if (error) {
    logger.error('Failed to create clip', { error: error.message, recordingId })
    return {
      status: 400,
      body: { error: error.message },
    }
  }

  enqueue({
    topic: 'recording-clip-created',
    data: {
      resourceType: 'recording_clip',
      resourceId: clip!.id,
      action: 'create',
      recordingId,
      studyId,
    },
  }).catch(() => {})

  return {
    status: 201,
    body: { data: clip },
  }
}
