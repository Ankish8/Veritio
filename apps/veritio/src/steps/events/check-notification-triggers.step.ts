import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import { toJson } from '../../lib/supabase/json-utils'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getUserEmail } from '../../services/user-service'
import {
  sendEmail,
  generateResponseReceivedEmail,
  generateMilestoneEmail,
} from '../../services/email-service'
import {
  normalizeNotificationSettings,
  selectCrossedMilestones,
} from '../../services/study-notification-service'
import { buildStudyResultsUrl } from '../../lib/email/study-links'
import { responseSubmittedSchema } from '../../lib/events/schemas'
import { notify } from '../../lib/events/notify'

export const config = {
  name: 'CheckNotificationTriggers',
  description: 'Evaluate notification triggers after a response is submitted',
  triggers: [
    { type: 'queue', topic: 'response-submitted' },
    { type: 'queue', topic: 'survey-completed' },
  ],
  enqueues: ['digest-queue-update'],
  flows: ['notifications'],
} satisfies StepConfig

export const handler = async (
  input: z.infer<typeof responseSubmittedSchema>,
  { logger, enqueue }: EventHandlerContext
) => {
  const data = responseSubmittedSchema.parse(input)
  const supabase = getMotiaSupabaseClient()

  logger.info('Checking notification triggers', { studyId: data.studyId })

  try {
    const { data: study, error: studyError } = await supabase
      .from('studies')
      .select('id, title, user_id, project_id, email_notification_settings')
      .eq('id', data.studyId)
      .single()

    if (studyError || !study) {
      logger.warn('Study not found for notifications', { studyId: data.studyId })
      return
    }

    const rawSettings = (study.email_notification_settings ?? null) as Record<string, unknown> | null
    const settings = normalizeNotificationSettings(rawSettings)

    if (!settings.enabled) {
      logger.info('Notifications disabled for study', { studyId: data.studyId })
      return
    }

    const { count: responseCount } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('study_id', data.studyId)
      .eq('status', 'completed')

    const totalResponses = responseCount || 0

    if (!study.user_id) {
      logger.warn('Study has no user_id', { studyId: data.studyId })
      return
    }
    const userEmail = await getUserEmail(study.user_id)
    if (!userEmail) {
      logger.warn('Could not get user email for notifications', {
        userId: study.user_id,
      })
      return
    }

    const studyUrl = buildStudyResultsUrl(study.project_id, data.studyId)

    if (settings.everyResponse) {
      logger.info('Sending every-response notification', { studyId: data.studyId })
      const html = generateResponseReceivedEmail(study.title, totalResponses, studyUrl)
      const result = await sendEmail({
        to: userEmail,
        subject: `New Response - ${study.title}`,
        html,
        studyId: data.studyId,
      })

      if (result.rateLimited) {
        logger.info('Every-response email rate limited', { studyId: data.studyId })
      } else if (!result.success) {
        logger.warn('Failed to send every-response email', { error: result.error })
      }
    }

    if (settings.milestonesEnabled) {
      const crossed = selectCrossedMilestones(settings, totalResponses)

      if (crossed.length > 0) {
        const milestone = crossed[crossed.length - 1]

        logger.info('Milestone reached, sending notification', {
          studyId: data.studyId,
          milestone,
          alsoRecording: crossed.slice(0, -1),
        })

        const html = generateMilestoneEmail(study.title, milestone, studyUrl)
        const result = await sendEmail({
          to: userEmail,
          subject: `Milestone: ${milestone} Responses - ${study.title}`,
          html,
          studyId: data.studyId,
        })

        if (result.success) {
          // Merge into the raw blob so keys this step doesn't model
          // (maxEmailsPerHour and friends) survive the write-back.
          await supabase
            .from('studies')
            .update({
              email_notification_settings: toJson({
                ...(rawSettings ?? {}),
                milestonesReached: [...settings.milestonesReached, ...crossed],
              }),
            })
            .eq('id', data.studyId)
        } else {
          logger.warn('Failed to send milestone email', { error: result.error })
        }
      }
    }

    if (settings.dailyDigest) {
      enqueue({
        topic: 'digest-queue-update',
        data: {
          studyId: data.studyId,
          userId: study.user_id,
        },
      }).catch(() => {})
    }

    // In-app response activity, rolled up per study per day.
    //
    // Unlike the email branches above this is NOT gated on
    // email_notification_settings: that blob governs what a study emails its
    // owner, while the inbox is governed by the per-user category preference
    // resolved inside send-notification. Grouping is what makes this safe to
    // emit on every response — a hundred submissions produce one row reading
    // "100 new responses", not a hundred lines.
    const day = new Date().toISOString().slice(0, 10)
    await notify(enqueue, {
      userId: study.user_id,
      type: 'analysis-complete',
      title: study.title || 'Study activity',
      message:
        totalResponses === 1
          ? `1 response so far in "${study.title}"`
          : `${totalResponses} responses so far in "${study.title}"`,
      studyId: data.studyId,
      groupKey: `response:${data.studyId}:${day}`,
      metadata: { projectId: study.project_id, totalResponses },
    })
  } catch (error) {
    logger.error('Error checking notification triggers', {
      error,
      studyId: data.studyId,
    })
  }
}
