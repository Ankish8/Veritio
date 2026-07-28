import type { StepConfig } from '@/lib/motia/types'
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
    // Atomic upsert-and-increment (see 20260728000000_fix_study_digest_queue).
    // The RPC isn't in the generated database types, so it needs the cast.
    const { error: rpcError } = await (supabase as any).rpc('increment_study_digest_queue', {
      p_study_id: data.studyId,
      p_user_id: data.userId,
    })

    if (rpcError) {
      // Undefined function: the migration hasn't been applied to this database
      // yet. Fall back to read-modify-write rather than losing the response.
      if (rpcError.code === '42883') {
        logger.warn('increment_study_digest_queue missing, falling back to read-modify-write', {
          studyId: data.studyId,
        })
        await incrementQueueRowUnsafe(supabase, data.studyId, data.userId)
      } else {
        logger.error('Failed to update digest queue', { error: rpcError, studyId: data.studyId })
        return
      }
    }

    logger.info('Digest queue updated', { studyId: data.studyId })
  } catch (error) {
    logger.error('Error updating digest queue', { error, studyId: data.studyId })
  }
}

/**
 * Pre-migration fallback. Racy by construction (two responses landing together
 * can read the same count), which is exactly why the RPC exists.
 */
async function incrementQueueRowUnsafe(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  studyId: string,
  userId: string
): Promise<void> {
  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from('study_digest_queue')
    .select('id, responses_count')
    .eq('study_id', studyId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('study_digest_queue')
      .update({ responses_count: existing.responses_count + 1, last_updated: now })
      .eq('id', existing.id)
    return
  }

  await supabase.from('study_digest_queue').insert({
    study_id: studyId,
    user_id: userId,
    responses_count: 1,
    responses_since: now,
    last_updated: now,
  })
}
