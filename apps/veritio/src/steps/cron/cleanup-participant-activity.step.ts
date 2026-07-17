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
      .limit(1000) // Bound work per run; idempotent, so leftovers clear next run

    if (studiesError) {
      logger.error('Failed to fetch studies for participant activity cleanup', { error: studiesError })
      return
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const DELETE_CHUNK_SIZE = 20
    let deleted = 0

    for (const study of studies ?? []) {
      const entries = await (streams as any)?.participantActivity?.getGroup(study.id)
      const staleEntries = (entries ?? []).filter(
        (entry: any) => entry.data?.timestamp && entry.data.timestamp < cutoff
      )
      // Stream API exposes only a single delete; chunk the concurrent calls so a
      // large backlog doesn't fire hundreds of deletes at once.
      for (let i = 0; i < staleEntries.length; i += DELETE_CHUNK_SIZE) {
        await Promise.all(
          staleEntries
            .slice(i, i + DELETE_CHUNK_SIZE)
            .map((entry: any) => (streams as any).participantActivity.delete(study.id, entry.id))
        )
      }
      deleted += staleEntries.length
    }

    logger.info('Cleaned up participant activity stream', { deleted, studiesScanned: studies?.length ?? 0 })
  } catch (error) {
    logger.error('Error in cleanup participant activity cron', { error })
  }
}
