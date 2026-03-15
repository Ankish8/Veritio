import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { bulkUpdatePrototypeTasks } from '../../../services/prototype-task-service'
import { bulkUpdatePrototypeTasksSchema } from '../../../services/types'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'

export const config = {
  name: 'BulkUpdatePrototypeTasks',
  description: 'Bulk create/update/delete prototype tasks',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/studies/:studyId/prototype-tasks',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    bodySchema: bulkUpdatePrototypeTasksSchema as any,
  }],
  enqueues: ['prototype-tasks-updated'],
  flows: ['study-content'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (req: ApiRequest, { enqueue, logger: _logger }: ApiHandlerContext) => {
  const params = paramsSchema.parse(req.pathParams)

  let body
  try {
    body = bulkUpdatePrototypeTasksSchema.parse(req.body)
  } catch (validationError: any) {
    return {
      status: 400,
      body: {
        error: 'Validation failed',
        details: validationError.issues
      },
    }
  }

  const supabase = getMotiaSupabaseClient()
  const userId = req.headers['x-user-id'] as string

  const { data: tasks, error } = await bulkUpdatePrototypeTasks(supabase, params.studyId, body.tasks as any)

  if (error) {
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  enqueue({
    topic: 'prototype-tasks-updated',
    data: { resourceType: 'prototype-task', action: 'bulk-update', userId, studyId: params.studyId },
  }).catch(() => {})

  return {
    status: 200,
    body: { data: tasks },
  }
}
