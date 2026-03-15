import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getPlaybackUrl } from '../../../services/storage/r2-client'

const responseSchema = z.object({
  playback_url: z.string().url(),
  expires_in: z.number(),
})

export const config = {
  name: 'GetRecordingPlaybackUrl',
  description: 'Get signed playback URL for a recording',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/recordings/:recordingId/playback',
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

  const { data: recording, error: recordingError } = await supabase
    .from('recordings')
    .select('id, storage_path, status, deleted_at')
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

  if (recording.status !== 'ready' && recording.status !== 'completed') {
    logger.warn('Recording not ready for playback', { recordingId, status: recording.status })
    return {
      status: 400,
      body: { error: 'Recording is not ready for playback' },
    }
  }

  try {
    const expiresIn = 3600
    const playbackUrl = await getPlaybackUrl(recording.storage_path, expiresIn)

    return {
      status: 200,
      body: {
        playback_url: playbackUrl,
        expires_in: expiresIn,
      },
    }
  } catch (error) {
    logger.error('Failed to generate playback URL', { error, recordingId })
    return {
      status: 500,
      body: { error: 'Failed to generate playback URL' },
    }
  }
}
