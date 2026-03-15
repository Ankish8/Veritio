import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getValidAccessToken } from '../../../services/figma/figma-oauth'
import { getFileMetadata, extractFrames, getNodeImages } from '../../../services/figma/index'

export const config = {
  name: 'GetFirstClickFigmaFrames',
  description: 'Load frames from a Figma file for first-click image import',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/first-click/figma-frames',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
} satisfies StepConfig

const querySchema = z.object({
  fileKey: z.string().min(1),
})

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { studyId } = req.pathParams
  const userId = req.headers['x-user-id'] as string
  const supabase = getMotiaSupabaseClient()

  // Parse query params
  const { fileKey } = querySchema.parse(req.queryParams || {})

  logger.info('Loading Figma frames', { studyId, fileKey, userId })

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
    // Fetch file metadata and extract frames
    const { data: file, error: fileError } = await getFileMetadata(fileKey, figmaToken)

    if (fileError || !file) {
      logger.error('Failed to fetch Figma file', { error: fileError?.message })
      return {
        status: 400,
        body: { error: fileError?.message || 'Failed to fetch Figma file' },
      }
    }

    // Extract frames from document
    const frames = extractFrames(file.document)

    if (frames.length === 0) {
      return {
        status: 200,
        body: { frames: [] },
      }
    }

    // Get thumbnails for all frames
    const nodeIds = frames.map(f => f.nodeId)
    const { data: images, error: imageError } = await getNodeImages(fileKey, nodeIds, figmaToken, 2)

    if (imageError) {
      logger.error('Failed to fetch Figma images', { error: imageError.message })
      // Continue without thumbnails - they're optional
    }

    // Build response
    const frameList = frames.map(frame => ({
      nodeId: frame.nodeId,
      name: frame.name,
      thumbnailUrl: images?.[frame.nodeId] || null,
      pageName: frame.pageName,
    }))

    logger.info('Loaded Figma frames', { studyId, frameCount: frameList.length })

    return {
      status: 200,
      body: { frames: frameList },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to load Figma frames', { error: errorMessage, studyId, fileKey, stack: error instanceof Error ? error.stack : undefined })
    return {
      status: 500,
      body: { error: `Failed to load frames from Figma: ${errorMessage}` },
    }
  }
}
