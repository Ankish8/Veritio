/**
 * Pathway Sanitizer
 *
 * Sanitizes success_pathway data before saving to the API.
 * Handles v3 (step-based), v2 (multi-path), v1 (single path), and legacy array formats.
 */

import {
  isSuccessPathwayV3,
  isSuccessPathwayV2,
  isSuccessPathwayV1,
  isLegacyPathway,
  type SuccessPathway,
} from '@veritio/study-types'

/**
 * Sanitizes a task's success_pathway field.
 * Handles v3 (step-based), v2 (multi-path), v1 (single path), and legacy array formats.
 */
export function sanitizeSuccessPathway(pathway: SuccessPathway): SuccessPathway {
  if (!pathway || typeof pathway !== 'object') {
    return null
  }

  // Handle v3 format (step-based with state support): { version: 3, paths: [{ steps, frames }] }
  if (isSuccessPathwayV3(pathway)) {
    const validPaths = pathway.paths
      .filter(p => p && typeof p === 'object' && Array.isArray(p.steps))
      .map(p => ({
        id: typeof p.id === 'string' ? p.id : crypto.randomUUID(),
        name: typeof p.name === 'string' ? p.name : 'Path',
        steps: p.steps,
        frames: Array.isArray(p.frames) ? p.frames.filter((f): f is string => typeof f === 'string') : [],
        is_primary: typeof p.is_primary === 'boolean' ? p.is_primary : false,
      }))

    if (validPaths.length > 0) {
      return { version: 3, paths: validPaths }
    }
    return null
  }

  // Handle v2 format (multi-path): { version: 2, paths: [...] }
  if (isSuccessPathwayV2(pathway)) {
    const validPaths = pathway.paths
      .filter(p => p && typeof p === 'object' && Array.isArray(p.frames))
      .map(p => ({
        id: typeof p.id === 'string' ? p.id : crypto.randomUUID(),
        name: typeof p.name === 'string' ? p.name : 'Path',
        frames: p.frames.filter((f): f is string => typeof f === 'string'),
        is_primary: typeof p.is_primary === 'boolean' ? p.is_primary : false,
      }))

    if (validPaths.length > 0) {
      return { version: 2, paths: validPaths }
    }
    return null
  }

  // Handle v1 format (single path): { frames: [...], strict: boolean }
  if (isSuccessPathwayV1(pathway)) {
    if (pathway.frames.length > 0) {
      return {
        frames: pathway.frames.filter((f): f is string => typeof f === 'string'),
        strict: typeof pathway.strict === 'boolean' ? pathway.strict : false,
      }
    }
    return null
  }

  // Handle legacy array format: string[]
  if (isLegacyPathway(pathway)) {
    const frames = pathway.filter((f): f is string => typeof f === 'string')
    if (frames.length > 0) {
      return { frames, strict: false }
    }
  }

  return null
}
