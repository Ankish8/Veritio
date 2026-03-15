import type { StepConfig } from 'motia'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'

export const config = {
  name: 'CleanupAbandonedParticipants',
  description: 'Mark stale in-progress participants as abandoned after 24 hours',
  triggers: [{ type: 'cron', expression: '0 0 * * * * *' }],
  enqueues: [],
  flows: ['study-lifecycle'],
} satisfies StepConfig

// Time after which an in-progress participant is considered abandoned (1 hour)
const ABANDONMENT_THRESHOLD_MS = 1 * 60 * 60 * 1000

export const handler = async (_input: unknown, { logger }: EventHandlerContext) => {
  const supabase = getMotiaSupabaseClient()

  logger.info('Running cleanup abandoned participants cron job')

  try {
    const cutoffTime = new Date(Date.now() - ABANDONMENT_THRESHOLD_MS).toISOString()

    const { count: staleCount } = await supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'in_progress')
      .lt('started_at', cutoffTime)

    if (!staleCount || staleCount === 0) {
      logger.info('No stale participants found, exiting early')
      return
    }

    logger.info(`Found ${staleCount} stale participants, fetching details`)

    const { data: staleParticipants, error: fetchError } = await supabase
      .from('participants')
      .select('id, study_id, started_at')
      .eq('status', 'in_progress')
      .lt('started_at', cutoffTime)

    if (fetchError) {
      logger.error('Failed to fetch stale participants', { error: fetchError })
      return
    }

    if (!staleParticipants || staleParticipants.length === 0) {
      logger.info('No stale participants found')
      return
    }

    logger.info(`Found ${staleParticipants.length} stale participants to mark as abandoned`)

    const participantIds = staleParticipants.map((p) => p.id)

    const { error: updateError } = await supabase
      .from('participants')
      .update({
        status: 'abandoned',
        completed_at: new Date().toISOString(),
      })
      .in('id', participantIds)

    if (updateError) {
      logger.error('Failed to update participants', { error: updateError })
      return
    }

    const { error: panelUpdateError } = await (supabase as any)
      .from('panel_study_participations')
      .update({
        status: 'abandoned',
      })
      .in('participant_id', participantIds)
      .eq('status', 'started')

    if (panelUpdateError) {
      logger.warn('Failed to update panel participations', { error: panelUpdateError })
    }

    const studyCounts = new Map<string, number>()
    for (const p of staleParticipants) {
      studyCounts.set(p.study_id, (studyCounts.get(p.study_id) || 0) + 1)
    }

    for (const [studyId, count] of studyCounts) {
      logger.info(`Marked ${count} participants as abandoned for study ${studyId}`)
    }

    logger.info(`Cleanup completed: ${staleParticipants.length} participants marked as abandoned`)
  } catch (error) {
    logger.error('Error in cleanup abandoned participants cron', { error })
  }
}
