import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { requireStudyEditor } from '../../../../middlewares/permissions.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { listCommentsByRecording } from '../../../../services/recording/index'

const commentSchema = z.object({
  id: z.string().uuid(),
  recording_id: z.string().uuid(),
  clip_id: z.string().uuid().nullable(),
  timestamp_ms: z.number().nullable(),
  content: z.string(),
  created_by: z.string(),
  author_name: z.string().nullable(),
  author_email: z.string().nullable(),
  author_image: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

const responseSchema = z.object({
  data: z.array(commentSchema),
})

export const config = {
  name: 'ListRecordingComments',
  description: 'List all comments for a recording',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/recordings/:recordingId/comments',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
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
  const { studyId, recordingId } = req.pathParams

  const supabase = getMotiaSupabaseClient()

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

  const { data: comments, error } = await listCommentsByRecording(supabase, recordingId)

  if (error) {
    logger.error('Failed to fetch comments', { error, recordingId })
    return {
      status: 500,
      body: { error: 'Failed to fetch comments' },
    }
  }

  return {
    status: 200,
    body: { data: comments },
  }
}

