import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { updateClip } from '../../../../services/recording/index'

const bodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  start_ms: z.number().min(0).optional(),
  end_ms: z.number().min(1).optional(),
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
  name: 'UpdateRecordingClip',
  description: 'Update a clip',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/studies/:studyId/recordings/:recordingId/clips/:clipId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: z.object({ data: clipSchema }) as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['recording-clip-updated'],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId, recordingId, clipId } = req.pathParams
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
    .select('id')
    .eq('id', recordingId)
    .eq('study_id', studyId)
    .is('deleted_at', null)
    .single()

  if (recordingError || !recording) {
    return {
      status: 404,
      body: { error: 'Recording not found' },
    }
  }

  const { data: clip, error } = await updateClip(supabase, clipId, userId, {
    title: body.title,
    description: body.description,
    start_ms: body.start_ms,
    end_ms: body.end_ms,
    thumbnail_url: body.thumbnail_url,
    thumbnail_storage_path: body.thumbnail_storage_path,
  })

  if (error) {
    logger.error('Failed to update clip', { error: error.message, clipId })
    const status = error.message.includes('Not authorized') ? 403 :
                   error.message.includes('not found') ? 404 : 400
    return {
      status,
      body: { error: error.message },
    }
  }

  enqueue({
    topic: 'recording-clip-updated',
    data: {
      resourceType: 'recording_clip',
      resourceId: clipId,
      action: 'update',
      recordingId,
      studyId,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { data: clip },
  }
}
