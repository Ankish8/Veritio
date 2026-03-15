import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { saveTasks } from '../../../services/live-website-service'

const UrlPathStepSchema = z.object({
  id: z.string(),
  type: z.enum(['navigation', 'click']).default('navigation'),
  pathname: z.string(),
  fullUrl: z.string(),
  label: z.string(),
  selector: z.string().optional(),
  elementText: z.string().optional(),
  wildcardSegments: z.array(z.number()).optional(),
  wildcardParams: z.array(z.string()).optional(),
  group: z.string().optional(),
})

const UrlSuccessPathSchema = z.object({
  version: z.literal(1),
  mode: z.enum(['strict', 'flexible']),
  steps: z.array(UrlPathStepSchema).min(2),
})

const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  instructions: z.string().optional().default(''),
  target_url: z.string(),
  success_url: z.string().nullable().default(null),
  success_criteria_type: z.enum(['self_reported', 'url_match', 'exact_path']).default('self_reported'),
  success_path: UrlSuccessPathSchema.nullable().default(null),
  time_limit_seconds: z.number().nullable().default(null),
  order_position: z.number().default(0),
  post_task_questions: z.any().default([]),
})

const BodySchema = z.object({
  tasks: z.array(TaskSchema),
  settings: z.any().optional(),
})

export const config = {
  name: 'UpdateLiveWebsiteTasks',
  description: 'Update live website test tasks and settings',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/studies/:studyId/live-website',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    bodySchema: BodySchema as any,
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { studyId } = paramsSchema.parse(req.pathParams)
  const body = BodySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  // Save tasks and settings in parallel when settings are provided.
  // This avoids a separate PATCH /api/studies/:studyId call for settings,
  // eliminating one full auth middleware chain (~2-4s of DB queries).
  const promises: Promise<unknown>[] = [
    saveTasks(supabase, studyId, body.tasks, logger),
  ]

  if (body.settings) {
    promises.push(saveSettings(supabase, studyId, body.settings, logger))
  }

  await Promise.all(promises)

  return {
    status: 200,
    body: { success: true },
  }
}

/**
 * Merge content settings into the study's settings JSON column.
 * Preserves existing keys (like studyFlow) while updating content-specific settings.
 */
async function saveSettings(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  studyId: string,
  contentSettings: Record<string, unknown>,
  logger?: { info: (msg: string, data?: Record<string, unknown>) => void; error: (msg: string, data?: Record<string, unknown>) => void }
) {
  // Read current settings to preserve studyFlow and other keys
  const { data: study, error: readError } = await supabase
    .from('studies')
    .select('settings')
    .eq('id', studyId)
    .single()

  if (readError) {
    logger?.error('Failed to read study settings', { error: readError })
    throw readError
  }

  const existingSettings = (study?.settings && typeof study.settings === 'object')
    ? study.settings as Record<string, unknown>
    : {}

  const mergedSettings = { ...existingSettings, ...contentSettings }

  const { error: updateError } = await supabase
    .from('studies')
    .update({ settings: mergedSettings as unknown as import('@/lib/supabase/types').Json })
    .eq('id', studyId)

  if (updateError) {
    logger?.error('Failed to update study settings', { error: updateError })
    throw updateError
  }

  logger?.info('Saved live website settings', { studyId })
}
