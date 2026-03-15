/**
 * Figma Frame Extraction
 *
 * Functions for extracting prototype-connected frames from Figma files
 * and fetching their thumbnail images.
 */

import type {
  FigmaDocument,
  FigmaFrame,
  FigmaImageResponse,
  FigmaApiError,
  FigmaLogger,
} from './types'
import { FIGMA_API_BASE, fetchWithTimeout, getLegacyFigmaToken } from './api'
import { buildFrameMap, traversePrototypeGraph, collectOverlayDestinations } from './graph'

/** Minimum dimension (px) for a FRAME to be considered a screen */
const MIN_SCREEN_DIMENSION = 200

/**
 * Check if a top-level node is likely a screen rather than a design element.
 *
 * - COMPONENT/INSTANCE at top level are almost always reusable elements (icons, buttons, cards),
 *   not screens. Only include them if they're at least phone-screen sized (300x500+).
 * - FRAME type: include if both dimensions >= 200px (filters out small utility frames).
 * - Unknown dimensions: include by default (can't determine size).
 */
function isLikelyScreen(type: string, width?: number, height?: number): boolean {
  if (width == null || height == null) return type === 'FRAME'

  // COMPONENT/INSTANCE at the top level are design building blocks, not screens.
  // Only include if they're at least phone-screen sized in both dimensions.
  if (type === 'COMPONENT' || type === 'INSTANCE') {
    return Math.min(width, height) >= 300 && Math.max(width, height) >= 500
  }

  // Regular FRAME: just needs to be reasonably sized
  return width >= MIN_SCREEN_DIMENSION && height >= MIN_SCREEN_DIMENSION
}

/** Keywords that indicate a frame is likely an overlay */
const OVERLAY_KEYWORDS = [
  'overlay', 'modal', 'dialog', 'drawer', 'panel', 'popup', 'menu',
  'dropdown', 'popover', 'sheet', 'sidebar', 'toast', 'tooltip',
  'alert', 'notification',
]

/**
 * Check if a frame name suggests it's an overlay based on common naming conventions.
 */
export function isOverlayByName(frameName: string): boolean {
  const lower = frameName.toLowerCase()
  return OVERLAY_KEYWORDS.some(kw => lower.includes(kw))
}

/**
 * Classify an overlay frame into one of the 5 DB-permitted types.
 * Uses name keywords first, then dimension-based fallback, then defaults to 'modal'.
 */
export function classifyOverlayType(
  name: string,
  width?: number,
  height?: number
): 'modal' | 'sheet' | 'popover' | 'panel' | 'toast' {
  const lower = name.toLowerCase()

  // Name-based classification (highest priority)
  if (lower.includes('toast') || lower.includes('notification') || lower.includes('alert')) return 'toast'
  if (lower.includes('sheet') || lower.includes('drawer') || lower.includes('sidebar')) return 'sheet'
  if (lower.includes('popover') || lower.includes('dropdown') || lower.includes('menu') || lower.includes('tooltip') || lower.includes('popup')) return 'popover'
  if (lower.includes('panel')) return 'panel'
  if (lower.includes('modal') || lower.includes('dialog') || lower.includes('overlay')) return 'modal'

  // Dimension-based fallback
  if (width != null && height != null) {
    const area = width * height
    if (area < 20000) return 'toast'
    if (area < 80000) return 'popover'
    if (width > height * 2) return 'sheet'
  }

  return 'modal'
}

/**
 * Extract prototype-connected frames from a Figma file.
 * Only returns frames that are part of the prototype flow (reachable from flow starting points).
 * Falls back to all frames if no prototype flows are defined.
 *
 * @param document - The Figma document tree
 * @param logger - Optional logger for structured logging
 * @returns Array of frame information for prototype-connected frames
 */
