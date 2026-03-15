import type { StepConfig } from 'motia'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'

const inputSchema = z.object({
  studyId: z.string().uuid(),
  userId: z.string(),
})

export const config = {
  name: 'UpdateDigestQueue',
  description: 'Queue study responses for daily digest emails',
  triggers: [{
    type: 'queue',
    topic: 'digest-queue-update',
    input: inputSchema as any,
  }],
  enqueues: [],
  flows: ['notifications'],
} satisfies StepConfig

export const handler = async (
  input: z.infer<typeof inputSchema>,
  { logger }: EventHandlerContext
) => {
  const data = inputSchema.parse(input)
  const supabase = getMotiaSupabaseClient()

  logger.info('Updating digest queue', { studyId: data.studyId })

  try {
    const { data: existing } = await supabase
      .from('study_digest_queue')
      .select('id, responses_count')
      .eq('study_id', data.studyId)
      .single()

    if (existing) {
      await supabase
        .from('study_digest_queue')
        .update({
          responses_count: existing.responses_count + 1,
          last_updated: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('study_digest_queue').insert({
        study_id: data.studyId,
        user_id: data.userId,
        responses_count: 1,
        responses_since: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      })
    }

    logger.info('Digest queue updated', { studyId: data.studyId })
  } catch (error) {
    logger.error('Error updating digest queue', { error, studyId: data.studyId })
  }
}
