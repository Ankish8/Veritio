import type { StepConfig } from '@/lib/motia/types'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import { buildStudyResultsUrl } from '../../lib/email/study-links'
import { getUserEmail } from '../../services/user-service'
import { sendEmail, generateDailyDigestEmail } from '../../services/email-service'
import { normalizeNotificationSettings } from '../../services/study-notification-service'

export const config = {
  name: 'SendDailyDigest',
  description: 'Send one digest email per researcher for studies with daily digest enabled',
  // 09:00 daily, in the engine's timezone (UTC in production).
  triggers: [{ type: 'cron', expression: '0 0 9 * * * *' }],
  enqueues: [],
  flows: ['notifications'],
} satisfies StepConfig

/** Studies counted concurrently, so a large digest run doesn't fan out unbounded. */
const COUNT_CHUNK_SIZE = 8

/** Queue rows deleted per request; the id list travels in the query string. */
const DELETE_CHUNK_SIZE = 200

interface DigestEntry {
  rowId: string
  title: string
  newResponses: number
  totalResponses: number
  url: string
}

export const handler = async (_input: unknown, { logger }: EventHandlerContext) => {
  const supabase = getMotiaSupabaseClient()

  logger.info('Running daily digest cron')

  try {
    const { data: queued, error: queueError } = await supabase
      .from('study_digest_queue')
      .select('id, study_id, user_id, responses_count')
      .gt('responses_count', 0)

    if (queueError) {
      logger.error('Failed to read digest queue', { error: queueError })
      return
    }

    if (!queued || queued.length === 0) {
      logger.info('Digest queue empty, nothing to send')
      return
    }

    const { data: studies, error: studiesError } = await supabase
      .from('studies')
      .select('id, title, project_id, user_id, email_notification_settings')
      .in(
        'id',
        queued.map((row) => row.study_id)
      )

    if (studiesError) {
      logger.error('Failed to load studies for digest', { error: studiesError })
      return
    }

    const studyById = new Map((studies ?? []).map((study) => [study.id, study]))

    // Rows whose study vanished, lost its owner, or had the digest toggle
    // turned off since the response arrived are dropped: without this the
    // queue accumulates rows that can never be delivered.
    const dropRowIds: string[] = []
    const pending: Array<{
      rowId: string
      newResponses: number
      userId: string
      study: NonNullable<ReturnType<typeof studyById.get>>
    }> = []

    for (const row of queued) {
      const study = studyById.get(row.study_id)
      if (!study) {
        dropRowIds.push(row.id)
        continue
      }

      const settings = normalizeNotificationSettings(study.email_notification_settings)
      if (!settings.enabled || !settings.dailyDigest) {
        dropRowIds.push(row.id)
        continue
      }

      const userId = row.user_id || study.user_id
      if (!userId) {
        dropRowIds.push(row.id)
        continue
      }

      pending.push({ rowId: row.id, newResponses: row.responses_count, userId, study })
    }

    if (pending.length === 0) {
      await deleteQueueRows(supabase, dropRowIds, logger)
      logger.info('No studies with digest enabled', { dropped: dropRowIds.length })
      return
    }

    const totalsByStudy = new Map<string, number>()
    for (let i = 0; i < pending.length; i += COUNT_CHUNK_SIZE) {
      const chunk = pending.slice(i, i + COUNT_CHUNK_SIZE)
      await Promise.all(
        chunk.map(async ({ study }) => {
          const { count } = await supabase
            .from('participants')
            .select('*', { count: 'exact', head: true })
            .eq('study_id', study.id)
            .eq('status', 'completed')
          totalsByStudy.set(study.id, count || 0)
        })
      )
    }

    const entriesByUser = new Map<string, DigestEntry[]>()
    for (const { rowId, newResponses, userId, study } of pending) {
      const entries = entriesByUser.get(userId) ?? []
      entries.push({
        rowId,
        title: study.title,
        newResponses,
        totalResponses: totalsByStudy.get(study.id) ?? newResponses,
        url: buildStudyResultsUrl(study.project_id, study.id),
      })
      entriesByUser.set(userId, entries)
    }

    const deliveredRowIds: string[] = [...dropRowIds]
    let sentCount = 0

    for (const [userId, entries] of entriesByUser) {
      const userEmail = await getUserEmail(userId)

      if (!userEmail) {
        logger.warn('No email for digest recipient, dropping queued rows', { userId })
        deliveredRowIds.push(...entries.map((entry) => entry.rowId))
        continue
      }

      const html = generateDailyDigestEmail(
        entries.map((entry) => ({
          title: entry.title,
          newResponses: entry.newResponses,
          totalResponses: entry.totalResponses,
          url: entry.url,
        }))
      )

      // Deliberately no studyId: the digest covers several studies and is
      // capped at one per user per day, so it must not compete for any single
      // study's hourly response-email budget.
      const result = await sendEmail({
        to: userEmail,
        subject: 'Your daily Veritio digest',
        html,
      })

      if (result.success) {
        sentCount++
        deliveredRowIds.push(...entries.map((entry) => entry.rowId))
      } else {
        // Leave the rows queued: tomorrow's run reports the accumulated count
        // instead of silently losing a day of activity.
        logger.warn('Failed to send daily digest', { userId, error: result.error })
      }
    }

    await deleteQueueRows(supabase, deliveredRowIds, logger)

    logger.info('Daily digest completed', {
      recipients: entriesByUser.size,
      sent: sentCount,
      studies: pending.length,
      dropped: dropRowIds.length,
    })
  } catch (error) {
    logger.error('Error in daily digest cron', { error })
  }
}

async function deleteQueueRows(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  rowIds: string[],
  logger: EventHandlerContext['logger']
): Promise<void> {
  for (let i = 0; i < rowIds.length; i += DELETE_CHUNK_SIZE) {
    const chunk = rowIds.slice(i, i + DELETE_CHUNK_SIZE)
    const { error } = await supabase.from('study_digest_queue').delete().in('id', chunk)
    if (error) {
      logger.warn('Failed to clear digest queue rows', { count: chunk.length, error })
    }
  }
}
