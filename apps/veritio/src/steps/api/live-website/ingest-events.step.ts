import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const EventSchema = z.object({
  session_id: z.string(),
  task_id: z.string().nullable().optional(),
  event_type: z.string(),
  element_selector: z.string().nullable().optional(),
  coordinates: z.object({ x: z.number(), y: z.number() }).nullable().optional(),
  viewport_size: z.object({ width: z.number(), height: z.number() }).nullable().optional(),
  page_url: z.string().nullable().optional(),
  timestamp: z.string(),
  metadata: z.any().nullable().optional(),
})

const BodySchema = z.object({
  events: z.array(EventSchema),
})

export const config = {
  name: 'IngestLiveWebsiteEvents',
  description: 'Ingest events from live website testing snippet (public)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/snippet/:snippetId/events',
    middleware: [errorHandlerMiddleware],
    // No bodySchema — body may arrive as text/plain string from sendBeacon (CORS-safe).
    // Motia doesn't parse text/plain bodies, so bodySchema would reject them as null.
    // We parse and validate manually in the handler instead.
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  snippetId: z.string().min(1),
})

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { snippetId } = paramsSchema.parse(req.pathParams)
  // Body may arrive as a raw string when Content-Type is text/plain (CORS-safe)
  const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const body = BodySchema.parse(rawBody)
  const supabase = getMotiaSupabaseClient()

  // Look up study by snippetId
  const { data: studies } = await supabase
    .from('studies')
    .select('id')
    .filter('settings->snippetId', 'eq', `"${snippetId}"`)
    .limit(1)

  if (!studies || studies.length === 0) {
    return { status: 404, headers: { 'Access-Control-Allow-Origin': '*' }, body: { error: 'Snippet not found' } }
  }

  const studyId = studies[0].id

  // Batch insert events
  if (body.events.length > 0) {
    const rows = body.events.map((event) => ({
      study_id: studyId,
      session_id: event.session_id,
      task_id: event.task_id || null,
      event_type: event.event_type,
      element_selector: event.element_selector || null,
      coordinates: event.coordinates || null,
      viewport_size: event.viewport_size || null,
      page_url: event.page_url || null,
      timestamp: event.timestamp,
      metadata: event.metadata || null,
    }))

    const { error } = await (supabase
      .from('live_website_events' as any) as any)
      .insert(rows)

    if (error) {
      logger.error('Failed to insert events', { error })
      return { status: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: { error: 'Failed to store events' } }
    }
  }

  return {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: { success: true, count: body.events.length },
  }
}
