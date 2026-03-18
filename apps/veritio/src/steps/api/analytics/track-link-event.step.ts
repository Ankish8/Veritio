import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { trackLinkEvent, type LinkEventType, type LinkSource } from '../../../services/link-analytics-service'

const bodySchema = z.object({
  studyId: z.string().uuid(),
  source: z.enum(['direct', 'qr_code', 'email', 'widget', 'custom']),
  eventType: z.enum(['view', 'start', 'complete', 'screenout', 'quota_full']),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  customParams: z.record(z.string()).optional(),
  participantId: z.string().uuid().optional(),
})

export const config = {
  name: 'TrackLinkEvent',
  description: 'Track a link analytics event (public endpoint)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/analytics/link',
    middleware: [errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    400: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['analytics'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const validation = validateRequest(bodySchema, req.body, logger)
  if (!validation.success) return validation.response

  const {
    studyId,
    source,
    eventType,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    customParams,
    participantId,
  } = validation.data

  const forwardedFor = req.headers['x-forwarded-for'] as string | undefined
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown'
  const ipHash = ip !== 'unknown' ? btoa(ip).slice(0, 16) : undefined
  const userAgent = (req.headers['user-agent'] as string)?.slice(0, 256)

  const supabase = getMotiaSupabaseClient()
  const result = await trackLinkEvent(supabase, {
    studyId,
    source: source as LinkSource,
    eventType: eventType as LinkEventType,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    customParams,
    participantId,
    ipHash,
    userAgent,
  })

  if (!result.success) {
    logger.error('Failed to track link event', { error: result.error, studyId })
    return {
      status: 500,
      body: { error: 'Failed to track event' },
    }
  }

  return {
    status: 200,
    body: { success: true },
  }
}
