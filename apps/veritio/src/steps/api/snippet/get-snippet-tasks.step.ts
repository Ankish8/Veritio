import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'GetSnippetTasks',
  description: 'Get tasks for a live website testing snippet (public)',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/snippet/:snippetId/tasks',
    middleware: [errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  snippetId: z.string().min(1),
})

const querySchema = z.object({
  variantId: z.string().uuid().optional(),
})

export const handler = async (req: ApiRequest, _ctx: ApiHandlerContext) => {
  const { snippetId } = paramsSchema.parse(req.pathParams)
  const { variantId } = querySchema.parse(req.queryParams ?? {})
  const supabase = getMotiaSupabaseClient()

  // Find study by snippetId stored in settings JSON
  const { data: studies } = await supabase
    .from('studies')
    .select('id, settings, branding, share_code')
    .filter('settings->snippetId', 'eq', `"${snippetId}"`)
    .limit(1)

  if (!studies || studies.length === 0) {
    return {
      status: 404,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { error: 'Snippet not found' },
    }
  }

  const studyId = studies[0].id

  const [tasksResult, taskVariantsResult] = await Promise.all([
    (supabase.from('live_website_tasks' as any) as any)
      .select('id, title, instructions, target_url, success_url, success_criteria_type, success_path, time_limit_seconds, order_position, post_task_questions')
      .eq('study_id', studyId)
      .order('order_position'),
    variantId
      ? (supabase.from('live_website_task_variants' as any) as any)
          .select('task_id, starting_url, success_criteria_type, success_url, success_path, time_limit_seconds')
          .eq('study_id', studyId)
          .eq('variant_id', variantId)
      : Promise.resolve({ data: null }),
  ])

  // Merge per-variant success criteria over the base task fields
  const taskVariantMap = new Map<string, Record<string, unknown>>()
  for (const tv of (taskVariantsResult.data || [])) {
    taskVariantMap.set(tv.task_id, tv)
  }

  const tasks = (tasksResult.data || []).map((task: Record<string, unknown>) => {
    const variant = taskVariantMap.get(task.id as string)
    if (!variant) return task
    return {
      ...task,
      // Override starting page when variant has one
      target_url: variant.starting_url || task.target_url,
      success_criteria_type: variant.success_criteria_type ?? task.success_criteria_type,
      success_url: variant.success_url ?? task.success_url,
      success_path: variant.success_path ?? task.success_path,
      time_limit_seconds: variant.time_limit_seconds ?? task.time_limit_seconds,
    }
  })

  const studySettings = studies[0].settings as Record<string, unknown> | null
  const studyBranding = studies[0].branding as Record<string, unknown> | null

  return {
    status: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: {
      tasks,
      settings: {
        widgetPosition: (studySettings?.widgetPosition) || 'bottom-right',
        blockBeforeStart: studySettings?.blockBeforeStart !== false,
        allowSkipTasks: studySettings?.allowSkipTasks !== false,
        showTaskProgress: studySettings?.showTaskProgress !== false,
        defaultTimeLimitSeconds: studySettings?.defaultTimeLimitSeconds || null,

        completionButtonText: (studySettings?.completionButtonText as string) || 'I completed this task',
        eyeTrackingEnabled: !!(studySettings?.eyeTracking as any)?.enabled,
      },
      branding: {
        primaryColor: studyBranding?.primaryColor || null,
        logoUrl: (studyBranding?.logo as Record<string, unknown> | null)?.url || null,
      },
      shareCode: studies[0].share_code,
      frontendBase: process.env.NEXT_PUBLIC_APP_URL || 'https://app.veritio.io',
    },
  }
}
