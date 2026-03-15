import { z } from 'zod'
import type { StepConfig } from 'motia'
import type { ApiRequest, ApiHandlerContext } from '../../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const bodySchema = z.object({
  studyId: z.string().uuid(),
  deviceFingerprint: z.string(),
  sessionId: z.string(),
})

export const config = {
  name: 'CheckWidgetSession',
  description: 'Check device session state to determine if widget should be shown',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/analytics/widget-session/check',
    bodySchema: bodySchema as any,
    responseSchema: {
    200: z.object({
      shouldShow: z.boolean(),
      reason: z.enum(['already_participated', 'already_dismissed', 'already_clicked', 'eligible', 'new_device']).optional(),
      sessionState: z.object({
        impressionCount: z.number(),
        hasClicked: z.boolean(),
        hasDismissed: z.boolean(),
        hasParticipated: z.boolean(),
      }),
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
  const { studyId, deviceFingerprint } = bodySchema.parse(req.body)

  try {
    const { data: session, error: sessionError } = await (supabase as any)
      .from('widget_sessions')
      .select('*')
      .eq('study_id', studyId)
      .eq('device_fingerprint', deviceFingerprint)
      .single()

    const defaultState = { impressionCount: 0, hasClicked: false, hasDismissed: false, hasParticipated: false }
    const eligible = (reason: string, sessionState = defaultState) =>
      ({ status: 200 as const, body: { shouldShow: true, reason, sessionState } })

    if (sessionError?.code === 'PGRST116') {
      return eligible('new_device')
    }

    if (sessionError) {
      logger.error('Error fetching widget session', { error: sessionError })
      return eligible('eligible')
    }

    const sessionState = {
      impressionCount: session.impression_count || 0,
      hasClicked: session.has_clicked || false,
      hasDismissed: session.has_dismissed || false,
      hasParticipated: session.has_participated || false,
    }

    if (session.has_participated) {
      return { status: 200, body: { shouldShow: false, reason: 'already_participated', sessionState } }
    }

    if (session.has_clicked) {
      return { status: 200, body: { shouldShow: false, reason: 'already_clicked', sessionState } }
    }

    if (session.has_dismissed) {
      return { status: 200, body: { shouldShow: false, reason: 'already_dismissed', sessionState } }
    }

    return { status: 200, body: { shouldShow: true, reason: 'eligible', sessionState } }
  } catch (error) {
    logger.error('Error checking widget session', { error: String(error) })
    return {
      status: 200,
      body: {
        shouldShow: true,
        reason: 'eligible',
        sessionState: { impressionCount: 0, hasClicked: false, hasDismissed: false, hasParticipated: false },
      },
    }
  }
}
