import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { sessionAuthMiddleware } from '../../../middlewares/session-auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const bodySchema = z.object({
  part_number: z.number().int().min(1),
  etag: z.string(),
  chunk_size: z.number().int().min(0),
})

const responseSchema = z.object({
  chunks_uploaded: z.number(),
  total_chunks: z.number().nullable(),
  is_complete: z.boolean(),
})

export const config = {
  name: 'ConfirmRecordingChunk',
  description: 'Confirm a recording chunk has been uploaded',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/recordings/:recordingId/confirm-chunk',
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
  enqueues: ['recording-chunk-confirmed'],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const sessionToken = req.headers['x-session-token'] as string
  const { recordingId } = req.pathParams
  const body = bodySchema.parse(req.body)

  const supabase = getMotiaSupabaseClient()

  const { data, error } = await (supabase.rpc as any)('confirm_recording_chunk', {
    p_recording_id: recordingId,
    p_session_token: sessionToken,
    p_chunk_number: body.part_number,
    p_etag: body.etag,
    p_chunk_size: body.chunk_size,
  })

  if (error) {
    logger.error('Failed to confirm chunk', { error, recordingId })
    return {
      status: 500,
      body: { error: error.message || 'Failed to confirm chunk' },
    }
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    logger.warn('No data returned from confirm_recording_chunk', { recordingId })
    return {
      status: 404,
      body: { error: 'Recording not found or invalid session' },
    }
  }

  const result = Array.isArray(data) ? data[0] : data

  logger.info('Chunk confirmed', {
    recordingId,
    partNumber: body.part_number,
    chunksUploaded: result.chunks_uploaded,
    totalChunks: result.total_chunks,
    isComplete: result.is_complete,
  })

  return {
    status: 200,
    body: {
      chunks_uploaded: result.chunks_uploaded,
      total_chunks: result.total_chunks,
      is_complete: result.is_complete,
    },
  }
}
