import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getPrototype } from '../../../services/prototype-service'
import { getNodeImages } from '../../../services/figma/index'
import { getValidAccessToken } from '../../../services/figma/figma-oauth'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorResponse } from '../../../lib/response-helpers'

export const config = {
  name: 'RefreshPrototypeThumbnails',
  description: 'Re-fetch frame thumbnails at higher resolution without a full sync',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/prototype/refresh-thumbnails',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['study-content'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()
  const userId = req.headers['x-user-id'] as string

  // Get existing prototype
  const { data: prototype, error: protoError } = await getPrototype(supabase, params.studyId, userId)

  if (protoError || !prototype) {
    return errorResponse.notFound('Prototype not found')
  }

  // Get user's Figma OAuth token
  const { token: figmaToken, error: tokenError } = await getValidAccessToken(supabase, userId)

  if (tokenError || !figmaToken) {
    return {
      status: 401,
      body: { error: 'Figma token unavailable', requiresFigmaAuth: true },
    }
  }

  // Get all frames for this prototype
  const { data: frames, error: framesError } = await supabase
    .from('prototype_test_frames')
    .select('id, figma_node_id')
    .eq('prototype_id', prototype.id)

  if (framesError || !frames || frames.length === 0) {
    return errorResponse.notFound('No frames found')
  }

  const nodeIds = frames.map(f => f.figma_node_id)

  logger.info('Refreshing frame thumbnails', {
    studyId: params.studyId,
    frameCount: nodeIds.length,
    scale: 2.0,
  })

  // Fetch images at 2x scale for Retina/HiDPI quality
  const { data: images, error: imgError } = await getNodeImages(
    prototype.figma_file_key,
    nodeIds,
    figmaToken,
    2.0
  )

  if (imgError || !images) {
    logger.error('Failed to fetch Figma images', { error: imgError?.message })
    return errorResponse.serverError('Failed to fetch images from Figma')
  }

  // Update each frame's thumbnail_url
  let updatedCount = 0
  for (const frame of frames) {
    const newUrl = images[frame.figma_node_id]
    if (newUrl) {
      const { error: updateError } = await supabase
        .from('prototype_test_frames')
        .update({ thumbnail_url: newUrl })
        .eq('id', frame.id)

      if (!updateError) updatedCount++
    }
  }

  logger.info('Refreshed frame thumbnails', { updatedCount, totalFrames: frames.length })

  return {
    status: 200,
    body: { data: { updatedCount, totalFrames: frames.length } },
  }
}
