import type { StepConfig } from 'motia'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'

export const config = {
  name: 'ArchiveOldData',
  description: 'Archive old recordings and abandoned participants',
  triggers: [{ type: 'cron', expression: '0 0 4 * * 0 *' }],
  enqueues: [],
  flows: ['maintenance'],
} satisfies StepConfig

export const handler = async (_input: unknown, { logger }: EventHandlerContext) => {
  const supabase = getMotiaSupabaseClient()

  const [recordingsResult, participantsResult] = await Promise.all([
    supabase.rpc('archive_old_recordings' as any),
    supabase.rpc('archive_abandoned_participants' as any),
  ])

  if (recordingsResult.error || participantsResult.error) {
    logger.error('Failed to archive data', {
      recordingsError: recordingsResult.error,
      participantsError: participantsResult.error,
    })
    return
  }

  logger.info('Archived data', {
    recordings: recordingsResult.data ?? 0,
    participants: participantsResult.data ?? 0,
  })
}
