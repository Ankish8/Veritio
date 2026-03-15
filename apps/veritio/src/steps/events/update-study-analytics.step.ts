import type { StepConfig } from 'motia'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'
import { calculateStudyStats, calculateProgress } from '../../services/analytics-service'

const inputSchema = z.object({
  studyId: z.string().uuid(),
  completedCount: z.number().optional(),
  targetCount: z.number().optional(),
})

export const config = {
  name: 'UpdateStudyAnalytics',
  description: 'Update real-time analytics and participant counts',
  triggers: [{
    type: 'queue',
    topic: 'study-continues',
    input: inputSchema as any,
  }],
  enqueues: ['study-analytics-updated'],
  flows: ['participation', 'results-analysis'],
} satisfies StepConfig

export const handler = async (input: z.infer<typeof inputSchema>, { logger, enqueue, streams }: EventHandlerContext) => {
  try {
    const data = inputSchema.parse(input)
    const supabase = getMotiaSupabaseClient()

    logger.info(`Updating analytics for study: ${data.studyId}`)

    const stats = await calculateStudyStats(supabase, data.studyId)

    const activityId = `${data.studyId}-stats-${Date.now()}`
    await (streams as any).participantActivity.set(data.studyId, activityId, {
      id: activityId,
      studyId: data.studyId,
      event: 'participant-completed',
      completedCount: stats.completedCount,
      inProgressCount: stats.inProgressCount,
      abandonedCount: stats.abandonedCount,
      timestamp: new Date().toISOString(),
      metadata: {
        targetCount: data.targetCount,
        progress: calculateProgress(stats.completedCount, data.targetCount),
      },
    })

    logger.info(`Analytics updated: ${stats.completedCount} completed, ${stats.inProgressCount} in progress`)

    enqueue({
      topic: 'study-analytics-updated',
      data: {
        studyId: data.studyId,
        stats,
        timestamp: new Date().toISOString(),
      },
    }).catch(() => {})
  } catch (error) {
    logger.error('UpdateStudyAnalytics failed', { error, input })
    // Don't re-throw: prevents infinite BullMQ retry on non-transient errors
  }
}
