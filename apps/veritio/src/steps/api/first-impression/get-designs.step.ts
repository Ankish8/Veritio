import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listDesigns } from '../../../services/first-impression-service'

export const config = {
  name: 'GetFirstImpressionDesigns',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/first-impression/designs',
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { studyId } = req.pathParams
  const supabase = getMotiaSupabaseClient()

  try {
    const { data: designs, error } = await listDesigns(supabase, studyId)

    if (error) {
      throw error
    }

    return {
      status: 200,
      body: { designs: designs || [] },
    }
  } catch (error) {
    logger.error('Failed to fetch first impression designs', { error, studyId })
    return {
      status: 500,
      body: { error: 'Failed to fetch first impression designs' },
    }
  }
}
