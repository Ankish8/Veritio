import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const GazePointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  t: z.number().finite().positive(), // ms since epoch
})

const BodySchema = z.object({
  session_id: z.string(),
  task_id: z.string().nullable().optional(),
  page_url: z.string().nullable().optional(),
  viewport_width: z.number().nullable().optional(),
  viewport_height: z.number().nullable().optional(),
  gaze_points: z.array(GazePointSchema).max(10000),
})

export const config = {
  name: 'IngestGazeData',
  description: 'Ingest eye tracking gaze data from live website testing (public)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/snippet/:snippetId/gaze',
    middleware: [errorHandlerMiddleware],
    // No bodySchema — body may arrive as text/plain string from sendBeacon
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  snippetId: z.string().min(1),
})

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { snippetId } = paramsSchema.parse(req.pathParams)
  const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const body = BodySchema.parse(rawBody)
  const supabase = getMotiaSupabaseClient()

  if (body.gaze_points.length === 0) {
    return { status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: { success: true, count: 0 } }
  }

  // Look up study by snippetId
  const { data: studies } = await supabase
    .from('studies')
    .select('id')
    .filter('settings->snippetId', 'eq', `"${snippetId}"`)
    .limit(1)

  if (!studies || studies.length === 0) {
    return { status: 404, headers: { 'Access-Control-Allow-Origin': '*' }, body: { error: 'Snippet not found' } }
  }

  const studyId = studies[0].id

  const { error } = await (supabase
    .from('live_website_gaze_data' as any) as any)
    .insert({
      study_id: studyId,
      session_id: body.session_id,
      task_id: body.task_id || null,
      page_url: body.page_url || null,
      viewport_width: body.viewport_width || null,
      viewport_height: body.viewport_height || null,
      gaze_points: body.gaze_points,
      point_count: body.gaze_points.length,
    })

  if (error) {
    logger.error('Failed to insert gaze data', { error })
    return { status: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: { error: 'Failed to store gaze data' } }
  }

  return {
    status: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: { success: true, count: body.gaze_points.length },
  }
}
