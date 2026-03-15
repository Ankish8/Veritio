import type { StepConfig } from 'motia'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'
import { responseSubmittedSchema } from '../../lib/events/schemas'

export const config = {
  name: 'ValidateResponse',
  description: 'Validate submitted response data and check for completeness',
  triggers: [{
    type: 'queue',
    topic: 'response-submitted',
  }],
  enqueues: ['response-validated'],
  flows: ['participation'],
} satisfies StepConfig

export const handler = async (input: z.infer<typeof responseSubmittedSchema>, { logger, enqueue }: EventHandlerContext) => {
  try {
    const data = responseSubmittedSchema.parse(input)
    const supabase = getMotiaSupabaseClient()

    logger.info(`Validating response for participant: ${data.participantId}`)

    if (data.studyType === 'card_sort') {
      const { data: response } = await supabase
        .from('card_sort_responses')
        .select('card_placements')
        .eq('participant_id', data.participantId)
        .single()

      const { count: cardCount } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('study_id', data.studyId)

      const placedCards = response?.card_placements
        ? Object.keys(response.card_placements as object).length
        : 0

      if (placedCards < (cardCount || 0)) {
        logger.warn(`Incomplete card sort response: ${placedCards}/${cardCount} cards placed`)
      }
    } else {
      const { count: responseCount } = await supabase
        .from('tree_test_responses')
        .select('*', { count: 'exact', head: true })
        .eq('participant_id', data.participantId)

      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('study_id', data.studyId)

      if ((responseCount || 0) < (taskCount || 0)) {
        logger.warn(`Incomplete tree test: ${responseCount}/${taskCount} tasks answered`)
      }
    }

    enqueue({
      topic: 'response-validated',
      data: {
        studyId: data.studyId,
        participantId: data.participantId,
        studyType: data.studyType,
        shareCode: data.shareCode,
      },
    }).catch(() => {})

    logger.info(`Response validated for participant: ${data.participantId}`)
  } catch (error) {
    logger.error('ValidateResponse failed', { error, input })
    // Don't re-throw: prevents infinite BullMQ retry on non-transient errors
  }
}
