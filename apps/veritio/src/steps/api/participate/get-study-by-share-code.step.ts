import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getStudyByShareCode } from '../../../services/participant-service'
import { getVariants, getTaskVariants } from '../../../services/live-website-service'

export const config = {
  name: 'GetStudyByShareCode',
  description: 'Get study data for participation (public endpoint). Supports both share_code and custom url_slug. If study has password protection, returns password_required response.',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/participate/:shareCode',
    middleware: [errorHandlerMiddleware],
  }],
  enqueues: ['participate-study-fetched'],
  flows: ['participation'],
} satisfies StepConfig

const paramsSchema = z.object({
  shareCode: z.string().min(1),
})

const querySchema = z.object({
  password: z.string().optional(),
  preview: z.string().optional(), // "true" to allow viewing draft studies
})

export const handler = async (
  req: ApiRequest,
  { enqueue }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const query = querySchema.parse(req.queryParams || {})
  const supabase = getMotiaSupabaseClient()
  const isPreview = query.preview === 'true'

  const { data: study, error } = await getStudyByShareCode(supabase, params.shareCode, query.password, isPreview)

  if (error) {
    if (error.message === 'Study not found') {
      return {
        status: 404,
        body: { error: error.message },
      }
    }
    if (error.message === 'This study is not currently accepting responses') {
      return {
        status: 403,
        body: { error: error.message },
      }
    }
    if (error.message === 'Incorrect password') {
      return {
        status: 401,
        body: { error: error.message },
      }
    }
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  const studyId = study && 'password_required' in study ? study.study_id : study?.id

  // For live website AB testing studies, include variants + task variants
  let abVariants: unknown[] = []
  let abTaskVariants: unknown[] = []
  if (studyId && study && !('password_required' in study)) {
    const fullStudy = study as any
    const isLiveWebsite = fullStudy.study_type === 'live_website_test'
    const settings = (fullStudy.settings && typeof fullStudy.settings === 'object') ? fullStudy.settings as Record<string, unknown> : {}
    if (isLiveWebsite && settings.abTestingEnabled === true) {
      try {
        ;[abVariants, abTaskVariants] = await Promise.all([
          getVariants(supabase, studyId),
          getTaskVariants(supabase, studyId),
        ])
      } catch {
        // Non-fatal — player falls back to single-URL mode
      }
    }
  }

  enqueue({
    topic: 'participate-study-fetched',
    data: { resourceType: 'study', action: 'participate-fetch', shareCode: params.shareCode, studyId },
  }).catch(() => {})

  return {
    status: 200,
    body: {
      data: study,
      ...(abVariants.length > 0 ? { abVariants, abTaskVariants } : {}),
    },
  }
}
