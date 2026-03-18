import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { checkStudyPermission } from '../../../services/permission-service'

const bodySchema = z.object({
  studyId: z.string().uuid().optional(),
  assetType: z.enum(['logo', 'social', 'attachment', 'card-image', 'question-image', 'first-click-image', 'first-impression-image', 'avatar']),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  // For nested assets (card-image, question-image, first-click-image)
  entityId: z.string().uuid().optional(),
  // For avatar uploads
  userId: z.string().optional(),
})

const responseSchema = z.object({
  signedUrl: z.string().url(),
  path: z.string(),
  token: z.string(),
  expiresAt: z.string(),
})

export const config = {
  name: 'CreateStorageUploadUrl',
  description: 'Generate a signed URL for direct file uploads to storage',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/storage/upload-url',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: responseSchema as any,
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

type AssetType = z.infer<typeof bodySchema>['assetType']

function generateStoragePath(
  assetType: AssetType,
  options: {
    studyId?: string
    entityId?: string
    userId?: string
    filename: string
  }
): string {
  const { studyId, entityId, userId, filename } = options
  const extension = filename.split('.').pop()?.toLowerCase() || ''
  const uniqueName = `${crypto.randomUUID()}.${extension}`

  switch (assetType) {
    case 'logo':
      return `${studyId}/logo/${uniqueName}`
    case 'social':
      return `${studyId}/social/${uniqueName}`
    case 'attachment':
      return `${studyId}/attachments/${uniqueName}`
    case 'card-image':
      return `${studyId}/card-images/${entityId}/${uniqueName}`
    case 'question-image':
      return `${studyId}/question-images/${entityId}/${uniqueName}`
    case 'first-click-image':
      return `${studyId}/first-click-images/${entityId}/${uniqueName}`
    case 'first-impression-image':
      return `${studyId}/first-impression/${entityId}/${uniqueName}`
    case 'avatar':
      return `avatars/${userId}/${uniqueName}`
    default:
      throw new Error(`Unknown asset type: ${assetType}`)
  }
}

export const handler = async (
  req: ApiRequest<z.infer<typeof bodySchema>>,
  { logger }: ApiHandlerContext
) => {
  const userId = req.headers['x-user-id'] as string
  const validation = validateRequest(bodySchema, req.body, logger)
  if (!validation.success) return validation.response

  const { studyId, assetType, filename, entityId } = validation.data
  const supabase = getMotiaSupabaseClient()

  if (assetType === 'avatar') {
    const path = generateStoragePath(assetType, { userId, filename })

    logger.info('Creating avatar upload URL', { userId, path })

    const { data, error } = await supabase.storage
      .from('study-assets')
      .createSignedUploadUrl(path)

    if (error) {
      logger.error('Failed to create signed upload URL', { error: error.message })
      return {
        status: 500,
        body: { error: 'Failed to create upload URL' },
      }
    }

    return {
      status: 200,
      body: {
        signedUrl: data.signedUrl,
        path: data.path,
        token: data.token,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
      },
    }
  }

  if (!studyId) {
    return {
      status: 400,
      body: { error: 'studyId is required for this asset type' },
    }
  }

  const { allowed, error: permError } = await checkStudyPermission(
    supabase,
    studyId,
    userId,
    'editor'
  )

  if (permError) {
    logger.error('Permission check failed', { error: permError.message, studyId, userId })
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
    logger.warn('Unauthorized upload attempt', { userId, studyId, assetType })
    return {
      status: 403,
      body: { error: 'You do not have permission to upload files to this study' },
    }
  }

  if (['card-image', 'question-image', 'first-click-image', 'first-impression-image'].includes(assetType) && !entityId) {
    return {
      status: 400,
      body: { error: 'entityId is required for this asset type' },
    }
  }

  const path = generateStoragePath(assetType, { studyId, entityId, filename })

  logger.info('Creating signed upload URL', { userId, studyId, assetType, path })

  // Create signed upload URL using service role (bypasses RLS)
  const { data, error } = await supabase.storage
    .from('study-assets')
    .createSignedUploadUrl(path, {
      upsert: false,
    })

  if (error) {
    logger.error('Failed to create signed upload URL', { error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to create upload URL' },
    }
  }

  return {
    status: 200,
    body: {
      signedUrl: data.signedUrl,
      path: data.path,
      token: data.token,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
    },
  }
}
