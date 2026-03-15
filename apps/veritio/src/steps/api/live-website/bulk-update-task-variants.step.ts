import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { saveTaskVariants } from '../../../services/live-website-service'

const taskVariantSchema = z.object({
  task_id: z.string().uuid(),
  variant_id: z.string().uuid(),
  study_id: z.string().uuid(),
  starting_url: z.string().nullable().optional(),
  success_criteria_type: z.enum(['self_reported', 'url_match', 'exact_path']).nullable().default(null),
  success_url: z.string().nullable().optional(),
  success_path: z.any().nullable().optional(),
  time_limit_seconds: z.number().int().nullable().optional(),
})

const bodySchema = z.object({
  taskVariants: z.array(taskVariantSchema),
})

export const config = {
  name: 'BulkUpdateLiveWebsiteTaskVariants',
  description: 'Bulk upsert per-task per-variant success criteria for a live website study',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/studies/:studyId/live-website/task-variants',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (req: ApiRequest, _ctx: ApiHandlerContext) => {
  const { studyId } = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  await saveTaskVariants(supabase, studyId, body.taskVariants)

  return { status: 200, body: { success: true } }
}
