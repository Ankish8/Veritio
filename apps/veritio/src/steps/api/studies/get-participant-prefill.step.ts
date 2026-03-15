import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { sessionAuthMiddleware } from '../../../middlewares/session-auth.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { mapPanelToStudyDemographics } from '../../../lib/demographic-field-mapping'
import type { Demographics } from '../../../lib/supabase/panel-types'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

const querySchema = z.object({
  email: z.string().email().optional(),
  participationId: z.string().uuid().optional(),
}).refine(
  (data) => data.email || data.participationId,
  { message: 'Either email or participationId is required' }
)

export const config = {
  name: 'GetParticipantPrefill',
  description: 'Get demographic pre-fill data from panel profile',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/participant-prefill',
    middleware: [sessionAuthMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['panel', 'studies', 'participants'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { studyId } = paramsSchema.parse(req.pathParams)
  const query = querySchema.parse(req.queryParams || {})

  logger.info('Getting participant pre-fill data', { studyId, hasEmail: !!query.email })

  const supabase = getMotiaSupabaseClient()

  try {
    let panelParticipant: {
      demographics: Demographics | null
      first_name: string | null
      last_name: string | null
    } | null = null

    if (query.participationId) {
      // Single query: join participation → participant, scoped by studyId
      const { data, error } = await (supabase as any)
        .from('panel_study_participations')
        .select(`
          panel_participant:panel_participants (
            demographics,
            first_name,
            last_name
          )
        `)
        .eq('id', query.participationId)
        .eq('study_id', studyId)
        .single()

      if (!error && (data as any)?.panel_participant) {
        panelParticipant = (data as any).panel_participant as {
          demographics: Demographics | null
          first_name: string | null
          last_name: string | null
        }
      }
    } else if (query.email) {
      // Run study lookup and participant lookup in parallel
      // We need the study's user_id to scope the participant query
      const [studyResult, participantResult] = await Promise.all([
        supabase
          .from('studies')
          .select('user_id')
          .eq('id', studyId)
          .single(),
        // Pre-fetch by email — we'll filter by user_id after
        (supabase as any)
          .from('panel_participants')
          .select('demographics, first_name, last_name, user_id')
          .eq('email', query.email.toLowerCase()),
      ])

      if (!studyResult.error && studyResult.data) {
        const userId = (studyResult.data as any).user_id
        // Find the participant that belongs to this study's owner
        const match = (participantResult.data as any[])?.find(
          (p: any) => p.user_id === userId
        )
        if (match) {
          panelParticipant = match as any
        }
      }
    }

    const hasData =
      panelParticipant &&
      ((panelParticipant as any).demographics ||
        (panelParticipant as any).first_name ||
        panelParticipant.last_name)

    if (!hasData) {
      return {
        status: 200,
        body: {
          found: false,
          demographics: {},
          source: null,
        },
      }
    }

    const mappedDemographics = mapPanelToStudyDemographics(
      (panelParticipant as any).demographics as Demographics
    )

    // Add first_name and last_name (top-level columns, not in demographics JSON)
    if (panelParticipant && (panelParticipant as any).first_name) {
      mappedDemographics.firstName = (panelParticipant as any).first_name
      mappedDemographics._sources = mappedDemographics._sources || {}
      mappedDemographics._sources['firstName'] = 'panel'
    }
    if (panelParticipant && (panelParticipant as any).last_name) {
      mappedDemographics.lastName = (panelParticipant as any).last_name
      mappedDemographics._sources = mappedDemographics._sources || {}
      mappedDemographics._sources['lastName'] = 'panel'
    }

    logger.info('Found panel pre-fill data', {
      studyId,
      fieldCount: Object.keys(mappedDemographics).filter(k => k !== '_sources').length,
    })

    return {
      status: 200,
      body: {
        found: true,
        demographics: mappedDemographics,
        source: 'panel',
      },
    }
  } catch (error) {
    logger.error('Failed to get participant pre-fill data', {
      studyId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    // Return empty data on error (don't block study flow)
    return {
      status: 200,
      body: {
        found: false,
        demographics: {},
        source: null,
        error: 'Failed to fetch pre-fill data',
      },
    }
  }
}
