import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { deleteClip } from '../../../../services/recording/index'

export const config = {
  name: 'DeleteRecordingClip',
  description: 'Delete a clip',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/studies/:studyId/recordings/:recordingId/clips/:clipId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['recording-clip-deleted'],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId, recordingId, clipId } = req.pathParams

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

  const { success, error } = await deleteClip(supabase, clipId, userId)

  if (error) {
    logger.error('Failed to delete clip', { error: error.message, clipId })
    const status = error.message.includes('Not authorized') ? 403 :
                   error.message.includes('not found') ? 404 : 500
    return {
      status,
      body: { error: error.message },
    }
  }

  enqueue({
    topic: 'recording-clip-deleted',
    data: {
      resourceType: 'recording_clip',
      resourceId: clipId,
      action: 'delete',
      recordingId,
      studyId,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { success },
  }
}
