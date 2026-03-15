export interface FlowStartingPoint {
  nodeId: string
  name: string
}

export interface FigmaInteractionAction {
  type: string
  destinationId?: string
  navigation?: string
}

export interface FigmaInteraction {
  trigger: { type: string }
  actions: FigmaInteractionAction[]
}

export interface FigmaBoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface FigmaNode {
  id: string
  name: string
  type: string
  children?: FigmaNode[]
  flowStartingPoints?: FlowStartingPoint[]
  interactions?: FigmaInteraction[]
  transitionNodeID?: string
  absoluteBoundingBox?: FigmaBoundingBox
}

export interface FigmaDocument {
  id: string
  name: string
  type: string
  children: FigmaNode[]
}

export interface FigmaFile {
  name: string
  lastModified: string
  thumbnailUrl: string
  version: string
  document: FigmaDocument
}

export interface FigmaFrame {
  nodeId: string
  name: string
  type: 'FRAME' | 'COMPONENT' | 'INSTANCE'
  pageName: string
  flowName?: string
  width?: number
  height?: number
}

export interface FigmaImageResponse {
  images: Record<string, string>
}

export interface FigmaApiError {
  status: number
  err: string
}

const FIGMA_API_BASE = 'https://api.figma.com/v1'

function getLegacyFigmaToken(): string {
  return process.env.FIGMA_ACCESS_TOKEN || ''
}

export async function getFileMetadata(
  fileKey: string,
  accessToken?: string
): Promise<{ data: FigmaFile | null; error: Error | null }> {
  const token = accessToken || getLegacyFigmaToken()

  if (!token) {
    return {
      data: null,
      error: new Error('Please connect your Figma account to import prototypes.'),
    }
  }

  try {
    const headers: Record<string, string> = accessToken
      ? { 'Authorization': `Bearer ${token}` }
      : { 'X-Figma-Token': token }

    const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as FigmaApiError

      if (response.status === 404) {
        return { data: null, error: new Error('Figma file not found. Make sure the file exists and is accessible.') }
      }
      if (response.status === 403) {
        return {
          data: null,
          error: new Error('Permission denied. Please check that your connected Figma account has access to this file.')
        }
      }
      if (response.status === 401) {
        return { data: null, error: new Error('Figma session expired. Please reconnect your Figma account.') }
      }
      return { data: null, error: new Error(errorData.err || `Figma API error: ${response.status}`) }
    }

    const data = await response.json() as FigmaFile
    return { data, error: null }
  } catch (err) {
    return { data: null, error: new Error(`Failed to fetch Figma file: ${err instanceof Error ? err.message : 'Unknown error'}`) }
  }
}

function buildFrameMap(document: FigmaDocument): Map<string, { node: FigmaNode; pageName: string }> {
  const frameMap = new Map<string, { node: FigmaNode; pageName: string }>()

  document.children?.forEach(page => {
    if (page && page.type === 'CANVAS' && page.children) {
      page.children.forEach(child => {
        if (child && (child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'INSTANCE')) {
          frameMap.set(child.id, { node: child, pageName: page.name })
        }
      })
    }
  })

  return frameMap
}

