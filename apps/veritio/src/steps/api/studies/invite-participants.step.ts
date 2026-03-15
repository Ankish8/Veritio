import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import type { PanelStudyParticipationInsert } from '../../../lib/supabase/panel-types'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

const bodySchema = z.object({
  participant_ids: z.array(z.string().uuid()).min(1).max(1000),
  source: z.enum(['widget', 'link', 'email', 'direct']).optional().default('direct'),
})

export const config = {
  name: 'InviteParticipantsToStudy',
  description: 'Invite panel participants to a study',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/invite',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['panel-participants-invited'],
  flows: ['panel', 'studies'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId } = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body)

  logger.info('Inviting participants to study', {
    userId,
    studyId,
    participantCount: body.participant_ids.length
  })

  const supabase = getMotiaSupabaseClient()

  try {
    const { data: study, error: studyError } = await supabase
      .from('studies')
      .select('id, title, status')
      .eq('id', studyId)
      .eq('user_id', userId)
      .single()

    if (studyError || !study) {
      return {
        status: 404,
        body: { error: 'Study not found' },
      }
    }

    const { data: participants, error: participantsError } = await (supabase as any)
      .from('panel_participants')
      .select('id')
      .eq('user_id', userId)
      .in('id', body.participant_ids)

    if (participantsError) throw participantsError

    const validParticipantIds = new Set(participants?.map((p: any) => p.id) || [])
    const invalidIds = body.participant_ids.filter((id) => !validParticipantIds.has(id))

    if (invalidIds.length > 0) {
      return {
        status: 400,
        body: {
          error: 'Some participant IDs are invalid',
          invalid_ids: invalidIds,
        },
      }
    }

    const { data: existing } = await (supabase as any)
      .from('panel_study_participations')
      .select('panel_participant_id')
      .eq('study_id', studyId)
      .in('panel_participant_id', body.participant_ids)

    const existingIds = new Set(existing?.map((e: any) => e.panel_participant_id) || [])
    const newParticipantIds = body.participant_ids.filter((id) => !existingIds.has(id))

    if (newParticipantIds.length === 0) {
      return {
        status: 200,
        body: {
          invited: 0,
          skipped: body.participant_ids.length,
          message: 'All participants were already invited',
        },
      }
    }

    const now = new Date().toISOString()
    const insertData: PanelStudyParticipationInsert[] = newParticipantIds.map((participantId) => ({
      panel_participant_id: participantId,
      study_id: studyId,
      status: 'invited' as const,
      source: body.source,
    }))

     
    const { data: created, error: insertError } = await (supabase as any)
      .from('panel_study_participations')
      .insert(insertData)
      .select('id')

    if (insertError) throw insertError

    await (supabase as any)
      .from('panel_participants')
      .update({ last_contacted_at: now })
      .in('id', newParticipantIds)

    logger.info('Invited participants to study', {
      userId,
      studyId,
      invited: created?.length || 0,
      skipped: existingIds.size,
    })

    enqueue({
      topic: 'panel-participants-invited',
      data: {
        userId,
        studyId,
        studyTitle: study.title,
        participantIds: newParticipantIds,
        count: newParticipantIds.length,
        source: body.source,
      },
    }).catch(() => {})

    return {
      status: 200,
      body: {
        invited: created?.length || 0,
        skipped: existingIds.size,
        message: `Invited ${created?.length || 0} participants`,
      },
    }
  } catch (error) {
    logger.error('Failed to invite participants', {
      userId,
      studyId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return {
      status: 500,
      body: { error: 'Failed to invite participants' },
    }
  }
}
