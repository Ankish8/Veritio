import { z } from 'zod'
import type { StepConfig } from 'motia'
import type { ApiRequest, ApiHandlerContext } from '../../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import type { FrequencyCappingSettings, TargetingSettings } from '../../../components/builders/shared/types'

const bodySchema = z.object({
  studyId: z.string().uuid(),
  visitorHash: z.string().min(1).max(200),
  ipHash: z.string().optional(),
  fingerprintHash: z.string().optional(),
})

export const config = {
  name: 'CheckWidgetEligibility',
  description: 'Check if widget should be shown based on frequency capping and targeting rules',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/widget/check-eligibility',
    bodySchema: bodySchema as any,
    responseSchema: {
    200: z.object({
      shouldShow: z.boolean(),
      reason: z.string().optional(),
      remainingImpressions: z.number().optional(),
      nextEligibleAt: z.string().optional(),
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
  const { studyId, visitorHash, fingerprintHash: _fingerprintHash} = bodySchema.parse(req.body)

  try {
    const { data: study, error: studyError } = await (supabase as any)
      .from('studies')
      .select('id, sharing_settings')
      .eq('id', studyId)
      .single()

    if (studyError || !study) {
      // Study not found - fail open (show widget)
      return {
        status: 200,
        body: {
          shouldShow: true,
          reason: 'study_not_found_fail_open',
        },
      }
    }

    const sharingSettings = (study as any).sharing_settings as any
    const interceptSettings = sharingSettings?.intercept

    if (!interceptSettings?.enabled) {
      return {
        status: 200,
        body: {
          shouldShow: false,
          reason: 'widget_disabled',
        },
      }
    }

    const frequencyCapping: FrequencyCappingSettings | undefined = interceptSettings.frequencyCapping
    const targeting: TargetingSettings | undefined = interceptSettings.targeting

    const { data: impression, error: impressionError } = await (supabase as any)
      .from('widget_impressions')
      .select('*')
      .eq('study_id', studyId)
      .eq('visitor_hash', visitorHash)
      .single()

    if (impressionError && impressionError.code !== 'PGRST116') {
      logger.error('Error fetching widget impression', { error: impressionError })
      return {
        status: 200,
        body: {
          shouldShow: true,
          reason: 'db_error_fail_open',
        },
      }
    }

    const isNewVisitor = !impression
    const isReturningVisitor = !!impression

    if (frequencyCapping?.enabled && frequencyCapping.hideAfterParticipation) {
      if ((impression as any)?.has_participated) {
        return {
          status: 200,
          body: {
            shouldShow: false,
            reason: 'already_participated',
          },
        }
      }
    }

    if (targeting) {
      if (targeting.newVisitors && !targeting.returningVisitors && isReturningVisitor) {
        return {
          status: 200,
          body: {
            shouldShow: false,
            reason: 'targeting_new_visitors_only',
          },
        }
      }

      if (targeting.returningVisitors && !targeting.newVisitors && isNewVisitor) {
        return {
          status: 200,
          body: {
            shouldShow: false,
            reason: 'targeting_returning_visitors_only',
          },
        }
      }

      if (targeting.excludeParticipants && (impression as any)?.has_participated) {
        return {
          status: 200,
          body: {
            shouldShow: false,
            reason: 'excluding_participants',
          },
        }
      }
    }

    if (frequencyCapping?.enabled && impression) {
      const { maxImpressions, timeWindow } = frequencyCapping
      const now = new Date()
      const lastSeen = new Date((impression as any).last_seen_at)
      let windowStart: Date

      switch (timeWindow) {
        case 'day':
          windowStart = new Date(now)
          windowStart.setHours(0, 0, 0, 0) // Start of today
          break
        case 'week':
          windowStart = new Date(now)
          windowStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
          windowStart.setHours(0, 0, 0, 0)
          break
        case 'month':
          windowStart = new Date(now)
          windowStart.setDate(1) // Start of month
          windowStart.setHours(0, 0, 0, 0)
          break
        case 'forever':
          windowStart = new Date(0) // Beginning of time
          break
        default:
          windowStart = new Date(now)
          windowStart.setHours(0, 0, 0, 0)
      }

      const isWithinWindow = lastSeen >= windowStart
      const effectiveCount = isWithinWindow ? (impression as any).impression_count : 0
      if (effectiveCount >= maxImpressions) {
        let nextEligible: Date
        switch (timeWindow) {
          case 'day':
            nextEligible = new Date(now)
            nextEligible.setDate(now.getDate() + 1)
            nextEligible.setHours(0, 0, 0, 0)
            break
          case 'week':
            nextEligible = new Date(now)
            nextEligible.setDate(now.getDate() + (7 - now.getDay()))
            nextEligible.setHours(0, 0, 0, 0)
            break
          case 'month':
            nextEligible = new Date(now)
            nextEligible.setMonth(now.getMonth() + 1)
            nextEligible.setDate(1)
            nextEligible.setHours(0, 0, 0, 0)
            break
          case 'forever':
            nextEligible = new Date('2099-12-31')
            break
          default:
            nextEligible = new Date(now)
            nextEligible.setDate(now.getDate() + 1)
        }

        return {
          status: 200,
          body: {
            shouldShow: false,
            reason: 'frequency_cap_reached',
            remainingImpressions: 0,
            nextEligibleAt: nextEligible.toISOString(),
          },
        }
      }

      return {
        status: 200,
        body: {
          shouldShow: true,
          remainingImpressions: maxImpressions - effectiveCount,
        },
      }
    }

    return {
      status: 200,
      body: {
        shouldShow: true,
        reason: isNewVisitor ? 'new_visitor' : 'eligible',
      },
    }
  } catch (error) {
    logger.error('Error checking widget eligibility', { error: String(error) })

    return {
      status: 200,
      body: {
        shouldShow: true,
        reason: 'error_fail_open',
      },
    }
  }
}
