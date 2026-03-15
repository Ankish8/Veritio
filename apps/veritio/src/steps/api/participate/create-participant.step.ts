import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { createParticipant } from '../../../services/participant-service'
import { createParticipantSchema } from '../../../services/types'
import { getVariants, assignVariantToParticipant } from '../../../services/live-website-service'
import { getClientIP } from '../../../lib/utils/visitor-hash'

export const config = {
  name: 'CreateParticipant',
  description: 'Create a new participant session (public endpoint)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/participate/:shareCode',
    middleware: [errorHandlerMiddleware],
    bodySchema: createParticipantSchema as any,
  }],
  enqueues: ['participant-started'],
  flows: ['participation'],
} satisfies StepConfig

const paramsSchema = z.object({
  shareCode: z.string().min(1),
})

async function getGeolocation(ip: string): Promise<{ country: string | null; region: string | null; city: string | null }> {
  try {
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return { country: null, region: null, city: null }
    }

    const response = await fetch(`https://ipwho.is/${ip}`, {
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      return { country: null, region: null, city: null }
    }

    const data = await response.json()

    if (data.success === false) {
      return { country: null, region: null, city: null }
    }

    return {
      country: data.country || null,
      region: data.region || null,
      city: data.city || null,
    }
  } catch {
    return { country: null, region: null, city: null }
  }
}

export const handler = async (
  req: ApiRequest,
  { enqueue }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const body = createParticipantSchema.parse(req.body || {})
  const supabase = getMotiaSupabaseClient()

  const clientIP = getClientIP(req.headers)
  let location = clientIP ? await getGeolocation(clientIP) : { country: null, region: null, city: null }

  // Fallback to client-side geoLocation from browserData if server-side lookup failed
  if (!location.country && (body.browserData as any)?.geoLocation) {
    const clientGeo = (body.browserData as any).geoLocation as {
      country?: string | null
      region?: string | null
      city?: string | null
    }
    location = {
      country: clientGeo.country || null,
      region: clientGeo.region || null,
      city: clientGeo.city || null,
    }
  }

  const { data, error } = await createParticipant(supabase, params.shareCode, {
    ...body,
    ...location,
  })

  if (error) {
    if (error.message === 'Study not found') {
      return {
        status: 404,
        body: { error: error.message },
      }
    }
    if (error.message === 'This study is not currently accepting responses') {
      return {
        status: 403,
        body: { error: error.message },
      }
    }
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  // For live website AB testing studies, assign a variant to the participant
  let assignedVariantId: string | null = null
  if (data?.studyId && data?.participantId) {
    try {
      const { data: study } = await supabase
        .from('studies')
        .select('study_type, settings')
        .eq('id', data.studyId)
        .single()

      const isLiveWebsite = study?.study_type === 'live_website_test'
      const settings = (study?.settings && typeof study.settings === 'object') ? study.settings as Record<string, unknown> : {}
      const abTestingEnabled = settings.abTestingEnabled === true

      if (isLiveWebsite && abTestingEnabled) {
        const variants = await getVariants(supabase, data.studyId)
        if (variants.length > 0) {
          assignedVariantId = await assignVariantToParticipant(supabase, data.participantId, data.studyId, variants)
        }
      }
    } catch {
      // Non-fatal: variant assignment failure should not block participation
    }
  }

  enqueue({
    topic: 'participant-started',
    data: {
      studyId: data!.studyId,
      participantId: data!.participantId,
      shareCode: params.shareCode,
    },
  }).catch(() => {})

  return {
    status: 201,
    body: { data: { ...data, assignedVariantId } },
  }
}
