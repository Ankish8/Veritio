import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { sessionAuthMiddleware } from '../../../middlewares/session-auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getChunkUploadUrl } from '../../../services/storage/r2-client'

const bodySchema = z.object({
  part_number: z.number().int().min(1),
})

const responseSchema = z.object({
  upload_url: z.string().url(),
})

export const config = {
  name: 'GetRecordingChunkUrl',
  description: 'Get signed URL for uploading a recording chunk',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/recordings/:recordingId/chunk-url',
    middleware: [sessionAuthMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: responseSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const sessionToken = req.headers['x-session-token'] as string
  const { recordingId } = req.pathParams
  const body = bodySchema.parse(req.body)

  const supabase = getMotiaSupabaseClient()

  const { data: recording, error: recordingError } = await supabase
    .from('recordings')
    .select('id, study_id, participant_id, storage_path, upload_id, status')
    .eq('id', recordingId)
    .single() as any

  if (recordingError || !recording) {
    logger.warn('Recording not found', { recordingId })
    return {
      status: 404,
      body: { error: 'Recording not found' },
    }
  }

  const { data: participant } = await supabase
    .from('participants')
    .select('session_token')
    .eq('id', recording.participant_id)
    .single()

  if (!participant || participant.session_token !== sessionToken) {
    logger.warn('Invalid session token for chunk upload', { recordingId })
    return {
      status: 401,
      body: { error: 'Invalid session token' },
    }
  }

  if (recording.status !== 'uploading') {
    logger.warn('Recording not in uploading status', { recordingId, status: recording.status })
    return {
      status: 400,
      body: { error: 'Recording is not accepting uploads' },
    }
  }

  try {
    const uploadUrl = await getChunkUploadUrl(
      recording.storage_path,
      recording.upload_id,
      body.part_number
    )

    return {
      status: 200,
      body: { upload_url: uploadUrl },
    }
  } catch (error) {
    logger.error('Failed to generate upload URL', { error, recordingId })
    return {
      status: 500,
      body: { error: 'Failed to generate upload URL' },
    }
  }
}
