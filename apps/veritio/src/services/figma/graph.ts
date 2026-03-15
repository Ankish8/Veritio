/**
 * Figma Graph Traversal
 *
 * Internal helpers for traversing the Figma prototype interaction graph.
 * Used by frames.ts and components.ts for prototype flow detection.
 */

import type { FigmaNode, FigmaDocument, FigmaLogger } from './types'

/**
 * Recursively find all frames in a node tree (for nested overlay detection)
 * Also traverses into SECTION and GROUP containers which can contain overlay targets
 */
export function collectNestedFrames(
  node: FigmaNode,
  pageName: string,
  frameMap: Map<string, { node: FigmaNode; pageName: string }>,
  depth: number = 0
): void {
  // Increase depth limit - overlays can be deeply nested in complex files
  if (depth > 10) return

  if (node.children) {
    for (const child of node.children) {
      if (!child) continue

      // Collect frames, components, instances as potential overlay targets
      if (child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'INSTANCE') {
        if (!frameMap.has(child.id)) {
          frameMap.set(child.id, { node: child, pageName })
        }
        // Continue recursing into this frame's children
        collectNestedFrames(child, pageName, frameMap, depth + 1)
      }
      // Also recurse into SECTION and GROUP containers - they can contain overlay targets
      else if (child.type === 'SECTION' || child.type === 'GROUP') {
        collectNestedFrames(child, pageName, frameMap, depth + 1)
      }
    }
  }
}

/**
 * Build a map of all frames in the document.
 * Tracks two levels:
 * - Top-level frames (direct children of CANVAS pages) → actual screens
 * - Nested frames (deeply nested) → only used for overlay target lookup in BFS
 *
 * Returns both the full map and a set of top-level frame IDs.
 */
export function buildFrameMap(document: FigmaDocument, logger?: FigmaLogger): {
  frameMap: Map<string, { node: FigmaNode; pageName: string }>;
  topLevelFrameIds: Set<string>;
} {
  const frameMap = new Map<string, { node: FigmaNode; pageName: string }>()
  const topLevelFrameIds = new Set<string>()

  logger?.info('[buildFrameMap] Starting frame detection', {
    pageCount: document.children?.length || 0,
    pages: document.children?.map(p => ({ name: p.name, type: p.type })) as unknown as Record<string, unknown>,
  })

  document.children?.forEach(page => {
    if (page && page.type === 'CANVAS' && page.children) {
      const topLevelFrames: string[] = []
      page.children.forEach(child => {
        if (!child) return

        // Collect frames, components, instances as potential overlay targets
        if (child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'INSTANCE') {
          frameMap.set(child.id, { node: child, pageName: page.name })
          topLevelFrameIds.add(child.id)
          topLevelFrames.push(`${child.name} (${child.id})`)

          // Also collect nested frames (for overlay BFS lookup only)
          collectNestedFrames(child, page.name, frameMap, 1)
        }
        // Also traverse SECTION and GROUP at page level - they can contain overlay targets
        else if (child.type === 'SECTION' || child.type === 'GROUP') {
          collectNestedFrames(child, page.name, frameMap, 1)
        }
      })
      logger?.info(`[buildFrameMap] Page "${page.name}": ${topLevelFrames.length} top-level frames`, {
        frames: topLevelFrames.slice(0, 10) as unknown as Record<string, unknown>,
        hasMore: topLevelFrames.length > 10,
      })
    }
  })

  logger?.info('[buildFrameMap] Total', {
    topLevel: topLevelFrameIds.size,
    nested: frameMap.size - topLevelFrameIds.size,
  })
  return { frameMap, topLevelFrameIds }
}

/**
 * Get all destination node IDs from a node's interactions.
 * Traverses both the new `interactions` field and legacy `transitionNodeID`.
 */
export function getInteractionDestinations(node: FigmaNode, logPrefix?: string, logger?: FigmaLogger): string[] {
  const destinations: string[] = []

  // Check new interactions array
  if (node.interactions && node.interactions.length > 0) {
    for (const interaction of node.interactions) {
      // Guard against null/undefined actions array
      if (!interaction.actions || !Array.isArray(interaction.actions)) {
        continue
      }

      for (const action of interaction.actions) {
        // Guard against null/undefined action items
        if (action && action.destinationId) {
          destinations.push(action.destinationId)
          // Log overlay-related actions for debugging
          if (logPrefix && (action.type === 'OVERLAY' || action.navigation === 'OVERLAY')) {
            logger?.info(`[${logPrefix}] Found OVERLAY action`, {
              nodeId: node.id,
              nodeName: node.name,
              actionType: action.type,
              navigation: action.navigation,
              destinationId: action.destinationId,
            })
          }
        }
      }
    }
  }

  // Check legacy transitionNodeID
  if (node.transitionNodeID) {
    destinations.push(node.transitionNodeID)
  }

  return destinations
}

