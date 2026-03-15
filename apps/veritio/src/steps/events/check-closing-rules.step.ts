import type { StepConfig } from 'motia'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'
import { responseValidatedSchema } from '../../lib/events/schemas'

export const config = {
  name: 'CheckClosingRules',
  description: 'Check if study should be auto-closed based on participant count or date',
  triggers: [{
    type: 'queue',
    topic: 'response-validated',
  }],
  enqueues: ['study-should-close', 'study-continues', 'notification'],
  flows: ['participation', 'study-lifecycle'],
} satisfies StepConfig

export const handler = async (input: z.infer<typeof responseValidatedSchema>, { logger, enqueue }: EventHandlerContext) => {
  try {
    const data = responseValidatedSchema.parse(input)
    const supabase = getMotiaSupabaseClient()

    logger.info(`Checking closing rules for study: ${data.studyId}`)

    const { data: study } = await supabase
      .from('studies')
      .select('id, title, status, closing_rule, user_id')
      .eq('id', data.studyId)
      .single()

    if (!study || study.status !== 'active') {
      return
    }

    const closingRule = study.closing_rule as {
      type?: 'none' | 'date' | 'participant_count' | 'both'
      closeDate?: string
      maxParticipants?: number
    } | null

    if (!closingRule || closingRule.type === 'none') {
      enqueue({
        topic: 'study-continues',
        data: { studyId: data.studyId },
        messageGroupId: data.studyId,
      }).catch(() => {})
      return
    }

    const { count: completedCount } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('study_id', data.studyId)
      .eq('status', 'completed')

    let shouldClose = false
    let reason = ''

    if (
      (closingRule.type === 'participant_count' || closingRule.type === 'both') &&
      closingRule.maxParticipants &&
      (completedCount || 0) >= closingRule.maxParticipants
    ) {
      shouldClose = true
      reason = `Reached ${closingRule.maxParticipants} participants`
    }

    if (
      (closingRule.type === 'date' || closingRule.type === 'both') &&
      closingRule.closeDate
    ) {
      const closeDate = new Date(closingRule.closeDate)
      if (new Date() >= closeDate) {
        shouldClose = true
        reason = reason ? `${reason} and reached closing date` : 'Reached closing date'
      }
    }

    if (shouldClose) {
      logger.info(`Study ${data.studyId} should close: ${reason}`)

      // Atomic compare-and-swap: only succeeds if study is still active.
      // Prevents duplicate closure when concurrent participants both trigger this handler.
      const { data: updatedRows } = await supabase
        .from('studies')
        .update({ status: 'completed' })
        .eq('id', data.studyId)
        .eq('status', 'active')
        .select('id')

      if (!updatedRows || updatedRows.length === 0) {
        logger.info(`Study ${data.studyId} already closed by concurrent handler, skipping`)
        return
      }

      enqueue({
        topic: 'study-should-close',
        data: {
          studyId: data.studyId,
          reason,
          completedCount: completedCount || 0,
        },
      }).catch(() => {})

      enqueue({
        topic: 'notification',
        data: {
          userId: study.user_id,
          type: 'study-auto-closed',
          title: 'Study Completed',
          message: `"${study.title}" has been automatically closed. ${reason}.`,
          studyId: data.studyId,
        },
      }).catch(() => {})
    } else {
      enqueue({
        topic: 'study-continues',
        data: {
          studyId: data.studyId,
          completedCount: completedCount || 0,
          targetCount: closingRule.maxParticipants,
        },
        messageGroupId: data.studyId,
      }).catch(() => {})
    }
  } catch (error) {
    logger.error('CheckClosingRules failed', { error, input })
    // Don't re-throw: prevents infinite BullMQ retry on non-transient errors
  }
}
