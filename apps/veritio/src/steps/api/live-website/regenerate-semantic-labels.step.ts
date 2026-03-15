import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'RegenerateSemanticLabels',
  description: 'Regenerate AI semantic labels for a participant or all participants',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/live-website/semantic-labels/regenerate',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: ['live-website-semantic-analysis-requested'],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

const bodySchema = z.object({
  participantId: z.string().uuid().optional(),
}).optional()

export const handler = async (req: ApiRequest, { enqueue, logger }: ApiHandlerContext) => {
  const { studyId } = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body)
  const participantId = body?.participantId
  const supabase = getMotiaSupabaseClient()

  // Set processing status
  await supabase
    .from('live_website_semantic_labels' as any)
    .upsert({
      study_id: studyId,
      status: 'processing',
      // Only reset labels if processing all participants
      ...(participantId ? {} : { event_labels: {}, intent_groups: {}, page_labels: {}, participants_analyzed: 0 }),
      error_message: null,
      token_usage: null,
      generation_time_ms: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'study_id' })

  enqueue({
    topic: 'live-website-semantic-analysis-requested',
    data: participantId ? { studyId, participantId } : { studyId },
  }).catch(() => {})

  logger.info('Regenerating semantic labels', { studyId, participantId: participantId || 'all' })

  return { status: 200, body: { queued: 1 } }
}
