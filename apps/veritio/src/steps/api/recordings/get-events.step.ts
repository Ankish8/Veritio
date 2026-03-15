import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const recordingEventSchema = z.object({
  id: z.string().uuid(),
  event_type: z.string(),
  timestamp_ms: z.number(),
  data: z.any().nullable(),
  created_at: z.string(),
})

const responseSchema = z.object({
  data: z.array(recordingEventSchema),
  count: z.number(),
})

export const config = {
  name: 'GetRecordingEvents',
  description: 'Fetch recording events for playback timeline',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/recordings/:recordingId/events',
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

  const queryParams = (req as any).query || {}
  const eventType = queryParams.event_type as string | undefined
  const startMs = queryParams.start_ms ? parseInt(queryParams.start_ms, 10) : undefined
  const endMs = queryParams.end_ms ? parseInt(queryParams.end_ms, 10) : undefined

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
    .select('id, deleted_at')
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
    return {
      status: 404,
      body: { error: 'Recording has been deleted' },
    }
  }

  let query = supabase
    .from('recording_events')
    .select('id, event_type, timestamp_ms, data, created_at', { count: 'exact' })
    .eq('recording_id', recordingId)

  if (eventType) {
    query = query.eq('event_type', eventType)
  }
  if (startMs !== undefined) {
    query = query.gte('timestamp_ms', startMs)
  }
  if (endMs !== undefined) {
    query = query.lte('timestamp_ms', endMs)
  }

  query = query.order('timestamp_ms', { ascending: true })

  const { data: events, error: eventsError, count } = await query as any

  if (eventsError) {
    logger.error('Failed to fetch recording events', { error: eventsError, recordingId })
    return {
      status: 500,
      body: { error: 'Failed to fetch recording events' },
    }
  }

  return {
    status: 200,
    body: {
      data: events || [],
      count: count || 0,
    },
  }
}
