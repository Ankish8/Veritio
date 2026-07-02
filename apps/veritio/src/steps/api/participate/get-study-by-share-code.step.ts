import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getStudyByShareCode } from '../../../services/participant-service'
import { getVariants, getTaskVariants } from '../../../services/live-website-service'
import { cache, cacheKeys, cacheTTL } from '../../../lib/cache/memory-cache'

// Browser may reuse the config briefly and revalidate in the background; a
// paused/closed study still rejects participants at creation time (live check)
const CACHEABLE_HEADERS = {
  'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
}
// Auth/status outcomes must never be reused (e.g. a reopened study)
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
}

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
  shareCode: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/),
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

  // The assembled payload is identical for every participant on the
  // no-password, non-preview path, so it can be served from cache
  const isCacheablePath = !query.password && !isPreview
  const payloadCacheKey = cacheKeys.participateStudy(params.shareCode)

  if (isCacheablePath) {
    const cachedBody = await cache.getTiered<{ data: { id?: string } }>(payloadCacheKey)
    if (cachedBody) {
      enqueue({
        topic: 'participate-study-fetched',
        data: { resourceType: 'study', action: 'participate-fetch', shareCode: params.shareCode, studyId: cachedBody.data?.id },
      }).catch(() => {})

      return {
        status: 200,
        headers: CACHEABLE_HEADERS,
        body: cachedBody,
      }
    }
  }

  const { data: study, error } = await getStudyByShareCode(supabase, params.shareCode, query.password, isPreview)

  if (error) {
    if (error.message === 'Study not found') {
      return {
        status: 404,
        headers: NO_STORE_HEADERS,
        body: { error: error.message },
      }
    }
    if (error.message === 'This study is not currently accepting responses') {
      return {
        status: 403,
        headers: NO_STORE_HEADERS,
        body: { error: error.message },
      }
    }
    if (error.message === 'Incorrect password') {
      return {
        status: 401,
        headers: NO_STORE_HEADERS,
        body: { error: error.message },
      }
    }
    console.error(`[GetStudyByShareCode]`, error instanceof Error ? error.message : error)
    return {
      status: 500,
      headers: NO_STORE_HEADERS,
      body: { error: 'Internal server error' },
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

  const isPasswordGate = study && 'password_required' in study

  const body = {
    data: study,
    ...(abVariants.length > 0 ? { abVariants, abTaskVariants } : {}),
  }

  if (isCacheablePath && !isPasswordGate) {
    cache.set(payloadCacheKey, body, cacheTTL.participate)
  }

  return {
    status: 200,
    headers: isCacheablePath && !isPasswordGate ? CACHEABLE_HEADERS : NO_STORE_HEADERS,
    body,
  }
}
