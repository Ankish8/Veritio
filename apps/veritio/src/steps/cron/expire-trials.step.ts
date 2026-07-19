import type { StepConfig } from '@/lib/motia/types'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'

export const config = {
  name: 'ExpireTrials',
  description: 'Flip organizations whose 7-day trial has ended from trialing → past_due (hourly)',
  // sec min hour day month dow year — top of every hour
  triggers: [{ type: 'cron', expression: '0 0 * * * * *' }],
  enqueues: [],
  flows: ['billing-lifecycle'],
} satisfies StepConfig

export const handler = async (_input: unknown, { logger }: EventHandlerContext) => {
  const supabase = getMotiaSupabaseClient()
  const nowIso = new Date().toISOString()

  try {
    // Lazy entitlement checks already lock expired trials; this keeps the stored
    // status accurate for admin views and future billing dunning.
    const { data, error } = await (supabase.from('organizations') as any)
      .update({ plan_status: 'past_due' })
      .eq('plan_status', 'trialing')
      .lt('trial_ends_at', nowIso)
      .select('id')

    if (error) {
      logger.error('Failed to expire trials', { error: error.message })
      return
    }

    logger.info('Trial expiry sweep complete', { expired: (data as unknown[] | null)?.length ?? 0 })
  } catch (error) {
    logger.error('Error during trial expiry sweep', { error })
  }
}
