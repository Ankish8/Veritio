/**
 * Figma Component Handling
 *
 * Functions for identifying, fetching, and exporting component variants
 * from Figma files, including library components.
 */

import type {
  FigmaFile,
  FigmaNode,
  FigmaDocument,
  FigmaBoundingBox,
  ComponentVariantInfo,
  ComponentVariantImage,
  ComponentInstanceInfo,
  FigmaLogger,
} from './types'
import { getComponentByKey, getComponentSetByKey, getFileNodes } from './api'
import { getNodeImages } from './frames'

/**
 * Identify library components used in the file that are NOT defined locally.
 * These need to be fetched separately to get all their variants.
 *
 * @param file - The Figma file data
 * @param localComponentSetIds - Set of component set IDs found in the local file
 * @param usedComponentIds - Optional: Set of component IDs actually used on synced frames.
 *                           If provided, only returns library components in this set.
 *                           This dramatically reduces API calls by filtering out unused components.
 * @returns Array of library component keys that need to be fetched
 */
export function identifyLibraryComponents(
  file: FigmaFile,
  localComponentSetIds: Set<string>,
  usedComponentIds?: Set<string>
): { componentKey: string; componentSetKey?: string; nodeId: string }[] {
  const libraryComponents: { componentKey: string; componentSetKey?: string; nodeId: string }[] = []

  if (!file.components) {
    return libraryComponents
  }

  for (const [nodeId, meta] of Object.entries(file.components)) {
    // SMART FILTERING: If usedComponentIds is provided, skip components not used on frames
    // The nodeId in file.components is the component's node ID, which matches componentId on instances
    if (usedComponentIds && !usedComponentIds.has(nodeId)) {
      continue
    }

    // If the component has a componentSetId that's NOT in our local sets,
    // it's a library component we need to fetch
    if (meta.componentSetId && !localComponentSetIds.has(meta.componentSetId)) {
      libraryComponents.push({
        componentKey: meta.key,
        nodeId,
      })
    }
    // Also include components without a componentSetId but with a key
    // (standalone library components, not variants)
    else if (!meta.componentSetId && meta.key) {
      // Check if this node ID exists in any local component set
      const isLocalComponent = localComponentSetIds.has(nodeId)
      if (!isLocalComponent) {
        libraryComponents.push({
          componentKey: meta.key,
          nodeId,
        })
      }
    }
  }

  return libraryComponents
}

/**
 * Fetch all variants for a library component by getting its component set.
 * Returns the file key and node IDs for all variants so we can export their images.
 *
 * @param componentKey - Key of a component (variant) from the library
 * @param accessToken - OAuth access token
 * @returns Object containing file_key and variant node_ids, or error
 */
export async function getLibraryComponentVariants(
  componentKey: string,
  accessToken?: string
): Promise<{
  data: {
    fileKey: string
    componentSetKey: string
    componentSetNodeId: string
    componentSetName: string
  } | null
  error: Error | null
}> {
  // First, get the component details to find its component_set_key
  const { data: component, error: componentError } = await getComponentByKey(componentKey, accessToken)

  if (componentError || !component) {
    return { data: null, error: componentError || new Error('Component not found') }
  }

  // If this component is part of a set, get the set details
  if (component.meta.component_set_key) {
    const { data: componentSet, error: setError } = await getComponentSetByKey(
      component.meta.component_set_key,
      accessToken
    )

    if (setError || !componentSet) {
      return { data: null, error: setError || new Error('Component set not found') }
    }

    return {
      data: {
        fileKey: componentSet.meta.file_key,
        componentSetKey: component.meta.component_set_key,
        componentSetNodeId: componentSet.meta.node_id,
        componentSetName: componentSet.meta.name,
      },
      error: null,
    }
  }

  // Not part of a set, just a standalone component
  return {
    data: {
      fileKey: component.meta.file_key,
      componentSetKey: componentKey,
      componentSetNodeId: component.meta.node_id,
      componentSetName: component.meta.name,
    },
    error: null,
  }
}

