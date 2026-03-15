import type { StepConfig } from 'motia'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'

const inputSchema = z.object({
  studyId: z.string().uuid(),
  participantId: z.string().uuid(),
  shareCode: z.string(),
})

export const config = {
  name: 'TrackParticipantStarted',
  description: 'Track when a participant starts a study for analytics',
  triggers: [{
    type: 'queue',
    topic: 'participant-started',
    input: inputSchema as any,
  }],
  enqueues: ['participant-activity'],
  flows: ['participation'],
} satisfies StepConfig

export const handler = async (input: z.infer<typeof inputSchema>, { logger, streams }: EventHandlerContext) => {
  const data = inputSchema.parse(input)
  const supabase = getMotiaSupabaseClient()

  logger.info(`Tracking participant start: ${data.participantId}`)

  const { count: inProgressCount } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('study_id', data.studyId)
    .eq('status', 'in_progress')

  await linkParticipantToPanel(supabase, data.studyId, data.participantId, logger)

  const activityId = `${data.studyId}-start-${Date.now()}`
  await (streams as any).participantActivity.set(data.studyId, activityId, {
    id: activityId,
    studyId: data.studyId,
    event: 'participant-started',
    participantId: data.participantId,
    inProgressCount: inProgressCount || 0,
    timestamp: new Date().toISOString(),
  })

  logger.info(`Participant ${data.participantId} start tracked, ${inProgressCount} now in progress`)
}

async function linkParticipantToPanel(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  studyId: string,
  participantId: string,
  logger: any
): Promise<void> {
  try {
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('identifier_type, identifier_value, url_tags')
      .eq('id', participantId)
      .single()

    if (participantError || !participant) {
      return
    }

    const urlTags = participant.url_tags as Record<string, string> | null
    if (urlTags?.pp) {
      const panelParticipantId = urlTags.pp

      const { data: participation, error: participationError } = await (supabase as any)
        .from('panel_study_participations')
        .select('id, status')
        .eq('panel_participant_id', panelParticipantId)
        .eq('study_id', studyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!participationError && participation) {
        const updates: Record<string, unknown> = {
          participant_id: participantId,
        }

        if ((participation as any).status === 'invited') {
          updates.status = 'started'
          updates.started_at = new Date().toISOString()
        }

        await (supabase as any)
          .from('panel_study_participations')
          .update(updates)
          .eq('id', (participation as any).id)

        logger.info('Linked participant to panel participation via pp tag', {
          participantId,
          panelParticipantId,
          participationId: (participation as any).id,
        })
        return
      }
    }

    if (participant.identifier_type !== 'email' || !participant.identifier_value) {
      return
    }

    const email = participant.identifier_value.toLowerCase()

    const { data: study, error: studyError } = await supabase
      .from('studies')
      .select('user_id')
      .eq('id', studyId)
      .single()

    if (studyError || !study) {
      return
    }

    const { data: panelParticipant, error: panelError } = await (supabase as any)
      .from('panel_participants')
      .select('id')
      .eq('user_id', (study as any).user_id)
      .eq('email', email)
      .single()

    if (panelError || !panelParticipant) {
      return
    }

    const { data: participation, error: participationError } = await (supabase as any)
      .from('panel_study_participations')
      .select('id, status')
      .eq('panel_participant_id', (panelParticipant as any).id)
      .eq('study_id', studyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (participationError || !participation) {
      return
    }

    const updates: Record<string, unknown> = {
      participant_id: participantId,
    }

    if ((participation as any).status === 'invited') {
      updates.status = 'started'
      updates.started_at = new Date().toISOString()
    }

    await (supabase as any)
      .from('panel_study_participations')
      .update(updates)
      .eq('id', (participation as any).id)

    logger.info('Linked participant to panel participation via email', {
      participantId,
      panelParticipantId: (panelParticipant as any).id,
      participationId: (participation as any).id,
    })
  } catch {
    // Non-blocking
  }
}
