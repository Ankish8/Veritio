import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createComment } from '../../../../services/recording/index'

const bodySchema = z.object({
  content: z.string().min(1).max(5000),
  timestamp_ms: z.number().int().min(0).optional().nullable(),
  clip_id: z.string().uuid().optional().nullable(),
})

const commentSchema = z.object({
  id: z.string().uuid(),
  recording_id: z.string().uuid(),
  clip_id: z.string().uuid().nullable(),
  timestamp_ms: z.number().nullable(),
  content: z.string(),
  created_by: z.string(),
  author_name: z.string().nullable(),
  author_email: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const config = {
  name: 'CreateRecordingComment',
  description: 'Create a new comment on a recording',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/recordings/:recordingId/comments',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    201: z.object({ data: commentSchema }) as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['recording-comment-created'],
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

  const { data: comment, error } = await createComment(supabase, {
    recordingId,
    content: body.content,
    userId,
    timestampMs: body.timestamp_ms,
    clipId: body.clip_id,
  })

  if (error) {
    logger.error('Failed to create comment', { error: error.message, recordingId })
    return {
      status: 400,
      body: { error: error.message },
    }
  }

  enqueue({
    topic: 'recording-comment-created',
    data: {
      resourceType: 'recording_comment',
      resourceId: comment!.id,
      action: 'create',
      recordingId,
      studyId,
    },
  }).catch(() => {})

  return {
    status: 201,
    body: { data: comment },
  }
}
