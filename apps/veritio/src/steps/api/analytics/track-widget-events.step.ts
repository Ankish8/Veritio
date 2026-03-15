import { z } from 'zod'
import type { StepConfig } from 'motia'
import type { ApiRequest, ApiHandlerContext } from '../../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { generateVisitorIdentity } from '../../../lib/utils/visitor-hash'

const _widgetEventSchema = z.object({
  studyId: z.string().uuid(),
  eventType: z.enum(['widget_impression', 'widget_click', 'widget_dismiss']),
  timestamp: z.number(),
  metadata: z.object({
    triggerType: z.string().optional(),
    triggerValue: z.number().optional(),
    position: z.string().optional(),
    timeOnPageMs: z.number().optional(),
    timeVisibleMs: z.number().optional(),
    deviceFingerprint: z.string(),
    sessionId: z.string(),
    alreadyParticipated: z.boolean().optional(),
  }),
})

type WidgetEvent = z.infer<typeof _widgetEventSchema>

const bodySchema = z.object({
  events: z.array(z.object({
    studyId: z.string().uuid(),
    eventType: z.enum(['widget_impression', 'widget_click', 'widget_dismiss']),
    timestamp: z.number(),
    metadata: z.object({
      triggerType: z.string().optional(),
      triggerValue: z.number().optional(),
      position: z.string().optional(),
      timeOnPageMs: z.number().optional(),
      timeVisibleMs: z.number().optional(),
      deviceFingerprint: z.string(),
      sessionId: z.string(),
      alreadyParticipated: z.boolean().optional(),
    }),
  })).min(1).max(100),
  sessionId: z.string(),
})

export const config = {
  name: 'TrackWidgetEvents',
  description: 'Track batched widget events for efficient analytics',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/analytics/widget-events',
    bodySchema: bodySchema as any,
    responseSchema: {
    200: z.object({
      success: z.boolean(),
      processed: z.number(),
      deduplicated: z.number(),
      errors: z.number(),
    }) as any,
    400: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['analytics'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const supabase = getMotiaSupabaseClient()
  const { events } = bodySchema.parse(req.body)

  try {
    // Generate server-side visitor identity
    const serverIdentity = generateVisitorIdentity(req.headers)

    const deduplicatedEvents = deduplicateEvents(events)
    const deduplicatedCount = events.length - deduplicatedEvents.length

    const analyticsRecords = deduplicatedEvents.map((evt) => ({
      study_id: evt.studyId,
      source: 'widget' as const,
      event_type: evt.eventType,
      utm_source: 'widget',
      utm_medium: 'intercept',
      custom_params: {},
      widget_metadata: evt.metadata,
      participant_id: null, // Will be linked later if they complete
      ip_hash: serverIdentity.ipHash,
      user_agent: req.headers['user-agent'] || null,
      created_at: new Date(evt.timestamp).toISOString(),
    }))

    const { data: insertedEvents, error: insertError } = await (supabase as any)
      .from('link_analytics')
      .insert(analyticsRecords)
      .select()

    if (insertError) {
      logger.error('Error inserting widget events', { error: insertError })
      return {
        status: 500,
        body: {
          success: false,
          processed: 0,
          deduplicated: deduplicatedCount,
          errors: events.length,
        },
      }
    }

    const sessionUpdates = new Map<string, { clicked: boolean; dismissed: boolean }>()

    for (const evt of deduplicatedEvents) {
      const key = evt.studyId
      const existing = sessionUpdates.get(key) || { clicked: false, dismissed: false }

      if (evt.eventType === 'widget_click') {
        existing.clicked = true
      }
      if (evt.eventType === 'widget_dismiss') {
        existing.dismissed = true
      }

      sessionUpdates.set(key, existing)
    }

    for (const [studyId, updates] of sessionUpdates.entries()) {
      const firstEvent = deduplicatedEvents.find((e) => e.studyId === studyId)
      if (!firstEvent) continue

      const upsertData: any = {
        study_id: studyId,
        device_fingerprint: firstEvent.metadata.deviceFingerprint,
        session_id: firstEvent.metadata.sessionId,
        last_impression_at: new Date().toISOString(),
        ip_hash: serverIdentity.ipHash,
        user_agent: req.headers['user-agent'] || null,
      }

      if (updates.clicked) {
        upsertData.has_clicked = true
      }
      if (updates.dismissed) {
        upsertData.has_dismissed = true
      }

      await (supabase as any)
        .from('widget_sessions')
        .upsert(upsertData, {
          onConflict: 'study_id,device_fingerprint',
          ignoreDuplicates: false,
        })
        .catch((err: any) => logger.error('Error upserting widget session', { error: err }))
    }

    return {
      status: 200,
      body: {
        success: true,
        processed: insertedEvents?.length || 0,
        deduplicated: deduplicatedCount,
        errors: 0,
      },
    }
  } catch (error) {
    logger.error('Error tracking widget events', { error: String(error) })
    return {
      status: 500,
      body: {
        success: false,
        processed: 0,
        deduplicated: 0,
        errors: events.length,
      },
    }
  }
}

function deduplicateEvents(events: WidgetEvent[]): WidgetEvent[] {
  const seen = new Set<string>()
  const unique: WidgetEvent[] = []

  for (const evt of events) {
    // Create dedup key: studyId + eventType + timestamp rounded to second
    const timestampKey = Math.floor(evt.timestamp / 1000)
    const key = `${evt.studyId}:${evt.eventType}:${timestampKey}`

    if (!seen.has(key)) {
      seen.add(key)
      unique.push(evt)
    }
  }

  return unique
}
