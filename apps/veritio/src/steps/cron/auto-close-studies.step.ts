import type { StepConfig } from 'motia'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'

export const config = {
  name: 'CheckParticipantLimits',
  description: 'Check studies with participant count limits (date-based closures use scheduled events)',
  triggers: [{ type: 'cron', expression: '0 */30 * * * * *' }],
  enqueues: ['study-auto-close'],
  flows: ['study-lifecycle'],
} satisfies StepConfig

export const handler = async (_input: unknown, { logger, enqueue }: EventHandlerContext) => {
  const supabase = getMotiaSupabaseClient()

  logger.info('Checking participant limits for active studies')

  try {
    // Fetch studies directly — skip redundant count query
    const { data: studies, error: studiesError } = await supabase
      .from('studies')
      .select('id, title, user_id, closing_rule')
      .eq('status', 'active')
      .not('closing_rule', 'is', null)

    if (studiesError) {
      logger.error('Failed to fetch studies', { error: studiesError })
      return
    }

    if (!studies || studies.length === 0) {
      logger.info('No active studies with closing rules found')
      return
    }

    // Filter to studies with participant_count rules
    const countStudies = studies.filter((study) => {
      const closingRule = study.closing_rule as {
        type?: 'none' | 'date' | 'participant_count' | 'both'
        maxParticipants?: number
      } | null
      return closingRule &&
        (closingRule.type === 'participant_count' || closingRule.type === 'both') &&
        closingRule.maxParticipants
    })

    if (countStudies.length === 0) {
      logger.info('No active studies with participant count limits')
      return
    }

    // Batch: get completed participant counts for ALL studies in one query
    const studyIds = countStudies.map((s) => s.id)
    const { data: countRows, error: countError } = await supabase
      .rpc('get_completed_participant_counts' as any, { study_ids: studyIds })

    // Fallback: if RPC doesn't exist, use single query with group
    let completedCounts: Map<string, number>

    if (countError) {
      // Fallback: single query, count in JS
      const { data: participants } = await supabase
        .from('participants')
        .select('study_id')
        .in('study_id', studyIds)
        .eq('status', 'completed')

      completedCounts = new Map()
      for (const p of participants || []) {
        completedCounts.set(p.study_id, (completedCounts.get(p.study_id) || 0) + 1)
      }
    } else {
      completedCounts = new Map(
        (countRows || []).map((r: { study_id: string; count: number }) => [r.study_id, r.count])
      )
    }

    let emittedCount = 0

    for (const study of countStudies) {
      const closingRule = study.closing_rule as {
        maxParticipants: number
      }
      const completedCount = completedCounts.get(study.id) || 0

      if (completedCount >= closingRule.maxParticipants) {
        logger.info('Participant limit reached, emitting auto-close event', {
          studyId: study.id,
          completedCount,
          maxParticipants: closingRule.maxParticipants,
        })

        enqueue({
          topic: 'study-auto-close',
          data: {
            studyId: study.id,
            reason: 'participant_count',
          },
        }).catch(() => {})

        emittedCount++
      }
    }

    logger.info('Participant limit check completed', { emittedCount })
  } catch (error) {
    logger.error('Error checking participant limits', { error })
  }
}
