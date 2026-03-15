import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import type { ApiRequest } from '../../../lib/motia/types'

/**
 * Standard middleware chain for prototype-test API steps.
 * Includes auth, study editor permission check, and error handling.
 */
export const prototypeTestMiddleware = [
  authMiddleware,
  requireStudyEditor('studyId'),
  errorHandlerMiddleware,
] as const

/**
 * Schema for parsing studyId from path params.
 * Reused across all prototype-test steps.
 */
export const studyIdParamsSchema = z.object({
  studyId: z.string().uuid(),
})

/**
 * Extract common request context from an API request.
 * Returns parsed studyId, authenticated userId, and Supabase client.
 */
export function extractRequestContext(req: ApiRequest) {
  const params = studyIdParamsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()
  const userId = req.headers['x-user-id'] as string

  return { studyId: params.studyId, userId, supabase }
}
