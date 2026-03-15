import { z } from 'zod'
import type { StepConfig } from 'motia'
import type { ApiRequest, ApiHandlerContext } from '../../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { generateVisitorIdentity } from '../../../lib/utils/visitor-hash'

const bodySchema = z.object({
  studyId: z.string().uuid(),
  visitorHash: z.string().min(1).max(200),
  ipHash: z.string().optional(),
  fingerprintHash: z.string().optional(),
  action: z.enum(['view', 'dismiss', 'click']),
  userAgent: z.string().optional(),
})

export const config = {
  name: 'TrackWidgetImpression',
  description: 'Track widget impressions for analytics and frequency capping',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/widget/track-impression',
    bodySchema: bodySchema as any,
    responseSchema: {
    200: z.object({
      success: z.boolean(),
      impressionCount: z.number().optional(),
      message: z.string().optional(),
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
  const { studyId, visitorHash, fingerprintHash, action, userAgent } = bodySchema.parse(req.body)

  try {
    const serverIdentity = generateVisitorIdentity(req.headers, fingerprintHash || null)
    const now = new Date().toISOString()

    const { data: existing, error: fetchError } = await (supabase as any)
      .from('widget_impressions')
      .select('*')
      .eq('study_id', studyId)
      .eq('visitor_hash', visitorHash)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.error('Error fetching widget impression', { error: fetchError })
      return {
        status: 500,
        body: {
          success: false,
          message: 'Failed to fetch impression record',
        },
      }
    }

    const isNewVisitor = !existing

    let upsertData: any = {
      study_id: studyId,
      visitor_hash: visitorHash,
      ip_hash: serverIdentity.ipHash,
      fingerprint_hash: serverIdentity.fingerprintHash,
      user_agent: userAgent || req.headers['user-agent'] || null,
    }

    if (isNewVisitor) {
      upsertData = {
        ...upsertData,
        impression_count: action === 'view' ? 1 : 0,
        first_seen_at: now,
        last_seen_at: now,
        has_participated: action === 'click',
        participated_at: action === 'click' ? now : null,
      }
    } else {
      switch (action) {
        case 'view':
          upsertData = {
            ...upsertData,
            impression_count: (existing.impression_count || 0) + 1,
            last_seen_at: now,
          }
          break

        case 'dismiss':
          upsertData = {
            ...upsertData,
            last_seen_at: now,
          }
          break

        case 'click':
          upsertData = {
            ...upsertData,
            has_participated: true,
            participated_at: now,
            last_seen_at: now,
          }
          break
      }
    }

    const { data: upserted, error: upsertError } = await (supabase as any)
      .from('widget_impressions')
      .upsert(upsertData, {
        onConflict: 'study_id,visitor_hash',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (upsertError) {
      logger.error('Error upserting widget impression', { error: upsertError })
      return {
        status: 500,
        body: {
          success: false,
          message: 'Failed to record impression',
        },
      }
    }

    return {
      status: 200,
      body: {
        success: true,
        impressionCount: upserted?.impression_count || 0,
        message: `Impression tracked: ${action}`,
      },
    }
  } catch (error) {
    logger.error('Error tracking widget impression', { error: String(error) })
    return {
      status: 500,
      body: {
        success: false,
        message: 'Internal server error',
      },
    }
  }
}
