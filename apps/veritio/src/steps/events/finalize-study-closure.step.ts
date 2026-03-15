import type { StepConfig } from 'motia'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'

const inputSchema = z.object({
  studyId: z.string().uuid(),
  reason: z.string(),
  completedCount: z.number(),
})

export const config = {
  name: 'FinalizeStudyClosure',
  description: 'Finalize study closure and trigger results analysis',
  triggers: [{
    type: 'queue',
    topic: 'study-should-close',
    input: inputSchema as any,
  }],
  enqueues: ['results-analysis-requested', 'notification'],
  flows: ['study-lifecycle', 'results-analysis'],
} satisfies StepConfig

export const handler = async (input: z.infer<typeof inputSchema>, { logger, enqueue, streams }: EventHandlerContext) => {
  try {
    const data = inputSchema.parse(input)
    const supabase = getMotiaSupabaseClient()

    logger.info(`Finalizing study closure: ${data.studyId}, reason: ${data.reason}`)

    const { data: study } = await supabase
      .from('studies')
      .select('id, title, study_type, user_id')
      .eq('id', data.studyId)
      .single()

    if (!study) {
      logger.warn(`Study not found for closure: ${data.studyId}`)
      return
    }

    const activityId = `${data.studyId}-closed-${Date.now()}`
    await (streams as any).participantActivity.set(data.studyId, activityId, {
      id: activityId,
      studyId: data.studyId,
      event: 'study-closed',
      completedCount: data.completedCount,
      reason: data.reason,
      timestamp: new Date().toISOString(),
    })

    enqueue({
      topic: 'results-analysis-requested',
      data: {
        studyId: data.studyId,
        studyType: study.study_type,
        priority: 'high',
      },
    }).catch(() => {})

    logger.info(`Study ${data.studyId} closed, results analysis requested`)
  } catch (error) {
    logger.error('FinalizeStudyClosure failed', { error, input })
    // Don't re-throw: prevents infinite BullMQ retry on non-transient errors
  }
}
