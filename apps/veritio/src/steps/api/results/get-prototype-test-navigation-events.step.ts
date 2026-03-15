import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { fetchAllRows } from '../../../services/results/pagination'
import type { Database } from '@veritio/study-types'

export const config = {
  name: 'GetPrototypeTestNavigationEvents',
  description: 'Get navigation and component state events for flow diagram visualization',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/prototype-test-navigation-events',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['results-analysis'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

type NavigationEventRow = Database['public']['Tables']['prototype_test_navigation_events']['Row']
type ComponentStateEventRow = Database['public']['Tables']['prototype_test_component_state_events']['Row']

export const handler = async (
  req: ApiRequest,
  { logger: _logger }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('study_type')
    .eq('id', params.studyId)
    .single()

  if (studyError || !study) {
    return {
      status: 404,
      body: { error: 'Study not found' },
    }
  }

  if (study.study_type !== 'prototype_test') {
    return {
      status: 400,
      body: { error: 'This endpoint is only for prototype test studies' },
    }
  }

  const [navigationEvents, componentStateEvents, componentInstancesResult, componentVariantsResult] = await Promise.all([
    fetchAllRows<NavigationEventRow>(
      supabase,
      'prototype_test_navigation_events',
      params.studyId
    ),
    fetchAllRows<ComponentStateEventRow>(
      supabase,
      'prototype_test_component_state_events',
      params.studyId
    ),
    // Tables not yet in @veritio/study-types generated types — cast to any
    (supabase as any)
      .from('prototype_test_component_instances')
      .select('instance_id, instance_name, component_set_id, frame_node_id, component_id, relative_x, relative_y, width, height, frame_width, frame_height')
      .eq('study_id', params.studyId),
    (supabase as any)
      .from('prototype_test_component_variants')
      .select('variant_id, component_set_id, component_set_name, variant_name, image_url, image_width, image_height')
      .eq('study_id', params.studyId),
  ])

  return {
    status: 200,
    body: {
      navigationEvents,
      componentStateEvents,
      componentInstances: componentInstancesResult.data || [],
      componentVariants: componentVariantsResult.data || [],
    },
  }
}
