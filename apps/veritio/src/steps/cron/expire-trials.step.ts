import type { StepConfig } from '@/lib/motia/types'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import { getUserEmail } from '../../services/user-service'
import { sendEmail, generateTrialEmail } from '../../services/email-service'
import { getAppBaseUrl } from '../../lib/email/study-links'
import { notify } from '../../lib/events/notify'
import { listOrgBillingRecipients } from '../../services/education-term-service'

export const config = {
  name: 'ExpireTrials',
  description: 'Flip organizations whose 7-day trial has ended from trialing → past_due (hourly)',
  // sec min hour day month dow year — top of every hour
  triggers: [{ type: 'cron', expression: '0 0 * * * * *' }],
  enqueues: ['notification'],
  flows: ['billing-lifecycle'],
} satisfies StepConfig

export const handler = async (_input: unknown, { logger, enqueue }: EventHandlerContext) => {
  const supabase = getMotiaSupabaseClient()
  const nowIso = new Date().toISOString()

  try {
    // Lazy entitlement checks already lock expired trials; this keeps the stored
    // status accurate for admin views and future billing dunning.
    const { data, error } = await (supabase.from('organizations') as any)
      .update({ plan_status: 'past_due' })
      .eq('plan_status', 'trialing')
      .lt('trial_ends_at', nowIso)
      // `name` is returned so the notice can say which workspace expired —
      // people commonly belong to more than one.
      .select('id, name')

    if (error) {
      logger.error('Failed to expire trials', { error: error.message })
      return
    }

    const expired = (data ?? []) as Array<{ id: string; name: string }>

    // Tell somebody. This sweep previously flipped an organization to past_due
    // in complete silence — no email, no in-app notice, not even an event — so
    // the first sign a customer had was hitting a locked feature.
    const billingUrl = `${getAppBaseUrl()}/settings?tab=plan-usage`
    for (const org of expired) {
      const userIds = await listOrgBillingRecipients(supabase, org.id)
      const html = generateTrialEmail({
        organizationName: org.name,
        daysLeft: 0,
        billingUrl,
        expired: true,
      })

      for (const userId of userIds) {
        await notify(enqueue, {
          userId,
          type: 'trial-expired',
          title: 'Your trial has ended',
          message: `The Veritio trial for ${org.name} has ended. Choose a plan to restore access — your studies and data are safe.`,
          metadata: { organizationId: org.id, urgent: true },
        })

        const email = await getUserEmail(userId)
        if (!email) continue
        await sendEmail({
          to: email,
          subject: `Your Veritio trial for ${org.name} has ended`,
          html,
        })
      }
    }

    logger.info('Trial expiry sweep complete', { expired: expired.length })
  } catch (error) {
    logger.error('Error during trial expiry sweep', { error })
  }
}
