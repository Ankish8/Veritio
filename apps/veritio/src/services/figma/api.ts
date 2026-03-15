/**
 * Figma REST API Functions
 *
 * HTTP/API functions for communicating with the Figma REST API.
 * Supports both OAuth tokens (per-user) and Personal Access Tokens (legacy).
 */

import type {
  FigmaFile,
  FigmaApiError,
  FigmaComponentResponse,
  FigmaComponentSetResponse,
  FigmaNodesResponse,
  FigmaLogger,
} from './types'

// ============================================================================
// Configuration
// ============================================================================

export const FIGMA_API_BASE = 'https://api.figma.com/v1'

/** Default timeout for Figma API requests (30 seconds) */
const FIGMA_API_TIMEOUT_MS = 30000

/**
 * Fetch with timeout - uses Promise.race for reliable timeout
 * Prevents API calls from hanging indefinitely
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = FIGMA_API_TIMEOUT_MS,
  logger?: FigmaLogger
): Promise<Response> {
  const controller = new AbortController()

  // Create timeout promise that rejects
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      controller.abort()
      reject(new Error(`Figma API request timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  // Race between fetch and timeout
  logger?.info(`[Figma] Starting fetch with ${timeoutMs}ms timeout`, { url: url.substring(0, 80) })

  try {
    const response = await Promise.race([
      fetch(url, { ...options, signal: controller.signal }),
      timeoutPromise
    ])
    logger?.info('[Figma] Fetch completed successfully')
    return response
  } catch (err) {
    logger?.error('[Figma] Fetch error', { error: err instanceof Error ? err.message : String(err) })
    throw err
  }
}

/**
 * Get Figma API token from environment (legacy/fallback).
 * Prefer using OAuth tokens passed as parameters.
 */
export function getLegacyFigmaToken(): string {
  return process.env.FIGMA_ACCESS_TOKEN || ''
}

// ============================================================================
// API Functions (with OAuth support)
// ============================================================================

/**
 * Fetch Figma file metadata.
 *
 * @param fileKey - The file key extracted from the Figma URL
 * @param accessToken - OAuth access token (optional, falls back to env token)
 * @param logger - Optional logger for structured logging
 * @returns File metadata or error
 */