export function extractFrames(document: FigmaDocument, logger?: FigmaLogger): FigmaFrame[] {
  // Build a map of all frames (top-level + nested for overlay lookup)
  const { frameMap, topLevelFrameIds } = buildFrameMap(document, logger)

  // Find all flow starting points from all pages
  const flowStartingPoints: Array<{ nodeId: string; flowName: string; pageName: string }> = []

  document.children?.forEach(page => {
    if (page.type === 'CANVAS' && page.flowStartingPoints) {
      for (const flow of page.flowStartingPoints) {
        // Guard against null/undefined flow items (same pattern as actions)
        if (flow && flow.nodeId) {
          flowStartingPoints.push({
            nodeId: flow.nodeId,
            flowName: flow.name,
            pageName: page.name,
          })
        }
      }
    }
  })

  // If no flow starting points, fall back to returning only top-level frames
  if (flowStartingPoints.length === 0) {
    const overlayDestIds = collectOverlayDestinations(frameMap, topLevelFrameIds, logger)
    const frames: FigmaFrame[] = []
    let skippedSmall = 0
    topLevelFrameIds.forEach(frameId => {
      const frameData = frameMap.get(frameId)
      if (frameData) {
        const w = frameData.node.absoluteBoundingBox?.width
        const h = frameData.node.absoluteBoundingBox?.height
        if (!isLikelyScreen(frameData.node.type, w, h)) {
          skippedSmall++
          return
        }
        const nodeIsOverlay = overlayDestIds.has(frameData.node.id) || isOverlayByName(frameData.node.name)
        frames.push({
          nodeId: frameData.node.id,
          name: frameData.node.name,
          type: frameData.node.type as 'FRAME' | 'COMPONENT' | 'INSTANCE',
          pageName: frameData.pageName,
          width: frameData.node.absoluteBoundingBox?.width,
          height: frameData.node.absoluteBoundingBox?.height,
          isOverlay: nodeIsOverlay || undefined,
          overlayType: nodeIsOverlay ? classifyOverlayType(frameData.node.name, frameData.node.absoluteBoundingBox?.width, frameData.node.absoluteBoundingBox?.height) : undefined,
        })
      }
    })
    if (skippedSmall > 0) {
      logger?.info(`[extractFrames] Filtered out ${skippedSmall} non-screen frames`)
    }
    return frames
  }

  // Strategy: Include top-level frames from the primary flow's page,
  // PLUS any cross-page frames reachable via BFS (for overlays).
  //
  // Why not BFS-only? Interactive component navigation (tabs, toggles) doesn't
  // create frame-level `interactions` in the Figma document tree — it's handled
  // internally by Figma's component variant system. BFS only follows explicit
  // destinationId links, so it misses frames connected via component interactions.
  //
  // Why not all frames? Files may have unrelated pages (e.g., "Archive", "Draft")
  // with dozens of frames that shouldn't be synced.
  const primaryFlow = flowStartingPoints[0]
  logger?.info(`[extractFrames] Using primary flow: "${primaryFlow.flowName}" from page "${primaryFlow.pageName}"`)
  logger?.info(`[extractFrames] Total flows found: ${flowStartingPoints.length}, but only using first one`)

  // Step 1: Collect only TOP-LEVEL, screen-sized frames from the primary flow's page
  // (filters out small icons, buttons, and component frames)
  const primaryPageFrameIds = new Set<string>()
  let skippedSmall = 0
  topLevelFrameIds.forEach(frameId => {
    const frameData = frameMap.get(frameId)
    if (frameData && frameData.pageName === primaryFlow.pageName) {
      const w = frameData.node.absoluteBoundingBox?.width
      const h = frameData.node.absoluteBoundingBox?.height
      if (!isLikelyScreen(frameData.node.type, w, h)) {
        skippedSmall++
        return
      }
      primaryPageFrameIds.add(frameId)
    }
  })

  logger?.info(`[extractFrames] Primary page "${primaryFlow.pageName}" has ${primaryPageFrameIds.size} top-level frames`)
  if (skippedSmall > 0) {
    logger?.info(`[extractFrames] Filtered out ${skippedSmall} non-screen frames`)
  }

  // Step 2: Also traverse prototype graph for cross-page frames (overlays, modals)
  // BFS uses the full frameMap (including nested) to resolve overlay targets
  const reachableFrameIds = traversePrototypeGraph([primaryFlow.nodeId], frameMap, logger)

  // Step 3: Merge both sets — primary page top-level frames + BFS-reachable frames
  const allFrameIds = new Set([...primaryPageFrameIds, ...reachableFrameIds])

  logger?.info(`[extractFrames] Total frames: ${allFrameIds.size} (${primaryPageFrameIds.size} from page + ${reachableFrameIds.size} from BFS, deduplicated)`)

  // Detect overlay destinations only within connected frames
  const overlayDestIds = collectOverlayDestinations(frameMap, allFrameIds, logger)

  // Build result array with flow names for starting frames
  const flowNameMap = new Map(flowStartingPoints.map(f => [f.nodeId, f.flowName]))
  const frames: FigmaFrame[] = []

  allFrameIds.forEach(frameId => {
    const frameData = frameMap.get(frameId)
    if (frameData) {
      const nodeIsOverlay = overlayDestIds.has(frameData.node.id) || isOverlayByName(frameData.node.name)
      frames.push({
        nodeId: frameData.node.id,
        name: frameData.node.name,
        type: frameData.node.type as 'FRAME' | 'COMPONENT' | 'INSTANCE',
        pageName: frameData.pageName,
        flowName: flowNameMap.get(frameId),
        width: frameData.node.absoluteBoundingBox?.width,
        height: frameData.node.absoluteBoundingBox?.height,
        isOverlay: nodeIsOverlay || undefined,
        overlayType: nodeIsOverlay ? classifyOverlayType(frameData.node.name, frameData.node.absoluteBoundingBox?.width, frameData.node.absoluteBoundingBox?.height) : undefined,
      })
    }
  })

  return frames
}