/**
 * Fetch all variants from a library component set and return their IDs for image export.
 *
 * @param fileKey - The library file key
 * @param componentSetNodeId - The node ID of the component set
 * @param componentSetName - The name of the component set
 * @param accessToken - OAuth access token
 * @returns Array of variant info for image export
 */
export async function fetchLibraryComponentSetVariants(
  fileKey: string,
  componentSetNodeId: string,
  componentSetName: string,
  accessToken?: string
): Promise<{
  data: {
    componentSetId: string
    componentSetName: string
    variants: {
      variantId: string
      variantName: string
      properties: Record<string, string>
      width?: number
      height?: number
    }[]
  } | null
  error: Error | null
}> {
  // Fetch the component set node to get its children (variants)
  const { data: nodesData, error: nodesError } = await getFileNodes(
    fileKey,
    [componentSetNodeId],
    accessToken
  )

  if (nodesError || !nodesData) {
    return { data: null, error: nodesError || new Error('Failed to fetch component set nodes') }
  }

  // Get the component set node
  const componentSetData = nodesData.nodes[componentSetNodeId]
  if (!componentSetData?.document) {
    return { data: null, error: new Error('Component set node not found in response') }
  }

  const componentSetNode = componentSetData.document

  // Extract variants from children
  const variants: {
    variantId: string
    variantName: string
    properties: Record<string, string>
    width?: number
    height?: number
  }[] = []

  if (componentSetNode.children) {
    for (const child of componentSetNode.children) {
      if (child.type === 'COMPONENT') {
        // Parse variant properties from the name (e.g., "State=Active, Size=Large")
        const properties: Record<string, string> = {}
        const nameParts = child.name.split(',').map(p => p.trim())
        for (const part of nameParts) {
          const [key, value] = part.split('=').map(s => s.trim())
          if (key && value) {
            properties[key] = value
          }
        }

        variants.push({
          variantId: child.id,
          variantName: child.name,
          properties,
          width: child.absoluteBoundingBox?.width,
          height: child.absoluteBoundingBox?.height,
        })
      }
    }
  }

  return {
    data: {
      componentSetId: componentSetNodeId,
      componentSetName,
      variants,
    },
    error: null,
  }
}

/**
 * Detect interactive components (component sets with variants) in a Figma file.
 * Traverses the document tree looking for COMPONENT_SET nodes.
 *
 * @param document - The Figma document tree
 * @param frameNodeIds - Optional: Only detect components within these frames (smart filtering)
 * @param logger - Optional logger for structured logging
 * @returns Array of component variant information
 */
