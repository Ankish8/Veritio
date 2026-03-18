import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { checkStudyPermission } from '../../../services/permission-service'

const bodySchema = z.object({
  path: z.string().min(1).max(1000),
})

export const config = {
  name: 'DeleteStorageFile',
  description: 'Delete a file from storage after validating ownership',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/storage/delete',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['storage'],
} satisfies StepConfig

function parseStoragePath(path: string): {
  type: 'study' | 'avatar'
  ownerId: string
} | null {
  const parts = path.split('/')

  if (parts.length < 2) {
    return null
  }

  if (parts[0] === 'avatars') {
    return { type: 'avatar', ownerId: parts[1] }
  }

  // First segment is study ID (UUID format)
  const studyIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (studyIdPattern.test(parts[0])) {
    return { type: 'study', ownerId: parts[0] }
  }

  return null
}

export const handler = async (
  req: ApiRequest<z.infer<typeof bodySchema>>,
  { logger }: ApiHandlerContext
) => {
  const userId = req.headers['x-user-id'] as string
  const validation = validateRequest(bodySchema, req.body, logger)
  if (!validation.success) return validation.response

  const { path } = validation.data
  const supabase = getMotiaSupabaseClient()

  const pathInfo = parseStoragePath(path)

  if (!pathInfo) {
    logger.warn('Invalid storage path format', { path, userId })
    return {
      status: 400,
      body: { error: 'Invalid storage path format' },
    }
  }

  if (pathInfo.type === 'avatar') {
    if (pathInfo.ownerId !== userId) {
      logger.warn('Unauthorized avatar deletion attempt', { userId, avatarOwnerId: pathInfo.ownerId })
      return {
        status: 403,
        body: { error: 'You can only delete your own avatar' },
      }
    }

    logger.info('Deleting avatar', { userId, path })

    const { error } = await supabase.storage
      .from('study-assets')
      .remove([path])

    if (error) {
      logger.error('Failed to delete avatar', { error: error.message, path })
      return {
        status: 500,
        body: { error: 'Failed to delete file' },
      }
    }

    return {
      status: 200,
      body: { success: true },
    }
  }

  const { allowed, error: permError } = await checkStudyPermission(
    supabase,
    pathInfo.ownerId,
    userId,
    'editor'
  )

  if (permError) {
    logger.error('Permission check failed', { error: permError.message, studyId: pathInfo.ownerId, userId })
    if (permError.message.includes('not found')) {
      return {
        status: 404,
        body: { error: 'Study not found' },
      }
    }
    return {
      status: 500,
      body: { error: 'Permission check failed' },
    }
  }

  if (!allowed) {
    logger.warn('Unauthorized deletion attempt', { userId, studyId: pathInfo.ownerId, path })
    return {
      status: 403,
      body: { error: 'You do not have permission to delete files from this study' },
    }
  }

  logger.info('Deleting study asset', { userId, studyId: pathInfo.ownerId, path })

  const { error } = await supabase.storage
    .from('study-assets')
    .remove([path])

  if (error) {
    logger.error('Failed to delete file', { error: error.message, path })
    return {
      status: 500,
      body: { error: 'Failed to delete file' },
    }
  }

  return {
    status: 200,
    body: { success: true },
  }
}
