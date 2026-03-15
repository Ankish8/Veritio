import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'VerifyLiveWebsiteSnippet',
  description: 'Verify snippet installation by ping (public)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/snippet/:snippetId/ping',
    middleware: [errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  snippetId: z.string().min(1),
})

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { snippetId } = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const { data: studies } = await supabase
    .from('studies')
    .select('id, settings')
    .filter('settings->snippetId', 'eq', `"${snippetId}"`)
    .limit(1)

  if (!studies || studies.length === 0) {
    return {
      status: 404,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { error: 'Snippet not found' },
    }
  }

  const study = studies[0]
  const currentSettings = (study.settings && typeof study.settings === 'object')
    ? study.settings as Record<string, unknown>
    : {}

  // Mark snippet as verified (only on first ping)
  if (!currentSettings.snippetVerified) {
    await supabase
      .from('studies')
      .update({
        settings: { ...currentSettings, snippetVerified: true }
      })
      .eq('id', study.id)

    logger.info('Snippet verified', { studyId: study.id, snippetId })
  }

  return {
    status: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: { verified: true },
  }
}
