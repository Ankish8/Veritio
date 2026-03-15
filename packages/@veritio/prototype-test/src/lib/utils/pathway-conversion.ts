/**
 * Pathway Conversion Utilities
 *
 * Handles migration, normalization, and format conversion between
 * v1 (single path), v2 (multi-path), and v3 (step-based) pathway formats.
 */

import {
  type SuccessPath,
  type SuccessPathV3,
  type SuccessPathway,
  type SuccessPathwayV1,
  type SuccessPathwayV2,
  type SuccessPathwayV3,
  type PathwayStep,
  type PathwayFrameStep,
  type PathwayStateStep,
  isSuccessPathwayV2,
  isSuccessPathwayV3,
  isSuccessPathwayV1,
  isLegacyPathway,
  isPathwayFrameStep,
} from '../supabase/study-flow-types'
import { generateId } from './pathway-internal'

// Legacy alias for backwards compatibility
const generatePathId = generateId
export function generatePathName(
  frameIds: string[],
  getFrameName?: (frameId: string) => string | undefined
): string {
  if (frameIds.length === 0) return 'Empty path'
  if (frameIds.length === 1) {
    const name = getFrameName?.(frameIds[0])
    return name ? `To ${name}` : 'Single screen path'
  }

  const firstName = getFrameName?.(frameIds[0])
  const lastName = getFrameName?.(frameIds[frameIds.length - 1])

  if (firstName && lastName) {
    return `${firstName} → ${lastName}`
  }

  return `Path (${frameIds.length} screens)`
}
export function framesToSteps(frameIds: string[]): PathwayFrameStep[] {
  return frameIds.map((frameId) => ({
    type: 'frame' as const,
    id: generateId(),
    frameId,
  }))
}

/**
 * Extract frame IDs from a steps array (ignores state steps).
 * Used for backwards compatibility with v2 code and frame-based path matching.
 */
export function stepsToFrames(steps: PathwayStep[]): string[] {
  return steps
    .filter(isPathwayFrameStep)
    .map((step) => step.frameId)
}
function isOldStepFormat(steps: PathwayStep[]): boolean {
  let lastFrameId: string | null = null
  for (const step of steps) {
    if (isPathwayFrameStep(step)) {
      if (lastFrameId === step.frameId) return true
      lastFrameId = step.frameId
    }
  }
  return false
}
export function normalizeStepsForDisplay(steps: PathwayStep[]): PathwayStep[] {
  if (!isOldStepFormat(steps)) return steps

  // Group steps by frame-step boundaries
  type PositionGroup = { frameStep: PathwayFrameStep; cumulative: Record<string, string> }
  const groups: PositionGroup[] = []
  let currentGroup: PositionGroup | null = null

  for (const step of steps) {
    if (isPathwayFrameStep(step)) {
      currentGroup = { frameStep: step, cumulative: {} }
      groups.push(currentGroup)
    } else if (step.type === 'state' && currentGroup) {
      currentGroup.cumulative[step.componentNodeId] = step.variantId
    }
  }

  if (groups.length === 0) return steps

  // Convert: first group -> frame step only, subsequent groups -> diff state steps
  const result: PathwayStep[] = [groups[0].frameStep]
  let prevCum: Record<string, string> = { ...groups[0].cumulative }

  for (let i = 1; i < groups.length; i++) {
    const group = groups[i]
    // If frame changed, emit a new frame step
    if (group.frameStep.frameId !== groups[i - 1].frameStep.frameId) {
      result.push(group.frameStep)
      prevCum = {} // Reset cumulative on frame change
    }
    // Emit diff state steps (new or changed states only)
    for (const [nodeId, variantId] of Object.entries(group.cumulative)) {
      if (prevCum[nodeId] !== variantId) {
        result.push({ type: 'state', id: `norm-${i}-${nodeId}`, componentNodeId: nodeId, variantId } as PathwayStateStep)
      }
    }
    prevCum = { ...group.cumulative }
  }

  return result
}
export function stepsToPositionFrames(steps: PathwayStep[]): string[] {
  const normalized = normalizeStepsForDisplay(steps)
  const frameIds: string[] = []
  let currentFrameId: string | null = null

  for (const step of normalized) {
    if (isPathwayFrameStep(step)) {
      currentFrameId = step.frameId
      frameIds.push(currentFrameId)
    } else if (step.type === 'state' && currentFrameId) {
      frameIds.push(currentFrameId)
    }
  }

  return frameIds
}

