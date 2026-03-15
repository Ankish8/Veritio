import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getPrototype, getComponentInstances } from '../../../services/prototype-service'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'

export const config = {
  name: 'GetComponentInstances',
  description: 'Get component instance positions for a prototype (used for compositing variant images on frame thumbnails)',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/prototype/component-instances',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['study-content'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()
  const userId = req.headers['x-user-id'] as string

  const { data: prototype, error: protoError } = await getPrototype(supabase, params.studyId, userId)

  if (protoError || !prototype) {
    return {
      status: 404,
      body: { error: 'Prototype not found' },
    }
  }

  logger.info('Fetching component instances', {
    studyId: params.studyId,
    prototypeId: prototype.id,
  })

  const { data: instances, error: instancesError } = await getComponentInstances(
    supabase,
    params.studyId,
    prototype.id
  )

  if (instancesError) {
    logger.error('Failed to fetch component instances', { error: instancesError.message })
    return {
      status: 500,
      body: { error: instancesError.message },
    }
  }

  return {
    status: 200,
    body: { data: { instances: instances || [] } },
  }
}
