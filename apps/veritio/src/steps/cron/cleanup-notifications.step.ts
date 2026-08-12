import type { StepConfig } from '@/lib/motia/types'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'

/**
 * Prune the notification inbox.
 *
 * Nothing prunes this table today. At current volume that is years away from
 * mattering, but an inbox that only ever grows eventually makes the unread
 * count query slow and the table expensive to keep — and it costs one cron
 * step now versus a cleanup under pressure later.
 *
 * Two windows: read notifications are noise after 90 days; unread ones get 180
 * before being dropped, since deleting something a person has never seen is
 * the more destructive of the two.
 *
 * Cron is the engine's 7-field form. Per CLAUDE.md, day-of-week must be `SUN`
 * rather than `0` — the engine rejects dow=0 — though this one runs daily.
 */

const READ_RETENTION_DAYS = 90
const UNREAD_RETENTION_DAYS = 180

export const config = {
  name: 'CleanupNotifications',
  description: 'Delete read notifications older than 90 days and any older than 180 days',
  triggers: [{
    type: 'cron',
    // 04:15 daily — off the hour to avoid piling onto the other crons.
    expression: '0 15 4 * * * *',
  }],
  enqueues: [],
  flows: ['notifications'],
} satisfies StepConfig

export const handler = async (_input: unknown, { logger }: EventHandlerContext) => {
  const supabase = getMotiaSupabaseClient()

  const readCutoff = new Date(Date.now() - READ_RETENTION_DAYS * 86400_000).toISOString()
  const allCutoff = new Date(Date.now() - UNREAD_RETENTION_DAYS * 86400_000).toISOString()

  try {
    const { count: readDeleted, error: readError } = await (supabase as any)
      .from('notifications')
      .delete({ count: 'exact' })
      .eq('read', true)
      .lt('created_at', readCutoff)

    if (readError) {
      logger.warn('Failed to prune read notifications', { error: readError.message })
    }

    const { count: oldDeleted, error: oldError } = await (supabase as any)
      .from('notifications')
      .delete({ count: 'exact' })
      .lt('created_at', allCutoff)

    if (oldError) {
      logger.warn('Failed to prune old notifications', { error: oldError.message })
    }

    logger.info('Notification retention pass complete', {
      readDeleted: readDeleted ?? 0,
      oldDeleted: oldDeleted ?? 0,
    })
  } catch (error) {
    logger.error('Notification cleanup failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
