import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { sessionAuthMiddleware } from '../../../middlewares/session-auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getPlaybackUrl } from '../../../services/storage/r2-client'

const paramsSchema = z.object({
  recordingId: z.string().uuid(),
})

const responseSchema = z.object({
  playback_url: z.string().url(),
  expires_in: z.number(),
})

export const config = {
  name: 'GetParticipantPlaybackUrl',
  description: 'Get signed playback URL for participant recording',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/recordings/:recordingId/playback-url',
    middleware: [sessionAuthMiddleware, errorHandlerMiddleware],
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
  const participantId = req.headers['x-participant-id'] as string
  const params = paramsSchema.parse(req.pathParams)

  const supabase = getMotiaSupabaseClient()

  const { data: recording, error: recordingError } = await supabase
    .from('recordings')
    .select('id, participant_id, storage_path, storage_provider, status')
    .eq('id', params.recordingId)
    .eq('participant_id', participantId)
    .single()

  if (recordingError || !recording) {
    logger.warn('Recording not found or access denied', {
      recordingId: params.recordingId,
      participantId,
    })
    return {
      status: 404,
      body: { error: 'Recording not found' },
    }
  }

  if (recording.status !== 'completed') {
    logger.warn('Recording not ready for playback', {
      recordingId: params.recordingId,
      status: recording.status,
    })
    return {
      status: 400,
      body: { error: 'Recording is not ready for playback' },
    }
  }

  const playbackUrl = await getPlaybackUrl(recording.storage_path, 3600)

  return {
    status: 200,
    body: {
      playback_url: playbackUrl,
      expires_in: 3600,
    },
  }
}
