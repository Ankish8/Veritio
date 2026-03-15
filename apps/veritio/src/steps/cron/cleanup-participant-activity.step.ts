import type { StepConfig } from 'motia'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'

export const config = {
  name: 'CleanupParticipantActivity',
  description: 'Delete participantActivity stream entries older than 24h',
  triggers: [{ type: 'cron', expression: '0 0 3 * * * *' }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (_input: unknown, { logger, streams }: EventHandlerContext) => {
  logger.info('Running cleanup participant activity stream cron job')

  try {
    const supabase = getMotiaSupabaseClient()

    const { data: studies, error: studiesError } = await supabase
      .from('studies')
      .select('id')
      .in('status', ['active', 'completed', 'paused'])

    if (studiesError) {
      logger.error('Failed to fetch studies for participant activity cleanup', { error: studiesError })
      return
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    let deleted = 0

    for (const study of studies ?? []) {
      const entries = await (streams as any)?.participantActivity?.getGroup(study.id)
      for (const entry of entries ?? []) {
        if (entry.data?.timestamp && entry.data.timestamp < cutoff) {
          await (streams as any).participantActivity.delete(study.id, entry.id)
          deleted++
        }
      }
    }

    logger.info('Cleaned up participant activity stream', { deleted, studiesScanned: studies?.length ?? 0 })
  } catch (error) {
    logger.error('Error in cleanup participant activity cron', { error })
  }
}
