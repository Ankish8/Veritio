import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { generateSnippetJs } from '../../../services/snippet/live-website-snippet'
import { normalizeSnippetFile } from '../../../services/snippet/snippet-path'

export const config = {
  name: 'ServeLiveWebsiteSnippet',
  description: 'Serve the live website testing JavaScript snippet (public)',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/snippet/:snippetFile',
    middleware: [errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  snippetFile: z.string().min(1),
})

export const handler = async (req: ApiRequest, _ctx: ApiHandlerContext) => {
  const { snippetFile } = paramsSchema.parse(req.pathParams)
  const snippetId = z.string()
    .min(1)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .parse(normalizeSnippetFile(snippetFile))
  const supabase = getMotiaSupabaseClient()

  // Look up the study by snippetId in settings
  const { data: studies } = await supabase
    .from('studies')
    .select('id, settings')
    .filter('settings->snippetId', 'eq', `"${snippetId}"`)
    .limit(1)

  if (!studies || studies.length === 0) {
    return {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
      body: '// Snippet not found',
    }
  }

  // Extract platform origin so the snippet can call back to our API
  // The snippet runs on a 3rd-party website, so it needs the absolute URL
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http'
  const host = (req.headers['x-forwarded-host'] as string) || (req.headers['host'] as string) || 'localhost:4001'
  const apiBase = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`

  const studyId = studies[0].id
  const js = generateSnippetJs(snippetId, studyId, apiBase)

  return {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
    body: js,
  }
}
