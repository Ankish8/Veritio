/**
 * Figma Sync Orchestrator
 *
 * Main sync function that orchestrates fetching file metadata,
 * extracting frames, and generating thumbnails.
 */

import type { FigmaLogger } from './types'
import { getFileMetadata } from './api'
import { extractFrames, getNodeImages } from './frames'

/**
 * Get file info and all frames with thumbnails.
 * This is the main function used by the sync process.
 *
 * @param fileKey - The Figma file key
 * @param accessToken - OAuth access token (optional, falls back to env token)
 * @param logger - Optional logger for structured logging
 * @returns Frames with metadata, thumbnails, and page names
 */
export async function syncFileFrames(
  fileKey: string,
  accessToken?: string,
  logger?: FigmaLogger
): Promise<{
  data: {
    fileName: string
    lastModified: string
    frames: Array<{
      nodeId: string
      name: string
      thumbnailUrl: string | null
      position: number
      /** The Figma page name containing this frame */
      pageName: string
      /** Frame width in pixels */
      width?: number
      /** Frame height in pixels */
      height?: number
    }>
  } | null
  error: Error | null
}> {
  // Step 1: Get file metadata and document tree
  const { data: file, error: fileError } = await getFileMetadata(fileKey, accessToken, logger)
  if (fileError || !file) {
    return { data: null, error: fileError }
  }

  // Step 2: Extract frames from document (includes page names)
  const frames = extractFrames(file.document, logger)
  if (frames.length === 0) {
    return { data: null, error: new Error('No frames found in Figma file. Make sure your file has at least one frame.') }
  }

  // Step 3: Get thumbnail images for all frames
  // Continue even if thumbnails fail - they're optional
  const nodeIds = frames.map(f => f.nodeId)
  const { data: images } = await getNodeImages(fileKey, nodeIds, accessToken, undefined, logger)

  // Step 4: Combine frame data with thumbnails, page names, and dimensions
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
