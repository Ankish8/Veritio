import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { listSharesByRecording } from '../../../../services/recording/index'

const shareSchema = z.object({
  id: z.string().uuid(),
  recording_id: z.string().uuid(),
  share_code: z.string(),
  access_level: z.enum(['view', 'comment']),
  has_password: z.boolean(),
  expires_at: z.string().nullable(),
  view_count: z.number(),
  last_viewed_at: z.string().nullable(),
  created_by: z.string(),
  created_at: z.string(),
})

const responseSchema = z.object({
  data: z.array(shareSchema),
})

export const config = {
  name: 'ListRecordingShares',
  description: 'List all share links for a recording',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/recordings/:recordingId/shares',
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

  const { data: shares, error } = await listSharesByRecording(supabase, recordingId)

  if (error) {
    logger.error('Failed to fetch shares', { error, recordingId })
    return {
      status: 500,
      body: { error: 'Failed to fetch shares' },
    }
  }

  const transformedShares = (shares || []).map(share => ({
    id: share.id,
    recording_id: share.recording_id,
    share_code: share.share_code,
    access_level: share.access_level,
    has_password: !!share.password_hash,
    expires_at: share.expires_at,
    view_count: share.view_count,
    last_viewed_at: share.last_viewed_at,
    created_by: share.created_by,
    created_at: share.created_at,
  }))

  return {
    status: 200,
    body: { data: transformedShares },
  }
}