/**
 * Migrate a legacy pathway structure to v2 format.
 * This is a one-way migration - called when saving a task.
 *
 * @param legacy - The legacy pathway data (v1 object, array, or null)
 * @param getFrameName - Optional function to get frame names for auto-naming
 * @returns SuccessPathwayV2 or null if no pathway exists
 */
export function migratePathway(
  legacy: SuccessPathwayV1 | string[] | null,
  getFrameName?: (frameId: string) => string | undefined
): SuccessPathwayV2 | null {
  // Handle null/undefined
  if (!legacy) return null

  // Handle legacy array format (oldest format)
  if (isLegacyPathway(legacy)) {
    if (legacy.length === 0) return null
    return {
      version: 2,
      paths: [
        {
          id: generatePathId(),
          name: generatePathName(legacy, getFrameName),
          frames: legacy,
          is_primary: true,
        },
      ],
    }
  }

  // Handle v1 object format
  if (isSuccessPathwayV1(legacy)) {
    if (legacy.frames.length === 0) return null
    return {
      version: 2,
      paths: [
        {
          id: generatePathId(),
          name: generatePathName(legacy.frames, getFrameName),
          frames: legacy.frames,
          is_primary: true,
        },
      ],
    }
  }

  // Unknown format - return null
  return null
}
function migratePathToV3(path: SuccessPath): SuccessPathV3 {
  return {
    id: path.id,
    name: path.name,
    steps: framesToSteps(path.frames),
    frames: path.frames, // Keep for backwards compatibility
    is_primary: path.is_primary,
  }
}
export function migratePathwayToV3(
  pathway: SuccessPathway,
  getFrameName?: (frameId: string) => string | undefined
): SuccessPathwayV3 | null {
  // Already v3
  if (isSuccessPathwayV3(pathway)) {
    return pathway
  }

  // Handle null/undefined
  if (!pathway) return null

  // Handle v2 format
  if (isSuccessPathwayV2(pathway)) {
    return {
      version: 3,
      paths: pathway.paths.map(migratePathToV3),
    }
  }

  // Handle v1 or array format - first migrate to v2, then to v3
  const v2 = migratePathway(pathway as SuccessPathwayV1 | string[], getFrameName)
  if (!v2) return null

  return {
    version: 3,
    paths: v2.paths.map(migratePathToV3),
  }
}

/**
 * Normalize pathway data to v2 format for reading.
 * This is called when fetching task data to ensure consistent format.
 * Unlike migratePathway, this doesn't save the migration.
 *
 * @param pathway - The pathway data from database (any format)
 * @returns SuccessPathwayV2 or null
 * @deprecated Use normalizePathwayV3 for new code
 */
export function normalizePathway(
  pathway: SuccessPathway
): SuccessPathwayV2 | null {
  // V3 can be downgraded to V2 (loses state steps)
  if (isSuccessPathwayV3(pathway)) {
    return {
      version: 2,
      paths: pathway.paths.map((p) => ({
        id: p.id,
        name: p.name,
        frames: p.frames,
        is_primary: p.is_primary,
      })),
    }
  }

  // Already v2
  if (isSuccessPathwayV2(pathway)) {
    return pathway
  }

  // Handle null/undefined
  if (!pathway) return null

  // Migrate from v1 or array format
  return migratePathway(pathway as SuccessPathwayV1 | string[])
}
export function normalizePathwayV3(
  pathway: SuccessPathway
): SuccessPathwayV3 | null {
  return migratePathwayToV3(pathway)
}