function getInteractionDestinations(node: FigmaNode): string[] {
  const destinations: string[] = []

  if (node.interactions) {
    for (const interaction of node.interactions) {
      if (!interaction.actions || !Array.isArray(interaction.actions)) {
        continue
      }

      for (const action of interaction.actions) {
        if (action && action.destinationId) {
          destinations.push(action.destinationId)
        }
      }
    }
  }

  if (node.transitionNodeID) {
    destinations.push(node.transitionNodeID)
  }

  return destinations
}
function findAllDestinationsInNode(node: FigmaNode): string[] {
  const destinations = getInteractionDestinations(node)

  if (node.children) {
    for (const child of node.children) {
      destinations.push(...findAllDestinationsInNode(child))
    }
  }

  return destinations
}
function traversePrototypeGraph(
  startingFrameIds: string[],
  frameMap: Map<string, { node: FigmaNode; pageName: string }>
): Set<string> {
  const visited = new Set<string>()
  const queue = [...startingFrameIds]

  while (queue.length > 0) {
    const frameId = queue.shift()!
    if (visited.has(frameId)) continue
    visited.add(frameId)

    const frameData = frameMap.get(frameId)
    if (!frameData) continue

    const destinations = findAllDestinationsInNode(frameData.node)

    for (const destId of destinations) {
      if (!visited.has(destId) && frameMap.has(destId)) {
        queue.push(destId)
      }
    }
  }

  return visited
}
export function extractFrames(document: FigmaDocument): FigmaFrame[] {
  const frameMap = buildFrameMap(document)

  const flowStartingPoints: Array<{ nodeId: string; flowName: string; pageName: string }> = []

  document.children?.forEach(page => {
    if (page.type === 'CANVAS' && page.flowStartingPoints) {
      for (const flow of page.flowStartingPoints) {
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

  if (flowStartingPoints.length === 0) {
    const frames: FigmaFrame[] = []
    frameMap.forEach(({ node, pageName }) => {
      frames.push({
        nodeId: node.id,
        name: node.name,
        type: node.type as 'FRAME' | 'COMPONENT' | 'INSTANCE',
        pageName,
        width: node.absoluteBoundingBox?.width,
        height: node.absoluteBoundingBox?.height,
      })
    })
    return frames
  }

  const startingIds = flowStartingPoints.map(f => f.nodeId)
  const reachableFrameIds = traversePrototypeGraph(startingIds, frameMap)

  const flowNameMap = new Map(flowStartingPoints.map(f => [f.nodeId, f.flowName]))
  const frames: FigmaFrame[] = []

  reachableFrameIds.forEach(frameId => {
    const frameData = frameMap.get(frameId)
    if (frameData) {
      frames.push({
        nodeId: frameData.node.id,
        name: frameData.node.name,
        type: frameData.node.type as 'FRAME' | 'COMPONENT' | 'INSTANCE',
        pageName: frameData.pageName,
        flowName: flowNameMap.get(frameId),
        width: frameData.node.absoluteBoundingBox?.width,
        height: frameData.node.absoluteBoundingBox?.height,
      })
    }
  })

  return frames
}

export async function getNodeImages(
  fileKey: string,
  nodeIds: string[],
  accessToken?: string,
  scale: number = 0.5
): Promise<{ data: Record<string, string> | null; error: Error | null }> {
  const token = accessToken || getLegacyFigmaToken()

  if (!token) {
    return { data: null, error: new Error('Figma not connected') }
  }

  if (nodeIds.length === 0) {
    return { data: {}, error: null }
  }

  const idsParam = nodeIds.map(id => encodeURIComponent(id)).join(',')

  try {
    const headers: Record<string, string> = accessToken
      ? { 'Authorization': `Bearer ${token}` }
      : { 'X-Figma-Token': token }

    const response = await fetch(
      `${FIGMA_API_BASE}/images/${fileKey}?ids=${idsParam}&scale=${scale}&format=png`,
      { headers }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as FigmaApiError
      return { data: null, error: new Error(errorData.err || `Figma API error: ${response.status}`) }
    }

    const data = await response.json() as FigmaImageResponse

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
export async function syncFileFrames(
  fileKey: string,
  accessToken?: string
): Promise<{
  data: {
    fileName: string
    lastModified: string
    frames: Array<{
      nodeId: string
      name: string
      thumbnailUrl: string | null
      position: number
      pageName: string
      width?: number
      height?: number
    }>
  } | null
  error: Error | null
}> {
  const { data: file, error: fileError } = await getFileMetadata(fileKey, accessToken)
  if (fileError || !file) {
    return { data: null, error: fileError }
  }

  const frames = extractFrames(file.document)
  if (frames.length === 0) {
    return { data: null, error: new Error('No frames found in Figma file. Make sure your file has at least one frame.') }
  }

  const nodeIds = frames.map(f => f.nodeId)
  const { data: images } = await getNodeImages(fileKey, nodeIds, accessToken)

  const framesWithThumbnails = frames.map((frame, index) => ({
    nodeId: frame.nodeId,
    name: frame.name,
    thumbnailUrl: images?.[frame.nodeId] || null,
    position: index,
    pageName: frame.pageName,
    width: frame.width,
    height: frame.height,
  }))

  return {
    data: {
      fileName: file.name,
      lastModified: file.lastModified,
      frames: framesWithThumbnails,
    },
    error: null,
  }
}

import type { PrototypeScaleMode } from '../lib/supabase/types'

const SCALE_MODE_MAP: Record<PrototypeScaleMode, string> = {
  '100%': 'min-zoom',
  'fit': 'scale-down',
  'fill': 'contain',
  'width': 'fit-width',
}

export interface GenerateEmbedUrlOptions {
  startNodeId?: string | null
  enableEmbedApi?: boolean
  showHotspotHints?: boolean
  bgColor?: string
  scaleMode?: PrototypeScaleMode | boolean | null
}
export function generateEmbedUrl(
  figmaUrl: string,
  options: GenerateEmbedUrlOptions | string | null = {}
): string {
  const opts: GenerateEmbedUrlOptions = typeof options === 'string' || options === null
    ? { startNodeId: options }
    : options

  const {
    startNodeId,
    enableEmbedApi = false,
    showHotspotHints = false,
    bgColor = 'F5F5F5',
    scaleMode = 'fit',
  } = opts

  let baseUrl = figmaUrl
  if (!figmaUrl.includes('/proto/')) {
    baseUrl = figmaUrl
      .replace('/file/', '/proto/')
      .replace('/design/', '/proto/')
  }

  const url = new URL(baseUrl)

  if (startNodeId) {
    url.searchParams.set('node-id', startNodeId)
    url.searchParams.set('starting-point-node-id', startNodeId)
  }

  url.searchParams.set('hide-ui', '1')

  const embedUrl = new URL('https://www.figma.com/embed')
  embedUrl.searchParams.set('embed_host', 'veritio')
  embedUrl.searchParams.set('url', url.toString())
  embedUrl.searchParams.set('kit', 'v2')
  embedUrl.searchParams.set('hotspot-hints', showHotspotHints ? '1' : '0')

  let resolvedScaleMode: PrototypeScaleMode = 'fit'
  if (scaleMode === null || scaleMode === undefined) {
    resolvedScaleMode = 'fit'
  } else if (typeof scaleMode === 'boolean') {
    resolvedScaleMode = scaleMode ? 'fit' : '100%'
  } else if (SCALE_MODE_MAP[scaleMode]) {
    resolvedScaleMode = scaleMode
  }
  const figmaScaling = SCALE_MODE_MAP[resolvedScaleMode]
  embedUrl.searchParams.set('scaling', figmaScaling)
  embedUrl.searchParams.set('bg-color', bgColor)

  if (enableEmbedApi) {
    const clientId = process.env.NEXT_PUBLIC_FIGMA_EMBED_CLIENT_ID
    if (clientId) {
      embedUrl.searchParams.set('client-id', clientId)
    }
  }

  return embedUrl.toString()
}
export function generatePrototypeUrl(
  figmaUrl: string,
  startNodeId?: string | null
): string {
  let baseUrl = figmaUrl
  if (!figmaUrl.includes('/proto/')) {
    baseUrl = figmaUrl
      .replace('/file/', '/proto/')
      .replace('/design/', '/proto/')
  }

  if (!startNodeId) {
    return baseUrl
  }

  const url = new URL(baseUrl)
  url.searchParams.set('node-id', startNodeId)
  return url.toString()
}
