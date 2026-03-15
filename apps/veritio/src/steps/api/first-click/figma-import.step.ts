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
  name: 'ImportFirstClickFigmaFrame',
  description: 'Import a Figma frame as a static image for first-click testing',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/first-click/figma-import',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: ['first-click-image-imported'],
} satisfies StepConfig

const bodySchema = z.object({
  fileKey: z.string().min(1),
  nodeId: z.string().min(1),
  taskId: z.string().uuid(),
  frameName: z.string().optional(),
})

export const handler = async (req: ApiRequest, { enqueue, logger }: ApiHandlerContext) => {
  const { studyId } = req.pathParams
  const userId = req.headers['x-user-id'] as string
  const supabase = getMotiaSupabaseClient()

  // Parse body
  const { fileKey, nodeId, taskId, frameName } = bodySchema.parse(req.body)

  logger.info('Importing Figma frame', { studyId, fileKey, nodeId, taskId })

  // Get user's Figma OAuth token
  const { token: figmaToken, error: tokenError } = await getValidAccessToken(supabase, userId)

  if (tokenError || !figmaToken) {
    logger.warn('Figma token error', { error: tokenError?.message })
    return {
      status: 401,
      body: {
        error: 'Please connect your Figma account first',
        requiresFigmaAuth: true,
      },
    }
  }

  try {
    // Export the frame as a high-resolution PNG (scale 2x for good quality)
    const { data: images, error: imageError } = await getNodeImages(
      fileKey,
      [nodeId],
      figmaToken,
      2 // 2x scale for high resolution
    )

    if (imageError || !images || !images[nodeId]) {
      logger.error('Failed to export Figma frame', { error: imageError?.message })
      return {
        status: 400,
        body: { error: imageError?.message || 'Failed to export frame from Figma' },
      }
    }

    const figmaImageUrl = images[nodeId]

    const imageId = crypto.randomUUID()
    const storagePath = `${studyId}/first-click-images/${taskId}/${imageId}.png`
    const { publicUrl, filename, width, height } = await downloadAndUploadFigmaImage(
      supabase, figmaImageUrl, storagePath, frameName || 'figma-frame', logger
    )

    enqueue({
      topic: 'first-click-image-imported',
      data: { studyId, taskId, imageId, source: 'figma' },
    }).catch(() => {})

    logger.info('Successfully imported Figma frame', { studyId, taskId, imageId })

    return {
      status: 200,
      body: {
        image: {
          id: imageId,
          task_id: taskId,
          study_id: studyId,
          image_url: publicUrl,
          original_filename: filename,
          width,
          height,
          source_type: 'figma',
          figma_file_key: fileKey,
          figma_node_id: nodeId,
        },
      },
    }
  } catch (error) {
    logger.error('Failed to import Figma frame', { error, studyId, fileKey, nodeId })
    return {
      status: 500,
      body: { error: error instanceof Error ? error.message : 'Failed to import frame from Figma' },
    }
  }
}
