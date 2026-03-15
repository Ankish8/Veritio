import { ApiMiddleware } from 'motia'
import { getMotiaSupabaseClient } from '../src/lib/supabase/motia-client'

/**
 * Study ownership middleware for Motia API Steps.
 * Verifies that the authenticated user owns the study.
 * Must come after authMiddleware in the middleware stack.
 */
export const studyOwnerMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const { logger, traceId } = ctx
  const studyId = req.pathParams?.studyId as string | undefined
  const userId = req.headers['x-user-id'] as string | undefined

  if (!studyId) {
    logger.warn('Missing studyId in path params', { traceId })
    return {
      status: 400,
      body: { error: 'Study ID is required' },
    }
  }

  if (!userId) {
    logger.warn('Missing userId - authMiddleware not called?', { traceId })
    return {
      status: 401,
      body: { error: 'Unauthorized' },
    }
  }

  try {
    const supabase = getMotiaSupabaseClient()

    const { data: study, error } = await supabase
      .from('studies')
      .select('id, user_id')
      .eq('id', studyId)
      .single()

    if (error || !study) {
      logger.warn('Study not found', { traceId, studyId })
      return {
        status: 404,
        body: { error: 'Study not found' },
      }
    }

    if (study.user_id !== userId) {
      logger.warn('User does not own study', { traceId, studyId, userId })
      return {
        status: 404,
        body: { error: 'Study not found' },
      }
    }

    // Attach study to context for downstream use
    req.headers['x-study-id'] = studyId

    return await next()
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Study ownership check failed', { traceId, error: errorMessage })
    return {
      status: 500,
      body: { error: 'Failed to verify study ownership' },
    }
  }
}