export async function getFileMetadata(
  fileKey: string,
  accessToken?: string,
  logger?: FigmaLogger
): Promise<{ data: FigmaFile | null; error: Error | null }> {
  const token = accessToken || getLegacyFigmaToken()

  if (!token) {
    return {
      data: null,
      error: new Error('Please connect your Figma account to import prototypes.'),
    }
  }

  try {
    // Use Bearer token for OAuth, X-Figma-Token for PAT
    const headers: Record<string, string> = accessToken
      ? { 'Authorization': `Bearer ${token}` }
      : { 'X-Figma-Token': token }

    const url = `${FIGMA_API_BASE}/files/${fileKey}?geometry=paths`

    // DEBUG: Log the request details
    logger?.info('[Figma API Request]', {
      url,
      authType: accessToken ? 'OAuth Bearer' : 'PAT X-Figma-Token',
      tokenLength: token?.length,
      tokenPrefix: token?.substring(0, 15) + '...',
    })

    // Include geometry=paths to get absoluteBoundingBox for all nodes
    // This is required for accurate component variant dimensions
    // Use timeout to prevent hanging on slow Figma responses
    const response = await fetchWithTimeout(url, { headers }, FIGMA_API_TIMEOUT_MS, logger)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as FigmaApiError

      // DEBUG: Log the actual Figma API error response
      logger?.error('[Figma API Error]', {
        status: response.status,
        statusText: response.statusText,
        errorData: errorData as unknown as Record<string, unknown>,
        fileKey,
        tokenPrefix: token?.substring(0, 10) + '...',
      })

      if (response.status === 404) {
        return { data: null, error: new Error('Figma file not found. Make sure the file exists and is accessible.') }
      }
      if (response.status === 403) {
        // 403 can mean: token invalid, wrong account, file not shared, or missing scopes
        return {
          data: null,
          error: new Error(
            `Permission denied. This usually means: ` +
            `(1) Your Figma token has expired - try disconnecting and reconnecting Figma, ` +
            `(2) The file isn't shared with your connected Figma account, or ` +
            `(3) You need to re-authorize with updated scopes. ` +
            `Figma error: ${errorData.err || 'No access to this file'}`
          )
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
    // Handle timeout/abort errors specifically
    if (err instanceof Error && err.name === 'AbortError') {
      return { data: null, error: new Error('Figma API request timed out. The file may be too large or Figma servers are slow. Please try again.') }
    }
    return { data: null, error: new Error(`Failed to fetch Figma file: ${err instanceof Error ? err.message : 'Unknown error'}`) }
  }
}

/**
 * Fetch component set details using its key.
 * This is useful for library components where we need to get all variants.
 *
 * @param componentSetKey - The component set key (from component meta or file components)
 * @param accessToken - OAuth access token
 * @returns Component set metadata or error
 */
export async function getComponentSetByKey(
  componentSetKey: string,
  accessToken?: string
): Promise<{ data: FigmaComponentSetResponse | null; error: Error | null }> {
  const token = accessToken || getLegacyFigmaToken()

  if (!token) {
    return { data: null, error: new Error('No Figma access token available') }
  }

  try {
    const headers: Record<string, string> = accessToken
      ? { 'Authorization': `Bearer ${token}` }
      : { 'X-Figma-Token': token }

    const response = await fetch(`${FIGMA_API_BASE}/component_sets/${componentSetKey}`, {
      headers,
    })

    if (!response.ok) {
      if (response.status === 404) {
        return { data: null, error: new Error('Component set not found') }
      }
      return { data: null, error: new Error(`Failed to fetch component set: ${response.status}`) }
    }

    const data = await response.json() as FigmaComponentSetResponse
    return { data, error: null }
  } catch (err) {
    return { data: null, error: new Error(`Failed to fetch component set: ${err instanceof Error ? err.message : 'Unknown error'}`) }
  }
}

/**
 * Fetch component details using its key.
 * Returns metadata including the component_set_key for variants.
 *
 * @param componentKey - The component key
 * @param accessToken - OAuth access token
 * @returns Component metadata or error
 */
export async function getComponentByKey(
  componentKey: string,
  accessToken?: string
): Promise<{ data: FigmaComponentResponse | null; error: Error | null }> {
  const token = accessToken || getLegacyFigmaToken()

  if (!token) {
    return { data: null, error: new Error('No Figma access token available') }
  }

  try {
    const headers: Record<string, string> = accessToken
      ? { 'Authorization': `Bearer ${token}` }
      : { 'X-Figma-Token': token }

    const response = await fetch(`${FIGMA_API_BASE}/components/${componentKey}`, {
      headers,
    })

    if (!response.ok) {
      if (response.status === 404) {
        return { data: null, error: new Error('Component not found') }
      }
      return { data: null, error: new Error(`Failed to fetch component: ${response.status}`) }
    }

    const data = await response.json() as FigmaComponentResponse
    return { data, error: null }
  } catch (err) {
    return { data: null, error: new Error(`Failed to fetch component: ${err instanceof Error ? err.message : 'Unknown error'}`) }
  }
}

/**
 * Fetch specific nodes from a Figma file by their IDs.
 * Useful for getting the structure of library component sets.
 *
 * @param fileKey - The library file key
 * @param nodeIds - Array of node IDs to fetch
 * @param accessToken - OAuth access token
 * @returns Nodes data or error
 */
export async function getFileNodes(
  fileKey: string,
  nodeIds: string[],
  accessToken?: string
): Promise<{ data: FigmaNodesResponse | null; error: Error | null }> {
  const token = accessToken || getLegacyFigmaToken()

  if (!token) {
    return { data: null, error: new Error('No Figma access token available') }
  }

  try {
    const headers: Record<string, string> = accessToken
      ? { 'Authorization': `Bearer ${token}` }
      : { 'X-Figma-Token': token }

    // Node IDs need to be comma-separated and may contain colons which need encoding
    const idsParam = nodeIds.map(id => encodeURIComponent(id)).join(',')
    const url = `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${idsParam}&geometry=paths`

    const response = await fetch(url, { headers })

    if (!response.ok) {
      return { data: null, error: new Error(`Failed to fetch file nodes: ${response.status}`) }
    }

    const data = await response.json() as FigmaNodesResponse
    return { data, error: null }
  } catch (err) {
    return { data: null, error: new Error(`Failed to fetch file nodes: ${err instanceof Error ? err.message : 'Unknown error'}`) }
  }
}
