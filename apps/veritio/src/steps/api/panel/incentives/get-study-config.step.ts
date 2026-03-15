import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelIncentiveService } from '../../../../services/panel/index'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const config = {
  name: 'GetStudyIncentiveConfig',
  description: 'Get the incentive configuration for a study',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/incentive-config',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { studyId } = paramsSchema.parse(req.pathParams)

  logger.info('Getting study incentive config', { studyId })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelIncentiveService(supabase)

  try {
    const config = await service.getConfig(studyId)

    logger.info('Study incentive config fetched', { studyId, enabled: config?.enabled })

    return {
      status: 200,
      body: config || { enabled: false },
    }
  } catch (error) {
    logger.error('Failed to get study incentive config', {
      studyId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to get incentive configuration' },
    }
  }
}
