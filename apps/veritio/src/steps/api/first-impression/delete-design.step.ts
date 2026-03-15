import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { deleteDesign } from '../../../services/first-impression-service'

export const config = {
  name: 'DeleteFirstImpressionDesign',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/studies/:studyId/first-impression/designs/:designId',
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { studyId, designId } = req.pathParams
  const supabase = getMotiaSupabaseClient()

  try {
    const { success, error } = await deleteDesign(supabase, designId, studyId)

    if (error) {
      throw error
    }

    if (!success) {
      return {
        status: 404,
        body: { error: 'Design not found' },
      }
    }

    return {
      status: 200,
      body: { success: true },
    }
  } catch (error) {
    logger.error('Failed to delete first impression design', { error, studyId, designId })
    return {
      status: 500,
      body: { error: 'Failed to delete first impression design' },
    }
  }
}
