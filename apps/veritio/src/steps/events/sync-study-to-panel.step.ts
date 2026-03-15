import type { StepConfig } from 'motia'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { EventHandlerContext } from '../../lib/motia/types'
import type { ParticipantDemographicData } from '../../lib/supabase/study-flow-types'
import { responseSubmittedSchema } from '../../lib/events/schemas'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import { createPanelIncentiveService } from '../../services/panel/incentive-service'
import { createStudyCompletionSyncService } from '../../services/panel/study-completion-sync'

export const config = {
  name: 'SyncStudyToPanel',
  description: 'Sync study completion demographics to panel CRM',
  triggers: [
    { type: 'queue', topic: 'response-submitted' },
    { type: 'queue', topic: 'survey-completed' },
  ],
  enqueues: ['panel-study-synced'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (
  input: z.infer<typeof responseSubmittedSchema>,
  { logger, enqueue }: EventHandlerContext
) => {
  const data = responseSubmittedSchema.parse(input)
  const supabase = getMotiaSupabaseClient()

  logger.info('Processing study completion', {
    studyId: data.studyId,
    studyType: data.studyType,
    participantId: data.participantId,
  })

  try {
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('identifier_type, identifier_value, metadata, completed_at, started_at')
      .eq('id', data.participantId)
      .single()

    if (participantError || !participant) {
      logger.warn('Participant not found', {
        participantId: data.participantId,
        error: participantError?.message,
      })
      return
    }

    const metadata = participant.metadata as Record<string, unknown> | null
    const demographicData = metadata?.demographic_data as Record<string, unknown> | undefined

    const email = resolveEmail(participant.identifier_value, demographicData, metadata)
    if (!email) {
      logger.info('No email found, skipping panel sync', {
        participantId: data.participantId,
        identifierType: participant.identifier_type,
      })
      return
    }

    const { data: study, error: studyError } = await supabase
      .from('studies')
      .select('user_id, sharing_settings')
      .eq('id', data.studyId)
      .single()

    if (studyError || !study?.user_id) {
      logger.warn('Study or user not found', { studyId: data.studyId, error: studyError?.message })
      return
    }

    const sharingSettings = study.sharing_settings as Record<string, unknown> | null
    if (sharingSettings?.autoAddToPanel === false) {
      logger.info('Auto-add to panel disabled for study, skipping', { studyId: data.studyId })
      return
    }

    let completionTimeSeconds: number | undefined
    if (participant.completed_at && participant.started_at) {
      const completed = new Date(participant.completed_at as string)
      const started = new Date(participant.started_at as string)
      completionTimeSeconds = Math.round((completed.getTime() - started.getTime()) / 1000)
    }

    const syncService = createStudyCompletionSyncService(supabase)
    const result = await syncService.syncStudyToPanel({
      studyId: data.studyId,
      studyOwnerId: study.user_id,
      participantEmail: email,
      participantResponseId: data.participantId,
      demographicData: (demographicData as ParticipantDemographicData) || null,
      completionTimeSeconds,
    })

    if (!result.success) {
      logger.error('Sync failed', { email, error: result.error })
      return
    }

    logger.info('Successfully synced to panel', {
      email,
      participantCreated: result.participantCreated,
      participationCreated: result.participationCreated,
      demographicsUpdated: result.demographicsUpdated,
      panelParticipantId: result.panelParticipant?.id,
    })

    if (result.panelParticipant && result.participation) {
      await autoCreateIncentive(supabase, result.panelParticipant.id, data.studyId, result.participation.id, logger)
    }

    enqueue({
      topic: 'panel-study-synced',
      data: {
        studyId: data.studyId,
        participantId: data.participantId,
        panelParticipantId: result.panelParticipant?.id,
        participationId: result.participation?.id,
        participantCreated: result.participantCreated,
        participationCreated: result.participationCreated,
        demographicsUpdated: result.demographicsUpdated,
      },
    }).catch(() => {})
  } catch (error) {
    logger.error('Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      participantId: data.participantId,
    })
  }
}

function resolveEmail(
  identifierValue: string | null,
  demographicData: Record<string, unknown> | undefined,
  metadata: Record<string, unknown> | null,
): string | null {
  if (identifierValue && identifierValue.includes('@')) return identifierValue
  const fallback = (demographicData?.email as string) || (metadata?.email as string) || null
  return fallback && fallback.includes('@') ? fallback : null
}

async function autoCreateIncentive(
  supabase: SupabaseClient,
  panelParticipantId: string,
  studyId: string,
  participationId: string,
  logger: EventHandlerContext['logger'],
): Promise<void> {
  try {
    const incentiveService = createPanelIncentiveService(supabase)
    const distribution = await incentiveService.autoCreateOnCompletion(
      panelParticipantId,
      studyId,
      participationId,
    )
    if (distribution) {
      logger.info('Auto-created incentive distribution', {
        distributionId: distribution.id,
        amount: distribution.amount,
        currency: distribution.currency,
      })
    }
  } catch (err) {
    logger.warn('Failed to auto-create incentive', {
      error: err instanceof Error ? err.message : 'Unknown',
    })
  }
}
