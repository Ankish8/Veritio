import type { StepConfig } from 'motia'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'

const inputSchema = z.object({
  studyId: z.string().uuid(),
  reason: z.enum(['date', 'participant_count']),
})

export const config = {
  name: 'HandleStudyAutoClose',
  description: 'Handles automatic study closure when scheduled time arrives',
  triggers: [{
    type: 'queue',
    topic: 'study-auto-close',
    input: inputSchema as any,
  }],
  enqueues: ['notification', 'study-closed'],
  flows: ['study-lifecycle'],
} satisfies StepConfig

export const handler = async (
  input: z.infer<typeof inputSchema>,
  { enqueue, logger }: EventHandlerContext
) => {
  const result = inputSchema.safeParse(input)
  if (!result.success) {
    logger.error('Invalid input for study auto-close', { issues: result.error.issues })
    return
  }

  const { studyId, reason } = result.data
  const supabase = getMotiaSupabaseClient()

  logger.info('Processing scheduled study auto-close', { studyId, reason })

  const { data: study, error } = await supabase
    .from('studies')
    .select('id, title, user_id, status')
    .eq('id', studyId)
    .single()

  if (error || !study) {
    logger.error('Study not found for auto-close', { studyId, error: error?.message })
    return
  }

  // Skip if already closed (idempotency)
  if (study.status !== 'active') {
    logger.info('Study already closed, skipping auto-close', {
      studyId,
      currentStatus: study.status,
    })
    return
  }

  const { error: updateError } = await supabase
    .from('studies')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', studyId)

  if (updateError) {
    logger.error('Failed to close study', { studyId, error: updateError.message })
    throw new Error(`Failed to close study: ${updateError.message}`)
  }

  const reasonMessage =
    reason === 'date' ? 'closing date reached' : 'participant limit reached'

  enqueue({
    topic: 'notification',
    data: {
      userId: study.user_id,
      type: 'study-auto-closed',
      title: 'Study automatically closed',
      message: `Your study "${study.title}" has been automatically closed: ${reasonMessage}.`,
      studyId,
    },
  }).catch(() => {})

  enqueue({
    topic: 'study-closed',
    data: {
      studyId,
      reason,
      automatic: true,
      previousStatus: 'active',
    },
  }).catch(() => {})

  logger.info('Study auto-closed successfully', { studyId, reason })
}
