import type { StepConfig } from 'motia'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import { toJson } from '../../lib/supabase/json-utils'
import type { EventHandlerContext } from '../../lib/motia/types'
import type { NotificationSettings } from '../../components/builders/shared/types'
import { getUserEmail } from '../../services/user-service'
import {
  sendEmail,
  generateResponseReceivedEmail,
  generateMilestoneEmail,
} from '../../services/email-service'
import { responseSubmittedSchema } from '../../lib/events/schemas'

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
      .select('id, title, user_id, email_notification_settings')
      .eq('id', data.studyId)
      .single()

    if (studyError || !study) {
      logger.warn('Study not found for notifications', { studyId: data.studyId })
      return
    }

    const settings = study.email_notification_settings as NotificationSettings | null

    if (!settings?.enabled) {
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://veritio.io'
    const studyUrl = `${baseUrl}/dashboard/studies/${data.studyId}/results`

    if (settings.triggers.everyResponse) {
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

    if (settings.triggers.milestones.enabled) {
      const enabledMilestones = settings.triggers.milestones.values
      const reachedMilestones = settings.milestonesReached || []

      for (const milestone of enabledMilestones) {
        if (totalResponses === milestone && !reachedMilestones.includes(milestone)) {
          logger.info('Milestone reached, sending notification', {
            studyId: data.studyId,
            milestone,
          })

          const html = generateMilestoneEmail(study.title, milestone, studyUrl)
          const result = await sendEmail({
            to: userEmail,
            subject: `Milestone: ${milestone} Responses - ${study.title}`,
            html,
            studyId: data.studyId,
          })

          if (result.success) {
            const updatedSettings: NotificationSettings = {
              ...settings,
              milestonesReached: [...reachedMilestones, milestone],
            }

            await supabase
              .from('studies')
              .update({ email_notification_settings: toJson(updatedSettings) })
              .eq('id', data.studyId)
          } else {
            logger.warn('Failed to send milestone email', { error: result.error })
          }
        }
      }
    }

    if (settings.triggers.dailyDigest) {
      enqueue({
        topic: 'digest-queue-update',
        data: {
          studyId: data.studyId,
          userId: study.user_id,
        },
      }).catch(() => {})
    }
  } catch (error) {
    logger.error('Error checking notification triggers', {
      error,
      studyId: data.studyId,
    })
  }
}
