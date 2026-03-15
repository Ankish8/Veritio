import type { StepConfig } from 'motia'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { Json } from '@veritio/study-types'
import type { EventHandlerContext } from '../../lib/motia/types'

export const config = {
  name: 'CleanupExpiredResumeTokens',
  description: 'Clean up expired resume tokens from participant metadata (7-day expiry)',
  triggers: [{ type: 'cron', expression: '0 0 3 * * * *' }],
  enqueues: [],
  flows: ['study-lifecycle'],
} satisfies StepConfig

const RESUME_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

interface ParticipantMetadata {
  resume_email?: string
  resume_requested_at?: string
  [key: string]: unknown
}

export const handler = async (_input: unknown, { logger }: EventHandlerContext) => {
  const supabase = getMotiaSupabaseClient()

  logger.info('Running cleanup expired resume tokens cron job')

  try {
    const cutoffTime = new Date(Date.now() - RESUME_TOKEN_EXPIRY_MS).toISOString()

    const { data: participantsWithTokens, error: fetchError } = await supabase
      .from('participants')
      .select('id, metadata')
      .not('metadata', 'is', null)
      .not('metadata->resume_requested_at', 'is', null)

    if (fetchError) {
      logger.error('Failed to fetch participants with resume tokens', { error: fetchError })
      return
    }

    if (!participantsWithTokens || participantsWithTokens.length === 0) {
      logger.info('No participants with resume tokens found, exiting early')
      return
    }

    const expiredParticipants = participantsWithTokens.filter((p) => {
      const metadata = p.metadata as ParticipantMetadata | null
      if (!metadata?.resume_requested_at) return false

      const requestedAt = new Date(metadata.resume_requested_at)
      return requestedAt < new Date(cutoffTime)
    })

    if (expiredParticipants.length === 0) {
      logger.info('No expired resume tokens found')
      return
    }

    logger.info(`Found ${expiredParticipants.length} participants with expired resume tokens (out of ${participantsWithTokens.length} with tokens)`)

    let cleanedCount = 0
    let errorCount = 0

    for (const participant of expiredParticipants) {
      const metadata = participant.metadata as ParticipantMetadata

      const { resume_email: _email, resume_requested_at: _requestedAt, ...cleanedMetadata } = metadata

      const { error: updateError } = await supabase
        .from('participants')
        .update({ metadata: cleanedMetadata as Json })
        .eq('id', participant.id)

      if (updateError) {
        logger.warn('Failed to clean up participant resume token', {
          participantId: participant.id,
          error: updateError,
        })
        errorCount++
      } else {
        cleanedCount++
      }
    }

    logger.info('Cleanup completed', {
      cleaned: cleanedCount,
      errors: errorCount,
      total: expiredParticipants.length,
    })
  } catch (error) {
    logger.error('Error in cleanup expired resume tokens cron', { error })
  }
}
