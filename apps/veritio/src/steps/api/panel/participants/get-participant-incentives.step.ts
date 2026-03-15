import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import type { PanelIncentiveDistributionWithDetails } from '../../../../lib/supabase/panel-types'

const paramsSchema = z.object({
  participantId: z.string().uuid(),
})

export const config = {
  name: 'GetParticipantIncentives',
  description: 'Get all incentive distributions for a panel participant',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/panel/participants/:participantId/incentives',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const { participantId } = paramsSchema.parse(req.pathParams)

  logger.info('Getting participant incentives', { userId, organizationId, participantId })

  const supabase = getMotiaSupabaseClient()

  try {
    // Verify the participant belongs to this organization

    const { data: participant, error: participantError } = await (supabase as any)
      .from('panel_participants')
      .select('id, email, first_name, last_name')
      .eq('id', participantId)
      .eq('organization_id', organizationId)
      .single()

    if (participantError || !participant) {
      return {
        status: 404,
        body: { error: 'Participant not found' },
      }
    }

    // Get incentive distributions with study details
     
    const { data: distributions, error } = await (supabase as any)
      .from('panel_incentive_distributions')
      .select(`
        *,
        study:studies (
          id,
          title
        )
      `)
      .eq('panel_participant_id', participantId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform to match the expected type
    const result: PanelIncentiveDistributionWithDetails[] = (distributions || []).map((d: any) => ({
      ...d,
      panel_participant: {
        id: (participant as any).id,
        email: (participant as any).email,
        first_name: (participant as any).first_name,
        last_name: (participant as any).last_name,
      },
      study: d.study as {
        id: string
        title: string
      },
    }))

    logger.info('Fetched participant incentives', { userId, participantId, count: result.length })

    return {
      status: 200,
      body: result,
    }
  } catch (error) {
    logger.error('Failed to get participant incentives', {
      userId,
      participantId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return {
      status: 500,
      body: { error: 'Failed to get incentives' },
    }
  }
}
