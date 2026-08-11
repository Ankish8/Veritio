import type { StepConfig } from '@/lib/motia/types'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import { getUserEmail } from '../../services/user-service'
import { sendEmail, generateTermExpiryEmail } from '../../services/email-service'
import {
  dueWarningFor,
  listTermNoticeRecipients,
  listTermedOrganizations,
  markTermWarningSent,
} from '../../services/education-term-service'

export const config = {
  name: 'WarnExpiringTerms',
  description: 'Notify education licenses before their access term ends (daily)',
  // 08:00 daily, in the engine's timezone (UTC in production). Ahead of the
  // 09:00 digest so a renewal notice does not arrive buried under one.
  triggers: [{ type: 'cron', expression: '0 0 8 * * * *' }],
  enqueues: [],
  flows: ['billing-lifecycle'],
} satisfies StepConfig

export const handler = async (_input: unknown, { logger }: EventHandlerContext) => {
  const supabase = getMotiaSupabaseClient()

  try {
    const orgs = await listTermedOrganizations(supabase)
    const due = orgs.map((org) => dueWarningFor(org)).filter((w) => w !== null)

    if (due.length === 0) {
      logger.info('Term expiry sweep: nothing due', { termedOrgs: orgs.length })
      return
    }

    let notified = 0
    for (const { org, stage, daysLeft } of due) {
      const userIds = await listTermNoticeRecipients(supabase, org.id)
      const html = generateTermExpiryEmail(org.name, org.access_ends_at!, daysLeft, stage === 2)

      // Send first, mark second: a failed send leaves the stage unchanged so the
      // next day retries, rather than silently swallowing the only notice.
      let anyDelivered = false
      for (const userId of userIds) {
        const email = await getUserEmail(userId)
        if (!email) continue
        const result = await sendEmail({
          to: email,
          subject: `${stage === 2 ? 'Final notice' : 'Renewal notice'}: Veritio access for ${org.name} ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
          html,
        })
        if (result.success) anyDelivered = true
      }

      if (anyDelivered) {
        await markTermWarningSent(supabase, org.id, org.access_ends_at!, stage)
        notified += 1
      } else {
        logger.warn('Term expiry notice undelivered; will retry tomorrow', {
          orgId: org.id,
          stage,
          recipients: userIds.length,
        })
      }
    }

    logger.info('Term expiry sweep complete', { termedOrgs: orgs.length, due: due.length, notified })
  } catch (error) {
    logger.error('Error during term expiry sweep', { error })
  }
}
