import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { sessionAuthMiddleware } from '../../../middlewares/session-auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const recordingEventSchema = z.object({
  timestamp_ms: z.number().int().min(0),
  event_type: z.enum(['click', 'scroll', 'navigation', 'task_start', 'task_end', 'frame_change']),
  data: z.record(z.string(), z.any()),
})

const bodySchema = z.object({
  events: z.array(recordingEventSchema).min(1).max(1000), // Limit batch size
})

const responseSchema = z.object({
  success: z.boolean(),
  events_inserted: z.number(),
})

export const config = {
  name: 'SubmitRecordingEvents',
  description: 'Submit recording events for a recording (batch insert)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/recordings/:recordingId/events',
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
  enqueues: ['recording-events-submitted'],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const sessionToken = req.headers['x-session-token'] as string
  const { recordingId } = req.pathParams
  const body = bodySchema.parse(req.body)

  const supabase = getMotiaSupabaseClient()

  const { data: recording, error: recordingError } = await supabase
    .from('recordings')
    .select('id, participant_id')
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
    logger.warn('Invalid session token for event submission', { recordingId })
    return {
      status: 401,
      body: { error: 'Invalid session token' },
    }
  }

  const eventsToInsert = body.events.map(event => ({
    recording_id: recordingId,
    event_type: event.event_type,
    timestamp_ms: event.timestamp_ms,
    data: event.data,
  }))

  const { error: insertError } = await supabase
    .from('recording_events')
    .insert(eventsToInsert) as any

  if (insertError) {
    logger.error('Failed to insert recording events', { error: insertError, recordingId })
    return {
      status: 500,
      body: { error: 'Failed to save recording events' },
    }
  }

  logger.info('Recording events submitted', {
    recordingId,
    eventsCount: body.events.length,
    eventTypes: [...new Set(body.events.map(e => e.event_type))]
  })

  enqueue({
    topic: 'recording-events-submitted',
    data: {
      resourceType: 'recording_events',
      resourceId: recordingId,
      action: 'submit',
      eventsCount: body.events.length,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: {
      success: true,
      events_inserted: body.events.length,
    },
  }
}
