import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { updateComment } from '../../../../services/recording/index'

const bodySchema = z.object({
  content: z.string().min(1).max(5000),
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
  name: 'UpdateRecordingComment',
  description: 'Update a comment',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/studies/:studyId/recordings/:recordingId/comments/:commentId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: z.object({ data: commentSchema }) as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['recording-comment-updated'],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId, recordingId, commentId } = req.pathParams
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

  const { data: comment, error } = await updateComment(supabase, commentId, userId, body.content)

  if (error) {
    logger.error('Failed to update comment', { error: error.message, commentId })
    const status = error.message.includes('Not authorized') ? 403 :
                   error.message.includes('not found') ? 404 : 400
    return {
      status,
      body: { error: error.message },
    }
  }

  enqueue({
    topic: 'recording-comment-updated',
    data: {
      resourceType: 'recording_comment',
      resourceId: commentId,
      action: 'update',
      recordingId,
      studyId,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { data: comment },
  }
}
