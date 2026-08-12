import type { StepConfig } from '@/lib/motia/types'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import { getUserEmail } from '../../services/user-service'
import { sendEmail, generateTrialEmail } from '../../services/email-service'
import { getAppBaseUrl } from '../../lib/email/study-links'
import { notify } from '../../lib/events/notify'
import {
  dueTrialWarningFor,
  listTrialingOrganizations,
  markTrialWarningSent,
} from '../../services/trial-service'
import { listOrgBillingRecipients } from '../../services/education-term-service'

/**
 * Warn before a trial expires.
 *
 * Trials previously ended in total silence — the hourly sweep flipped an
 * organization to `past_due` and told nobody, so the first signal a customer
 * got was a locked feature. This gives them notice while they can still act.
 *
 * Daily rather than hourly: the notice is measured in days, and the warning
 * stage recorded per trial end date is what stops it repeating.
 */

export const config = {
  name: 'WarnExpiringTrials',
  description: 'Notify organizations before their trial ends (daily)',
  // 08:05 daily. Just after the term sweep so the two billing notices don't
  // contend, and ahead of the 09:00 digest.
  triggers: [{ type: 'cron', expression: '0 5 8 * * * *' }],
  enqueues: ['notification'],
  flows: ['billing-lifecycle'],
} satisfies StepConfig

export const handler = async (_input: unknown, { logger, enqueue }: EventHandlerContext) => {
  const supabase = getMotiaSupabaseClient()
  const billingUrl = `${getAppBaseUrl()}/settings?tab=plan-usage`

  try {
    const orgs = await listTrialingOrganizations(supabase)
    const due = orgs
      .map((org) => dueTrialWarningFor(org))
      .filter((w): w is NonNullable<typeof w> => w !== null)

    if (due.length === 0) {
      logger.info('Trial warning sweep: nothing due', { trialingOrgs: orgs.length })
      return
    }

    let notified = 0
    for (const { org, stage, daysLeft } of due) {
      const userIds = await listOrgBillingRecipients(supabase, org.id)
      const html = generateTrialEmail({
        organizationName: org.name,
        daysLeft,
        billingUrl,
        expired: false,
      })

      let anyDelivered = false
      for (const userId of userIds) {
        // In-app always; email is gated downstream on the user's billing
        // category preference.
        await notify(enqueue, {
          userId,
          type: 'trial-ending-soon',
          title: `Trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
          message: `The Veritio trial for ${org.name} ends soon. Add a plan to keep your studies running.`,
          metadata: { organizationId: org.id, daysLeft, stage },
        })

        const email = await getUserEmail(userId)
        if (!email) continue
        const result = await sendEmail({
          to: email,
          subject:
            stage === 2
              ? `Final notice: your Veritio trial ends tomorrow`
              : `Your Veritio trial ends in ${daysLeft} days`,
          html,
        })
        if (result.success) anyDelivered = true
      }

      // Send first, mark second — matching the term sweep. A failed send leaves
      // the stage unchanged so tomorrow retries, rather than silently
      // swallowing the only notice a customer would get.
      if (anyDelivered) {
        await markTrialWarningSent(supabase, org.id, org.trial_ends_at!, stage)
        notified += 1
      } else {
        logger.warn('Trial warning undelivered; will retry tomorrow', {
          orgId: org.id,
          stage,
          recipients: userIds.length,
        })
      }
    }

    logger.info('Trial warning sweep complete', {
      trialingOrgs: orgs.length,
      due: due.length,
      notified,
    })
  } catch (error) {
    logger.error('Error during trial warning sweep', { error })
  }
}
