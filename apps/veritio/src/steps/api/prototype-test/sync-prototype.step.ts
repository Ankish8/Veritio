import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getPrototype, bulkUpsertFrames, bulkUpsertComponentVariants, bulkUpsertComponentInstances } from '../../../services/prototype-service'
import {
  extractFrames,
  getNodeImages,
  detectInteractiveComponents,
  exportComponentVariantImages,
  getFileMetadata,
  detectComponentInstances,
  buildComponentSetMap,
} from '../../../services/figma/index'
import { getValidAccessToken } from '../../../services/figma/figma-oauth'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'

export const config = {
  name: 'SyncPrototype',
  description: 'Re-sync frames from Figma for a prototype',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/prototype/sync',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: ['prototype-synced'],
  flows: ['study-content'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (req: ApiRequest, { enqueue, logger }: ApiHandlerContext) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()
  const userId = req.headers['x-user-id'] as string

  const { data: prototype, error: protoError } = await getPrototype(supabase, params.studyId, userId)

  if (protoError || !prototype) {
    return {
      status: 404,
      body: { error: 'Prototype not found' },
    }
  }

  logger.info('Syncing prototype', {
    studyId: params.studyId,
    fileKey: prototype.figma_file_key,
    figmaUrl: prototype.figma_url,
  })

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

  const { data: fileData, error: fileError } = await getFileMetadata(prototype.figma_file_key, figmaToken)

  if (fileError || !fileData) {
    logger.error('Figma file fetch failed', {
      error: fileError?.message,
      fileKey: prototype.figma_file_key
    })
    return {
      status: 500,
      body: { error: fileError?.message || 'Failed to fetch Figma file' },
    }
  }

  const extractedFrames = extractFrames(fileData.document)

  if (extractedFrames.length === 0) {
    return {
      status: 500,
      body: { error: 'No frames found in Figma file. Make sure your file has at least one frame.' },
    }
  }

  const frameNodeIds = extractedFrames.map(f => f.nodeId)

  // 2x scale for sharp rendering on Retina/HiDPI displays
  const { data: images } = await getNodeImages(prototype.figma_file_key, frameNodeIds, figmaToken, 2.0)

  // Round dimensions: Figma returns sub-pixel floats, DB uses integer columns
  const dbFrames = extractedFrames.map((f, index) => ({
    figma_node_id: f.nodeId,
    name: f.name,
    thumbnail_url: images?.[f.nodeId] || undefined,
    position: index,
    page_name: f.pageName,
    width: f.width != null ? Math.round(f.width) : undefined,
    height: f.height != null ? Math.round(f.height) : undefined,
    is_overlay: f.isOverlay ?? false,
    overlay_type: f.overlayType ?? null,
  }))

  const { data: frames, error: framesError } = await bulkUpsertFrames(
    supabase,
    params.studyId,
    prototype.id,
    dbFrames
  )

  if (framesError) {
    return {
      status: 500,
      body: { error: framesError.message },
    }
  }

  let componentVariantCount = 0
  let componentInstanceCount = 0

  const componentVariants = detectInteractiveComponents(fileData.document, frameNodeIds)

  if (componentVariants.length > 0) {
    const { data: variantImages, error: exportError } = await exportComponentVariantImages(
      prototype.figma_file_key,
      componentVariants,
      figmaToken,
      1.0
    )

    if (variantImages && !exportError) {
      const dbPayload = variantImages.map(v => ({
        component_set_id: v.componentSetId,
        component_set_name: v.componentSetName,
        variant_id: v.variantId,
        variant_name: v.variantName,
        variant_properties: v.variantProperties,
        image_url: v.imageUrl,
        image_width: v.width != null ? Math.round(v.width) : undefined,
        image_height: v.height != null ? Math.round(v.height) : undefined,
      }))

      const { error: variantSaveError } = await bulkUpsertComponentVariants(
        supabase,
        params.studyId,
        prototype.id,
        dbPayload
      )

      if (variantSaveError) {
        logger.warn('Failed to save component variants', { error: variantSaveError.message })
      } else {
        componentVariantCount = variantImages.length
        logger.info('Saved component variants', { count: componentVariantCount })
      }
    } else {
      logger.warn('Failed to export component variant images', { error: exportError?.message })
    }
  }

  const componentSetMap = buildComponentSetMap(fileData.document)

  const componentInstances = detectComponentInstances(
    fileData.document,
    frameNodeIds,
    componentSetMap
  )

  if (componentInstances.length > 0) {
    const { error: instanceSaveError } = await bulkUpsertComponentInstances(
      supabase,
      params.studyId,
      prototype.id,
      componentInstances.map(inst => ({
        instance_id: inst.instanceId,
        frame_node_id: inst.frameNodeId,
        component_id: inst.componentId,
        component_set_id: inst.componentSetId,
        relative_x: inst.relativeX,
        relative_y: inst.relativeY,
        width: inst.width,
        height: inst.height,
        frame_width: inst.frameWidth,
        frame_height: inst.frameHeight,
        instance_name: inst.instanceName,
      }))
    )

    if (instanceSaveError) {
      logger.warn('Failed to save component instances', { error: instanceSaveError.message })
    } else {
      componentInstanceCount = componentInstances.length
      logger.info('Saved component instances', { count: componentInstanceCount })
    }
  }

  await supabase
    .from('prototype_test_prototypes')
    .update({
      last_synced_at: new Date().toISOString(),
      figma_file_modified_at: fileData.lastModified,
      sync_status: 'synced',
      frame_count: frames?.length || 0,
    })
    .eq('id', prototype.id)

  enqueue({
    topic: 'prototype-synced',
    data: {
      resourceType: 'prototype',
      action: 'sync',
      userId,
      studyId: params.studyId,
      frameCount: frames?.length || 0,
      componentVariantCount,
      componentInstanceCount,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { data: { prototype, frames, componentVariantCount, componentInstanceCount } },
  }
}