export function detectInteractiveComponents(
  document: FigmaDocument,
  frameNodeIds?: string[],
  logger?: FigmaLogger
): ComponentVariantInfo[] {
  const componentVariants: ComponentVariantInfo[] = []
  const usedComponentInstances = new Set<string>() // Track component instances found in frames

  // First pass: Find component instances within target frames (if filtering enabled)
  if (frameNodeIds && frameNodeIds.length > 0) {
    const frameSet = new Set(frameNodeIds)

    function findComponentInstancesInFrames(node: FigmaNode) {
      // Check if this is one of our target frames
      if (frameSet.has(node.id)) {
        // Traverse this frame's children to find component instances
        function collectInstances(n: FigmaNode) {
          if (n.type === 'INSTANCE' && n.componentId) {
            // Track the componentId (which points to the COMPONENT variant node)
            // This is what we need to match against variant IDs in component sets
            usedComponentInstances.add(n.componentId)
          }
          if (n.children) {
            for (const child of n.children) {
              collectInstances(child)
            }
          }
        }
        collectInstances(node)
      }

      // Continue traversing to find all frames
      if (node.children) {
        for (const child of node.children) {
          findComponentInstancesInFrames(child)
        }
      }
    }

    findComponentInstancesInFrames(document as unknown as FigmaNode)
  }

  // Second pass: Collect component sets
  function traverseNode(node: FigmaNode) {
    // Found a component set - this contains variants
    if (node.type === 'COMPONENT_SET') {
      const variants: ComponentVariantInfo['variants'] = []

      // DEBUG: Log the first component set's structure
      if (componentVariants.length === 0 && node.children?.[0]) {
        logger?.info('[DEBUG] First COMPONENT_SET child structure', {
          childId: node.children[0].id,
          childType: node.children[0].type,
          childName: node.children[0].name,
          hasAbsoluteBoundingBox: !!node.children[0].absoluteBoundingBox,
          absoluteBoundingBox: node.children[0].absoluteBoundingBox as unknown as Record<string, unknown>,
          // Check if size is stored differently
          size: (node.children[0] as any).size,
          // Log all keys on the child
          childKeys: Object.keys(node.children[0]) as unknown as Record<string, unknown>,
        })
      }

      // Each child of a COMPONENT_SET is a variant
      if (node.children) {
        for (const child of node.children) {
          if (child.type === 'COMPONENT') {
            // Parse variant properties from the component name
            // Figma formats them as "Property1=Value1, Property2=Value2"
            const properties: Record<string, string> = {}
            const nameParts = child.name.split(',').map(p => p.trim())

            for (const part of nameParts) {
              const [key, value] = part.split('=').map(s => s.trim())
              if (key && value) {
                properties[key] = value
              }
            }

            variants.push({
              variantId: child.id,
              variantName: child.name,
              properties,
              // Extract variant dimensions from absoluteBoundingBox (critical for accurate compositing)
              width: child.absoluteBoundingBox?.width,
              height: child.absoluteBoundingBox?.height,
            })
          }
        }
      }

      // Only include this component set if:
      // 1. No filtering (frameNodeIds not provided), OR
      // 2. At least one variant is used in the target frames
      const shouldInclude = !frameNodeIds || variants.some(v => usedComponentInstances.has(v.variantId))

      if (variants.length > 0 && shouldInclude) {
        componentVariants.push({
          componentSetId: node.id,
          componentSetName: node.name,
          variants,
        })
      }
    }

    // Recursively traverse children
    if (node.children) {
      for (const child of node.children) {
        traverseNode(child)
      }
    }
  }

  // Start traversal from document root
  traverseNode(document as unknown as FigmaNode)

  return componentVariants
}

/**
 * Detect component instances within frames and calculate their relative positions.
 * This enables accurate compositing of variant images on frame thumbnails.
 *
 * @param document - The Figma document tree from getFileMetadata
 * @param frameNodeIds - Array of frame node IDs to search within
 * @param componentSetMap - Map of componentId → componentSetId for linking instances to variants
 * @returns Array of component instance position information
 */
export function detectComponentInstances(
  document: FigmaDocument,
  frameNodeIds: string[],
  componentSetMap: Map<string, string> // componentId → componentSetId
): ComponentInstanceInfo[] {
  const instances: ComponentInstanceInfo[] = []
  const frameSet = new Set(frameNodeIds)

  // Build a map of frames with their bounding boxes
  const frameMap = new Map<string, { node: FigmaNode; bbox: FigmaBoundingBox }>()

  function findFrames(node: FigmaNode) {
    if (frameSet.has(node.id) && node.absoluteBoundingBox) {
      frameMap.set(node.id, { node, bbox: node.absoluteBoundingBox })
    }
    if (node.children) {
      for (const child of node.children) {
        findFrames(child)
      }
    }
  }

  // First pass: find all target frames
  findFrames(document as unknown as FigmaNode)

  // Second pass: find instances within each frame
  function findInstancesInFrame(
    node: FigmaNode,
    frameNodeId: string,
    frameBbox: FigmaBoundingBox
  ) {
    // Track component instances AND nested frame nodes.
    // Figma click events may reference nearestScrollingFrameId for nested FRAME nodes,
    // so we store their positions to rebase click coordinates accurately.
    const isComponentInstance = node.type === 'INSTANCE' && !!node.componentId
    const isNestedFrameNode = node.type === 'FRAME'

    if ((isComponentInstance || isNestedFrameNode) && node.absoluteBoundingBox) {
      const instanceBbox = node.absoluteBoundingBox

      // Calculate position relative to frame
      const relativeX = instanceBbox.x - frameBbox.x
      const relativeY = instanceBbox.y - frameBbox.y

      // Look up the component set ID only for true component instances
      const componentSetId = isComponentInstance && node.componentId
        ? componentSetMap.get(node.componentId)
        : undefined

      instances.push({
        instanceId: node.id,
        instanceName: node.name,
        frameNodeId,
        // component_id is required in the backing table; for non-component frame nodes
        // we persist node.id so they are still addressable for coordinate rebasing.
        componentId: node.componentId || node.id,
        componentSetId,
        relativeX,
        relativeY,
        width: instanceBbox.width,
        height: instanceBbox.height,
        frameWidth: frameBbox.width,
        frameHeight: frameBbox.height,
      })
    }

    // Recursively search children
    if (node.children) {
      for (const child of node.children) {
        findInstancesInFrame(child, frameNodeId, frameBbox)
      }
    }
  }

  // Search each frame for instances
  for (const [frameId, { node, bbox }] of frameMap) {
    if (node.children) {
      for (const child of node.children) {
        findInstancesInFrame(child, frameId, bbox)
      }
    }
  }

  return instances
}

