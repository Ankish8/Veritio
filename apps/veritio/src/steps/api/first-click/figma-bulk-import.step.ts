import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getValidAccessToken } from '../../../services/figma/figma-oauth'
import { getNodeImages, downloadAndUploadFigmaImage } from '../../../services/figma/index'

export const config = {
  name: 'BulkImportFirstClickFigmaFrames',
  description: 'Bulk import all Figma frames as images for first-click testing',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/first-click/figma-bulk-import',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
} satisfies StepConfig

const frameSchema = z.object({
  nodeId: z.string(),
  name: z.string(),
})

const bodySchema = z.object({
  fileKey: z.string().min(1),
  frames: z.array(frameSchema),
})

interface ImportedImage {
  nodeId: string
  id: string
  image_url: string
  original_filename: string
  width: number | null
  height: number | null
  source_type: 'figma'
  figma_file_key: string
  figma_node_id: string
}

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { studyId } = req.pathParams
  const userId = req.headers['x-user-id'] as string
  const supabase = getMotiaSupabaseClient()

  const { fileKey, frames } = bodySchema.parse(req.body)

  logger.info('Bulk importing Figma frames', { studyId, fileKey, frameCount: frames.length })

  // Get user's Figma OAuth token
  const { token: figmaToken, error: tokenError } = await getValidAccessToken(supabase, userId)

  if (tokenError || !figmaToken) {
    return {
      status: 401,
      body: { error: 'Please connect your Figma account first', requiresFigmaAuth: true },
    }
  }

  try {
    // Get all frame images from Figma at 2x scale (high quality)
    const nodeIds = frames.map(f => f.nodeId)
    const { data: figmaImages, error: imageError } = await getNodeImages(
      fileKey,
      nodeIds,
      figmaToken,
      2 // 2x scale for high resolution
    )

    if (imageError || !figmaImages) {
      throw new Error(imageError?.message || 'Failed to export frames from Figma')
    }

    // Download and upload each frame in parallel
    const importPromises = frames.map(async (frame): Promise<ImportedImage | null> => {
      const figmaImageUrl = figmaImages[frame.nodeId]
      if (!figmaImageUrl) {
        logger.warn('No image URL for frame', { nodeId: frame.nodeId, name: frame.name })
        return null
      }

      try {
        const imageId = crypto.randomUUID()
        const storagePath = `${studyId}/first-click-library/${imageId}.png`
        const { publicUrl, filename, width, height } = await downloadAndUploadFigmaImage(
          supabase, figmaImageUrl, storagePath, frame.name, logger
        )

        return {
          nodeId: frame.nodeId,
          id: imageId,
          image_url: publicUrl,
          original_filename: filename,
          width,
          height,
          source_type: 'figma',
          figma_file_key: fileKey,
          figma_node_id: frame.nodeId,
        }
      } catch (err) {
        logger.error('Failed to import frame', { nodeId: frame.nodeId, error: err })
        return null
      }
    })

    // Wait for all imports to complete
    const results = await Promise.all(importPromises)
    const importedImages = results.filter((img): img is ImportedImage => img !== null)

    logger.info('Bulk import completed', {
      studyId,
      requested: frames.length,
      imported: importedImages.length,
    })

    return {
      status: 200,
      body: {
        images: importedImages,
        importedCount: importedImages.length,
        failedCount: frames.length - importedImages.length,
      },
    }
  } catch (error) {
    logger.error('Bulk import failed', { error, studyId, fileKey })
    return {
      status: 500,
      body: { error: error instanceof Error ? error.message : 'Failed to import frames' },
    }
  }
}
