/**
 * Figma Embed URL Generation
 *
 * Functions for generating Figma embed and prototype URLs.
 * Uses Figma Embed Kit 2.0 for interactive prototypes.
 */

import type { PrototypeScaleMode } from '@veritio/study-types'
import type { GenerateEmbedUrlOptions } from './types'

/**
 * Map our scale mode labels to Figma API scaling values
 * @see https://www.figma.com/developers/embed
 */
const SCALE_MODE_MAP: Record<PrototypeScaleMode, string> = {
  '100%': 'min-zoom',        // Original size, no scaling
  'fit': 'scale-down',       // Scale down to fit container (default)
  'fill': 'contain',         // Scale to fill container (may crop)
  'width': 'fit-width',      // Scale to fit container width
}

/**
 * Generate Figma embed URL for the prototype player.
 * Uses Figma Embed Kit 2.0 for interactive prototypes.
 *
 * When enableEmbedApi is true, adds the client-id parameter which enables:
 * - RESTART: Reset prototype to first frame
 * - NAVIGATE_FORWARD: Go to next page
 * - NAVIGATE_BACKWARD: Go to previous page
 * - NAVIGATE_TO_FRAME_AND_CLOSE_OVERLAYS: Jump to specific frame
 *
 * @param figmaUrl - The original Figma prototype URL
 * @param options - Optional configuration for the embed
 * @returns Embed URL for iframe
 *
 * @see https://www.figma.com/developers/embed
 */
export function generateEmbedUrl(
  figmaUrl: string,
  options: GenerateEmbedUrlOptions | string | null = {}
): string {
  // Handle legacy signature: generateEmbedUrl(url, startNodeId)
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

  // Convert to prototype URL format
  // Figma uses different URL patterns: /file/, /design/, /proto/
  let baseUrl = figmaUrl
  if (!figmaUrl.includes('/proto/')) {
    baseUrl = figmaUrl
      .replace('/file/', '/proto/')
      .replace('/design/', '/proto/')
  }

  // Parse and modify the prototype URL
  const url = new URL(baseUrl)

  // Set starting node if provided (these go on the inner prototype URL)
  if (startNodeId) {
    url.searchParams.set('node-id', startNodeId)
    url.searchParams.set('starting-point-node-id', startNodeId)
  }

  // Hide Figma UI elements for cleaner experience (inner URL)
  url.searchParams.set('hide-ui', '1')

  // Build the embed URL with embed_host on the OUTER URL (required by Figma)
  const embedUrl = new URL('https://www.figma.com/embed')
  embedUrl.searchParams.set('embed_host', 'veritio')
  embedUrl.searchParams.set('url', url.toString())
  // Enable Figma Embed Kit v2 for postMessage events (INITIAL_LOAD, PRESENTED_NODE_CHANGED, etc.)
  embedUrl.searchParams.set('kit', 'v2')
  // Hotspot hints must be on the OUTER embed URL (not the inner prototype URL)
  embedUrl.searchParams.set('hotspot-hints', showHotspotHints ? '1' : '0')
  // Set scaling mode - convert from our labels to Figma API values
  // Handle: null/undefined → 'fit', legacy boolean, or string value
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
  // Light background color (F5F5F5 = light gray, similar to Optimal Workshop)
  embedUrl.searchParams.set('bg-color', bgColor)

  // Add client-id to enable Embed API for prototype controls
  // This allows sending postMessage commands like RESTART, NAVIGATE_FORWARD, etc.
  if (enableEmbedApi) {
    const clientId = process.env.NEXT_PUBLIC_FIGMA_EMBED_CLIENT_ID
    if (clientId) {
      embedUrl.searchParams.set('client-id', clientId)
    }
  }

  return embedUrl.toString()
}

/**
 * Generate a direct prototype URL (not embedded).
 * Useful for "Open in Figma" links.
 *
 * @param figmaUrl - The original Figma prototype URL
 * @param startNodeId - Optional starting node/frame ID
 * @returns Direct prototype URL
 */
export function generatePrototypeUrl(
  figmaUrl: string,
  startNodeId?: string | null
): string {
  // Convert to prototype URL format
  // Figma uses different URL patterns: /file/, /design/, /proto/
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