/**
 * Build a map from componentId to componentSetId by traversing component sets.
 * This is needed to link instances to their variant images.
 *
 * @param document - The Figma document tree
 * @returns Map of componentId → componentSetId
 */
export function buildComponentSetMap(document: FigmaDocument): Map<string, string> {
  const map = new Map<string, string>()

  function traverse(node: FigmaNode) {
    if (node.type === 'COMPONENT_SET' && node.children) {
      // Each child of a COMPONENT_SET is a COMPONENT variant
      for (const child of node.children) {
        if (child.type === 'COMPONENT') {
          map.set(child.id, node.id)
        }
      }
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child)
      }
    }
  }

  traverse(document as unknown as FigmaNode)
  return map
}

/**
 * Export images for all component variants using Figma's image export API.
 * Batches requests to stay within API limits (100 nodes per request).
 *
 * @param fileKey - The Figma file key
 * @param componentVariants - Component variant information from detectInteractiveComponents
 * @param accessToken - OAuth access token
 * @param scale - Image scale (default 1.0 for full resolution)
 * @returns Array of component variant images with URLs
 */
export async function exportComponentVariantImages(
  fileKey: string,
  componentVariants: ComponentVariantInfo[],
  accessToken?: string,
  scale: number = 1.0
): Promise<{ data: ComponentVariantImage[] | null; error: Error | null }> {
  if (componentVariants.length === 0) {
    return { data: [], error: null }
  }

  // Collect all variant node IDs
  const allVariantIds: string[] = []
  const variantMap = new Map<string, {
    setId: string
    setName: string
    variantName: string
    properties: Record<string, string>
    width?: number
    height?: number
  }>()

  for (const componentSet of componentVariants) {
    for (const variant of componentSet.variants) {
      allVariantIds.push(variant.variantId)
      variantMap.set(variant.variantId, {
        setId: componentSet.componentSetId,
        setName: componentSet.componentSetName,
        variantName: variant.variantName,
        properties: variant.properties,
        width: variant.width,
        height: variant.height,
      })
    }
  }

  // Batch into chunks of 100 (Figma API limit)
  const BATCH_SIZE = 100
  const batches: string[][] = []
  for (let i = 0; i < allVariantIds.length; i += BATCH_SIZE) {
    batches.push(allVariantIds.slice(i, i + BATCH_SIZE))
  }

  // Export images for all batches
  const allImages: ComponentVariantImage[] = []

  for (const batch of batches) {
    const { data: images, error } = await getNodeImages(fileKey, batch, accessToken, scale)

    if (error || !images) {
      return { data: null, error: error || new Error('Failed to export variant images') }
    }

    // Build ComponentVariantImage objects
    for (const [variantId, imageUrl] of Object.entries(images)) {
      const variantInfo = variantMap.get(variantId)
      if (variantInfo && imageUrl) {
        allImages.push({
          componentSetId: variantInfo.setId,
          componentSetName: variantInfo.setName,
          variantId,
          variantName: variantInfo.variantName,
          variantProperties: variantInfo.properties,
          imageUrl,
          // Include variant dimensions for accurate compositing
          width: variantInfo.width,
          height: variantInfo.height,
        })
      }
    }
  }

  return { data: allImages, error: null }
}