/**
 * Get thumbnail images for specific nodes.
 *
 * @param fileKey - The Figma file key
 * @param nodeIds - Array of node IDs to get images for
 * @param accessToken - OAuth access token (optional)
 * @param scale - Image scale (default 0.5 for thumbnails)
 * @param logger - Optional logger for structured logging
 * @returns Map of nodeId to image URL
 */
export async function getNodeImages(
  fileKey: string,
  nodeIds: string[],
  accessToken?: string,
  scale: number = 0.5,
  logger?: FigmaLogger
): Promise<{ data: Record<string, string> | null; error: Error | null }> {
  const token = accessToken || getLegacyFigmaToken()

  if (!token) {
    return { data: null, error: new Error('Figma not connected') }
  }

  if (nodeIds.length === 0) {
    return { data: {}, error: null }
  }

  // Figma node IDs use ":" which needs to be URL encoded
  const idsParam = nodeIds.map(id => encodeURIComponent(id)).join(',')

  try {
    // Use Bearer token for OAuth, X-Figma-Token for PAT
    const headers: Record<string, string> = accessToken
      ? { 'Authorization': `Bearer ${token}` }
      : { 'X-Figma-Token': token }

    // Use timeout to prevent hanging on slow Figma responses
    const response = await fetchWithTimeout(
      `${FIGMA_API_BASE}/images/${fileKey}?ids=${idsParam}&scale=${scale}&format=png`,
      { headers },
      undefined,
      logger
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as FigmaApiError
      return { data: null, error: new Error(errorData.err || `Figma API error: ${response.status}`) }
    }

    const data = await response.json() as FigmaImageResponse

    // Decode node IDs back (they come back URL-encoded in response)
    const images: Record<string, string> = {}
    for (const [nodeId, url] of Object.entries(data.images)) {
      if (url) {
        images[decodeURIComponent(nodeId)] = url
      }
    }

    return { data: images, error: null }
  } catch (err) {
    return { data: null, error: new Error(`Failed to fetch Figma images: ${err instanceof Error ? err.message : 'Unknown error'}`) }
  }
}
