import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createShare, getShareUrl } from '../../../../services/recording/index'

const bodySchema = z.object({
  access_level: z.enum(['view', 'comment']).optional().default('view'),
  password: z.string().min(4).max(100).optional().nullable(),
  expires_in_days: z.number().min(1).max(365).optional().nullable(),
})

const shareSchema = z.object({
  id: z.string().uuid(),
  recording_id: z.string().uuid(),
  share_code: z.string(),
  share_url: z.string(),
  access_level: z.enum(['view', 'comment']),
  has_password: z.boolean(),
  expires_at: z.string().nullable(),
  created_at: z.string(),
})

export const config = {
  name: 'CreateRecordingShare',
  description: 'Create a new share link for a recording',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/recordings/:recordingId/shares',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    201: z.object({ data: shareSchema }) as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['recording-share-created'],
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

  const { data: share, error } = await createShare(supabase, {
    recordingId,
    userId,
    password: body.password,
    expiresInDays: body.expires_in_days,
    accessLevel: body.access_level,
  })

  if (error) {
    logger.error('Failed to create share', { error: error.message, recordingId })
    return {
      status: 400,
      body: { error: error.message },
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4001'
  const shareUrl = getShareUrl(share!.share_code, baseUrl)

  enqueue({
    topic: 'recording-share-created',
    data: {
      resourceType: 'recording_share',
      resourceId: share!.id,
      action: 'create',
      recordingId,
      studyId,
    },
  }).catch(() => {})

  return {
    status: 201,
    body: {
      data: {
        id: share!.id,
        recording_id: share!.recording_id,
        share_code: share!.share_code,
        share_url: shareUrl,
        access_level: share!.access_level,
        has_password: !!share!.password_hash,
        expires_at: share!.expires_at,
        created_at: share!.created_at,
      },
    },
  }
}
