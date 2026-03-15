import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import type { PanelStudyParticipationWithDetails } from '../../../../lib/supabase/panel-types'

const paramsSchema = z.object({
  participantId: z.string().uuid(),
})

export const config = {
  name: 'GetParticipantParticipations',
  description: 'Get all study participations for a panel participant',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/panel/participants/:participantId/participations',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const { participantId } = paramsSchema.parse(req.pathParams)

  logger.info('Getting participant participations', { userId, organizationId, participantId })

  const supabase = getMotiaSupabaseClient()

  try {
    // Verify the participant belongs to this organization

    const { data: participant, error: participantError } = await (supabase as any)
      .from('panel_participants')
      .select('id')
      .eq('id', participantId)
      .eq('organization_id', organizationId)
      .single()

    if (participantError || !participant) {
      return {
        status: 404,
        body: { error: 'Participant not found' },
      }
    }

    // Get participations with study details and study participant metadata (for browser data)
     
    const { data: participations, error } = await (supabase as any)
      .from('panel_study_participations')
      .select(`
        *,
        study:studies (
          id,
          title,
          study_type,
          status,
          project_id
        ),
        participant:participants (
          id,
          metadata,
          country,
          region,
          city
        )
      `)
      .eq('panel_participant_id', participantId)
      .order('invited_at', { ascending: false })

    if (error) throw error

    // Transform to match the expected type
    const result: PanelStudyParticipationWithDetails[] = (participations || []).map((p: any) => ({
      ...p,
      panel_participant: {
        id: participantId,
        email: '',
        first_name: null,
        last_name: null,
      },
      study: p.study as {
        id: string
        title: string
        study_type: string
        status: string
        project_id: string
      },
      // Include study participant data with browser info
      study_participant: p.participant ? {
        id: p.participant.id,
        metadata: p.participant.metadata,
        country: p.participant.country,
        region: p.participant.region,
        city: p.participant.city,
      } : null,
    }))

    logger.info('Fetched participant participations', { userId, participantId, count: result.length })

    return {
      status: 200,
      body: result,
    }
  } catch (error) {
    logger.error('Failed to get participant participations', {
      userId,
      participantId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return {
      status: 500,
      body: { error: 'Failed to get participations' },
    }
  }
}