/**
 * Recursively find all interaction destinations within a frame and its children.
 */
export function findAllDestinationsInNode(node: FigmaNode, logPrefix?: string, logger?: FigmaLogger): string[] {
  const destinations = getInteractionDestinations(node, logPrefix, logger)

  // Also check children for nested interactions
  if (node.children) {
    for (const child of node.children) {
      destinations.push(...findAllDestinationsInNode(child, logPrefix, logger))
    }
  }

  return destinations
}

/**
 * Traverse the prototype graph to find all reachable frames from flow starting points.
 * Uses BFS to find all frames connected via prototype interactions.
 */
export function traversePrototypeGraph(
  startingFrameIds: string[],
  frameMap: Map<string, { node: FigmaNode; pageName: string }>,
  logger?: FigmaLogger
): Set<string> {
  const visited = new Set<string>()
  const queue = [...startingFrameIds]
  const missingDestinations: string[] = [] // Track destinations not in frameMap

  logger?.info('[traversePrototypeGraph] Starting traversal', {
    startingFrameIds: startingFrameIds as unknown as Record<string, unknown>,
    totalFramesInMap: frameMap.size,
  })

  while (queue.length > 0) {
    const frameId = queue.shift()!
    if (visited.has(frameId)) continue
    visited.add(frameId)

    const frameData = frameMap.get(frameId)
    if (!frameData) {
      logger?.warn(`[traversePrototypeGraph] Frame not in map: ${frameId}`)
      continue
    }

    // Find all destinations from this frame's interactions
    const destinations = findAllDestinationsInNode(frameData.node, frameData.node.name, logger)

    if (destinations.length > 0) {
      logger?.info(`[traversePrototypeGraph] Frame "${frameData.node.name}" (${frameId}) has destinations`, {
        destinations: destinations as unknown as Record<string, unknown>,
      })
    }

    for (const destId of destinations) {
      if (!visited.has(destId)) {
        if (frameMap.has(destId)) {
          queue.push(destId)
        } else {
          // Destination exists in interactions but not in frameMap!
          // This is likely an overlay frame that wasn't detected
          missingDestinations.push(destId)
          logger?.warn(`[traversePrototypeGraph] Destination ${destId} NOT in frameMap (possibly an overlay?)`)
        }
      }
    }
  }

  logger?.info('[traversePrototypeGraph] Traversal complete', {
    visitedCount: visited.size,
    visitedFrames: Array.from(visited) as unknown as Record<string, unknown>,
    missingDestinations: [...new Set(missingDestinations)] as unknown as Record<string, unknown>,
  })

  return visited
}

/**
 * Collect all node IDs that are destinations of OVERLAY interactions.
 * Only walks frames in the connected set (not the entire document) to avoid
 * flagging overlays from unrelated pages.
 */
export function collectOverlayDestinations(
  frameMap: Map<string, { node: FigmaNode; pageName: string }>,
  connectedFrameIds: Set<string>,
  logger?: FigmaLogger
): Set<string> {
  const overlayDestIds = new Set<string>()

  function walkNode(node: FigmaNode): void {
    if (node.interactions) {
      for (const interaction of node.interactions) {
        if (!interaction.actions || !Array.isArray(interaction.actions)) continue
        for (const action of interaction.actions) {
          if (action && action.destinationId &&
              (action.navigation === 'OVERLAY' || action.type === 'OVERLAY')) {
            overlayDestIds.add(action.destinationId)
          }
        }
      }
    }
    if (node.children) {
      for (const child of node.children) {
        if (child) walkNode(child)
      }
    }
  }

  connectedFrameIds.forEach(frameId => {
    const frameData = frameMap.get(frameId)
    if (frameData) walkNode(frameData.node)
  })

  if (overlayDestIds.size > 0) {
    logger?.info('[collectOverlayDestinations] Found overlay targets', {
      count: overlayDestIds.size,
      ids: Array.from(overlayDestIds) as unknown as Record<string, unknown>,
    })
  }

  return overlayDestIds
}
