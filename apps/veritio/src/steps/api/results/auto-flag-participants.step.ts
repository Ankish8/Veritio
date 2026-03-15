import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { autoFlagParticipants, summarizeFlags } from '../../../lib/algorithms/participant-flagging'

export const config = {
  name: 'AutoFlagParticipants',
  description: 'Automatically detect and flag quality issues in participant responses',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/participants/auto-flag',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    responseSchema: {
    200: z.object({
      success: z.boolean(),
      flaggedCount: z.number(),
      totalParticipants: z.number(),
      summary: z.any(),
    }) as any,
    400: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['participants-auto-flagged'],
  flows: ['results-analysis'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (
  req: ApiRequest,
  { logger, enqueue }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, study_type')
    .eq('id', params.studyId)
    .single()

  if (studyError || !study) {
    logger.warn('Study not found', { studyId: params.studyId })
    return {
      status: 404,
      body: { error: 'Study not found' },
    }
  }

  if (study.study_type !== 'card_sort') {
    logger.warn('Auto-flagging only for card sort studies', { studyId: params.studyId })
    return {
      status: 400,
      body: { error: 'Auto-flagging is only available for card sort studies' },
    }
  }

  // Fetch cards and responses in parallel — independent queries
  const [cardsResult, responsesResult] = await Promise.all([
    supabase
      .from('cards')
      .select('id, label')
      .eq('study_id', params.studyId),
    supabase
      .from('card_sort_responses')
      .select('id, participant_id, card_placements, total_time_ms')
      .eq('study_id', params.studyId),
  ])

  const { data: cards, error: cardsError } = cardsResult
  const { data: responses, error: responsesError } = responsesResult

  if (cardsError) {
    logger.error('Failed to fetch cards', {
      studyId: params.studyId,
      error: cardsError.message,
    })
    return {
      status: 500,
      body: { error: 'Failed to fetch study cards' },
    }
  }

  if (!cards || cards.length === 0) {
    logger.warn('No cards found for study', { studyId: params.studyId })
    return {
      status: 400,
      body: { error: 'Study has no cards to analyze' },
    }
  }

  if (responsesError) {
    logger.error('Failed to fetch responses', {
      studyId: params.studyId,
      error: responsesError.message,
    })
    return {
      status: 500,
      body: { error: 'Failed to fetch study responses' },
    }
  }

  if (!responses || responses.length === 0) {
    logger.info('No responses to flag', { studyId: params.studyId })
    const emptyFlags = { all_one_group: 0, each_own_group: 0, no_movement: 0, too_fast: 0, too_slow: 0 }
    return {
      status: 200,
      body: {
        success: true,
        flaggedCount: 0,
        totalParticipants: 0,
        summary: { totalParticipants: 0, flaggedParticipants: 0, flagCounts: emptyFlags },
      },
    }
  }

  logger.info('Running auto-flag algorithm', {
    studyId: params.studyId,
    responseCount: responses.length,
    cardCount: cards.length,
  })

  const typedResponses = responses.map(r => ({
    ...r,
    card_placements: (r.card_placements || {}) as Record<string, string>,
  }))
  const flagResults = autoFlagParticipants(typedResponses, cards)
  const summary = summarizeFlags(flagResults)

  const { error: deleteError } = await supabase
    .from('participant_analysis_flags')
    .delete()
    .eq('study_id', params.studyId)

  if (deleteError) {
    logger.error('Failed to clear old flags', {
      studyId: params.studyId,
      error: deleteError.message,
    })
    return {
      status: 500,
      body: { error: 'Failed to update participant flags' },
    }
  }

  const flagsToInsert = flagResults.flatMap((result) =>
    result.flags.map((flag) => ({
      participant_id: result.participantId,
      study_id: params.studyId,
      flag_type: flag.type,
      flag_reason: flag.reason,
      is_excluded: false,
    }))
  )

  if (flagsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('participant_analysis_flags')
      .insert(flagsToInsert)

    if (insertError) {
      logger.error('Failed to insert flags', {
        studyId: params.studyId,
        error: insertError.message,
      })
      return {
        status: 500,
        body: { error: 'Failed to save participant flags' },
      }
    }
  }

  logger.info('Auto-flagging completed', {
    studyId: params.studyId,
    flaggedCount: summary.flaggedParticipants,
    totalFlags: flagsToInsert.length,
  })

  enqueue({
    topic: 'participants-auto-flagged',
    data: {
      resourceType: 'participants',
      action: 'auto-flag',
      studyId: params.studyId,
      flaggedCount: summary.flaggedParticipants,
      totalParticipants: summary.totalParticipants,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: {
      success: true,
      flaggedCount: summary.flaggedParticipants,
      totalParticipants: summary.totalParticipants,
      summary,
    },
  }
}
