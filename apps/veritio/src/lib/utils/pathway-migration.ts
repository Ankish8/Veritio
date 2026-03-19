/**
 * Pathway Migration Utilities
 *
 * Provides functions to migrate and normalize success_pathway data
 * between v1 (single path), v2 (multi-path), and v3 (step-based) formats.
 *
 * The migration strategy:
 * - v1/v2 tasks are auto-converted to v3 on READ (normalizePathwayV3)
 * - Legacy functions still work for backwards compatibility
 * - V3 adds support for component state steps in pathways
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
} from '@veritio/study-types'

/**
 * Generate a unique ID for a path or step.
 * Uses crypto.randomUUID if available, falls back to simple random string.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Ensure only one path in the array has is_primary set to true.
 * Sets the target path as primary and unmarks all others.
 */
function enforceSinglePrimary<T extends { id: string; is_primary?: boolean }>(
  paths: T[],
  targetId: string
): T[] {
  return paths.map((p) => ({ ...p, is_primary: p.id === targetId }))
}

/**
 * Generate a default name for a path based on frame sequence.
 * Used when migrating from v1 or when user doesn't provide a name.
 */
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

/**
 * Convert an array of frame IDs to PathwayStep array (all frame steps).
 */
export function framesToSteps(frameIds: string[]): PathwayFrameStep[] {
  return frameIds.map((frameId) => ({
    type: 'frame' as const,
    id: generateId(),
    frameId,
  }))
}

/**
 * Extract frame IDs from a steps array (ignores state steps).
 * Used for backwards compatibility with v2 code.
 */
export function stepsToFrames(steps: PathwayStep[]): string[] {
  return steps
    .filter(isPathwayFrameStep)
    .map((step) => step.frameId)
}

/**
 * Create a new frame step.
 */
export function createFrameStep(frameId: string, isOptional = false): PathwayFrameStep {
  return {
    type: 'frame',
    id: generateId(),
    frameId,
    isOptional,
  }
}

/**
 * Create a new state step.
 */
export function createStateStep(
  componentNodeId: string,
  variantId: string,
  options?: {
    componentName?: string
    variantName?: string
    customLabel?: string
    isOptional?: boolean
  }
): PathwayStateStep {
  return {
    type: 'state',
    id: generateId(),
    componentNodeId,
    variantId,
    componentName: options?.componentName,
    variantName: options?.variantName,
    customLabel: options?.customLabel,
    isOptional: options?.isOptional,
  }
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
  if (!legacy) return null

  // Handle legacy array format (oldest format)
  if (isLegacyPathway(legacy)) {
    if (legacy.length === 0) return null
    return {
      version: 2,
      paths: [
        {
          id: generateId(),
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
          id: generateId(),
          name: generatePathName(legacy.frames, getFrameName),
          frames: legacy.frames,
          is_primary: true,
        },
      ],
    }
  }

  return null
}

/**
 * Migrate a v2 path to v3 format (add steps array).
 */
function migratePathToV3(path: SuccessPath): SuccessPathV3 {
  return {
    id: path.id,
    name: path.name,
    steps: framesToSteps(path.frames),
    frames: path.frames, // Keep for backwards compatibility
    is_primary: path.is_primary,
  }
}

/**
 * Migrate pathway to V3 format (step-based with state support).
 *
 * @param pathway - The pathway data (any format)
 * @returns SuccessPathwayV3 or null if no pathway exists
 */
export function migratePathwayToV3(
  pathway: SuccessPathway,
  getFrameName?: (frameId: string) => string | undefined
): SuccessPathwayV3 | null {
  if (isSuccessPathwayV3(pathway)) {
    return pathway
  }

  if (!pathway) return null

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
 * Note: Prefer normalizePathwayV3 for new code. This function is still
 * used internally by getPathsFromPathway, getPrimaryPath, and pathway
 * mutation functions that operate on v2 format.
 *
 * @param pathway - The pathway data from database (any format)
 * @returns SuccessPathwayV2 or null
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

  if (isSuccessPathwayV2(pathway)) {
    return pathway
  }

  if (!pathway) return null

  return migratePathway(pathway as SuccessPathwayV1 | string[])
}

/**
 * Normalize pathway data to v3 format for reading.
 * This is called when fetching task data to ensure consistent format.
 *
 * @param pathway - The pathway data from database (any format)
 * @returns SuccessPathwayV3 or null
 */
export const normalizePathwayV3 = migratePathwayToV3

/**
 * Get all paths from any pathway format.
 * Convenience function for components that just need the paths array.
 *
 * @param pathway - The pathway data (any format)
 * @returns Array of SuccessPath objects (empty array if no pathway)
 */
export function getPathsFromPathway(pathway: SuccessPathway): SuccessPath[] {
  const normalized = normalizePathway(pathway)
  return normalized?.paths || []
}

/**
 * Get all paths from any pathway format as V3 paths (with steps).
 *
 * @param pathway - The pathway data (any format)
 * @returns Array of SuccessPathV3 objects (empty array if no pathway)
 */
export function getPathsV3FromPathway(pathway: SuccessPathway): SuccessPathV3[] {
  const normalized = normalizePathwayV3(pathway)
  return normalized?.paths || []
}

/**
 * Get the primary path from a pathway.
 * Returns the first path marked as primary, or the first path if none marked.
 *
 * @param pathway - The pathway data (any format)
 * @returns The primary SuccessPath or undefined if no paths
 */
export function getPrimaryPath(pathway: SuccessPathway): SuccessPath | undefined {
  const paths = getPathsFromPathway(pathway)
  return paths.find((p) => p.is_primary) || paths[0]
}

/**
 * Get the primary path from a pathway as V3 (with steps).
 *
 * @param pathway - The pathway data (any format)
 * @returns The primary SuccessPathV3 or undefined if no paths
 */
export function getPrimaryPathV3(pathway: SuccessPathway): SuccessPathV3 | undefined {
  const paths = getPathsV3FromPathway(pathway)
  return paths.find((p) => p.is_primary) || paths[0]
}

/**
 * Get frame IDs from the primary path (or first path).
 * Convenience function for legacy code that just needs frame array.
 *
 * @param pathway - The pathway data (any format)
 * @returns Array of frame IDs (empty array if no pathway)
 */
export function getPrimaryPathFrames(pathway: SuccessPathway): string[] {
  const primary = getPrimaryPath(pathway)
  return primary?.frames || []
}

/**
 * Create a new path with default values.
 * Used when user clicks "Add another path".
 *
 * @param frames - The frame IDs for this path
 * @param name - Optional custom name
 * @param isPrimary - Whether this is the primary path (default: false)
 * @returns New SuccessPath object
 */
export function createPath(
  frames: string[],
  name?: string,
  isPrimary = false
): SuccessPath {
  return {
    id: generateId(),
    name: name || generatePathName(frames),
    frames,
    is_primary: isPrimary,
  }
}

/**
 * Create a new V3 path with steps.
 *
 * @param steps - The steps for this path
 * @param name - Optional custom name
 * @param isPrimary - Whether this is the primary path (default: false)
 * @param getFrameName - Optional function to get frame names for auto-naming
 * @returns New SuccessPathV3 object
 */
export function createPathV3(
  steps: PathwayStep[],
  name?: string,
  isPrimary = false,
  getFrameName?: (frameId: string) => string | undefined
): SuccessPathV3 {
  const frames = stepsToFrames(steps)
  return {
    id: generateId(),
    name: name || generatePathName(frames, getFrameName),
    steps,
    frames,
    is_primary: isPrimary,
  }
}

/**
 * Add a path to an existing pathway.
 * Ensures only one path is marked as primary.
 *
 * @param pathway - Existing pathway (any format)
 * @param newPath - The path to add
 * @returns Updated SuccessPathwayV2
 */
export function addPathToPathway(
  pathway: SuccessPathway,
  newPath: SuccessPath
): SuccessPathwayV2 {
  const normalized = normalizePathway(pathway) || { version: 2, paths: [] }

  const isFirstPath = normalized.paths.length === 0
  const pathToAdd = isFirstPath ? { ...newPath, is_primary: true } : newPath

  // If new path is primary, enforce single primary across all paths
  const paths = pathToAdd.is_primary
    ? enforceSinglePrimary([...normalized.paths, pathToAdd], pathToAdd.id)
    : [...normalized.paths, pathToAdd]

  return { version: 2 as const, paths }
}

/**
 * Add a V3 path to an existing pathway.
 * Ensures only one path is marked as primary.
 *
 * @param pathway - Existing pathway (any format)
 * @param newPath - The V3 path to add
 * @returns Updated SuccessPathwayV3
 */
export function addPathToPathwayV3(
  pathway: SuccessPathway,
  newPath: SuccessPathV3
): SuccessPathwayV3 {
  const normalized = normalizePathwayV3(pathway) || { version: 3, paths: [] }

  const isFirstPath = normalized.paths.length === 0
  const pathToAdd = isFirstPath ? { ...newPath, is_primary: true } : newPath

  const paths = pathToAdd.is_primary
    ? enforceSinglePrimary([...normalized.paths, pathToAdd], pathToAdd.id)
    : [...normalized.paths, pathToAdd]

  return { version: 3 as const, paths }
}

/**
 * Update a path in an existing pathway.
 *
 * @param pathway - Existing pathway (any format)
 * @param pathId - ID of the path to update
 * @param updates - Partial updates to apply
 * @returns Updated SuccessPathwayV2
 */
export function updatePathInPathway(
  pathway: SuccessPathway,
  pathId: string,
  updates: Partial<Omit<SuccessPath, 'id'>>
): SuccessPathwayV2 {
  const normalized = normalizePathway(pathway) || { version: 2, paths: [] }

  let paths = normalized.paths.map((p) =>
    p.id === pathId ? { ...p, ...updates } : p
  )

  if (updates.is_primary) {
    paths = enforceSinglePrimary(paths, pathId)
  }

  return { version: 2 as const, paths }
}

/**
 * Update a V3 path in an existing pathway.
 *
 * @param pathway - Existing pathway (any format)
 * @param pathId - ID of the path to update
 * @param updates - Partial updates to apply
 * @returns Updated SuccessPathwayV3
 */
export function updatePathInPathwayV3(
  pathway: SuccessPathway,
  pathId: string,
  updates: Partial<Omit<SuccessPathV3, 'id'>>
): SuccessPathwayV3 {
  const normalized = normalizePathwayV3(pathway) || { version: 3, paths: [] }

  // If steps are updated, also update the frames array
  const updatesWithFrames = updates.steps
    ? { ...updates, frames: stepsToFrames(updates.steps) }
    : updates

  let paths = normalized.paths.map((p) =>
    p.id === pathId ? { ...p, ...updatesWithFrames } : p
  )

  if (updates.is_primary) {
    paths = enforceSinglePrimary(paths, pathId)
  }

  return { version: 3 as const, paths }
}

/**
 * Remove a path from an existing pathway.
 * If primary path is removed, makes the first remaining path primary.
 *
 * @param pathway - Existing pathway (any format)
 * @param pathId - ID of the path to remove
 * @returns Updated SuccessPathwayV2 or null if no paths remain
 */
export function removePathFromPathway(
  pathway: SuccessPathway,
  pathId: string
): SuccessPathwayV2 | null {
  const normalized = normalizePathway(pathway)
  if (!normalized) return null

  const removedPath = normalized.paths.find((p) => p.id === pathId)
  const remainingPaths = normalized.paths.filter((p) => p.id !== pathId)

  if (remainingPaths.length === 0) return null

  // If we removed the primary, make the first remaining path primary
  if (removedPath?.is_primary && !remainingPaths.some((p) => p.is_primary)) {
    remainingPaths[0] = { ...remainingPaths[0], is_primary: true }
  }

  return {
    version: 2,
    paths: remainingPaths,
  }
}

/**
 * Remove a path from an existing V3 pathway.
 * If primary path is removed, makes the first remaining path primary.
 *
 * @param pathway - Existing pathway (any format)
 * @param pathId - ID of the path to remove
 * @returns Updated SuccessPathwayV3 or null if no paths remain
 */
export function removePathFromPathwayV3(
  pathway: SuccessPathway,
  pathId: string
): SuccessPathwayV3 | null {
  const normalized = normalizePathwayV3(pathway)
  if (!normalized) return null

  const removedPath = normalized.paths.find((p) => p.id === pathId)
  const remainingPaths = normalized.paths.filter((p) => p.id !== pathId)

  if (remainingPaths.length === 0) return null

  // If we removed the primary, make the first remaining path primary
  if (removedPath?.is_primary && !remainingPaths.some((p) => p.is_primary)) {
    remainingPaths[0] = { ...remainingPaths[0], is_primary: true }
  }

  return {
    version: 3,
    paths: remainingPaths,
  }
}

/**
 * Set a specific path as the primary path.
 *
 * @param pathway - Existing pathway (any format)
 * @param pathId - ID of the path to make primary
 * @returns Updated SuccessPathwayV2
 */
export function setPathAsPrimary(
  pathway: SuccessPathway,
  pathId: string
): SuccessPathwayV2 {
  const normalized = normalizePathway(pathway) || { version: 2, paths: [] }

  return {
    version: 2,
    paths: enforceSinglePrimary(normalized.paths, pathId),
  }
}

/**
 * Check if a pathway has any paths defined.
 *
 * @param pathway - The pathway data (any format)
 * @returns true if at least one path with frames exists
 */
export function hasValidPaths(pathway: SuccessPathway): boolean {
  const paths = getPathsFromPathway(pathway)
  return paths.some((p) => p.frames.length >= 2)
}

/**
 * Check if a V3 pathway has any valid paths (with steps).
 *
 * @param pathway - The pathway data (any format)
 * @returns true if at least one path with 2+ steps exists
 */
export function hasValidPathsV3(pathway: SuccessPathway): boolean {
  const paths = getPathsV3FromPathway(pathway)
  return paths.some((p) => p.steps.length >= 2)
}

/**
 * Get count of paths in a pathway.
 *
 * @param pathway - The pathway data (any format)
 * @returns Number of paths
 */
export function getPathCount(pathway: SuccessPathway): number {
  return getPathsFromPathway(pathway).length
}

/**
 * Reorder paths in an existing pathway.
 * Used for drag-and-drop reordering in the UI.
 *
 * Note: The `_pathway` parameter is accepted for API consistency with other
 * pathway mutation functions but is not used -- the caller provides the
 * already-reordered paths array directly.
 *
 * @param _pathway - Existing pathway (unused, kept for API consistency)
 * @param reorderedPaths - The paths array in new order
 * @returns Updated SuccessPathwayV2
 */
export function reorderPathsInPathway(
  _pathway: SuccessPathway,
  reorderedPaths: SuccessPath[]
): SuccessPathwayV2 {
  return {
    version: 2,
    paths: reorderedPaths,
  }
}

/**
 * Add a step to a V3 path.
 *
 * @param path - The V3 path to update
 * @param step - The step to add
 * @param index - Optional index to insert at (defaults to end)
 * @returns Updated SuccessPathV3
 */
export function addStepToPath(
  path: SuccessPathV3,
  step: PathwayStep,
  index?: number
): SuccessPathV3 {
  const newSteps = [...path.steps]
  if (index !== undefined && index >= 0 && index <= newSteps.length) {
    newSteps.splice(index, 0, step)
  } else {
    newSteps.push(step)
  }

  return {
    ...path,
    steps: newSteps,
    frames: stepsToFrames(newSteps),
  }
}

/**
 * Remove a step from a V3 path.
 *
 * @param path - The V3 path to update
 * @param stepId - ID of the step to remove
 * @returns Updated SuccessPathV3
 */
export function removeStepFromPath(
  path: SuccessPathV3,
  stepId: string
): SuccessPathV3 {
  const newSteps = path.steps.filter((s) => s.id !== stepId)

  return {
    ...path,
    steps: newSteps,
    frames: stepsToFrames(newSteps),
  }
}

/**
 * Update a step in a V3 path.
 *
 * @param path - The V3 path to update
 * @param stepId - ID of the step to update
 * @param updates - Partial updates to apply
 * @returns Updated SuccessPathV3
 */
export function updateStepInPath(
  path: SuccessPathV3,
  stepId: string,
  updates: Partial<PathwayStep>
): SuccessPathV3 {
  const newSteps = path.steps.map((s) =>
    s.id === stepId ? { ...s, ...updates } : s
  ) as PathwayStep[]

  return {
    ...path,
    steps: newSteps,
    frames: stepsToFrames(newSteps),
  }
}

/**
 * Reorder steps in a V3 path.
 *
 * @param path - The V3 path to update
 * @param reorderedSteps - The steps array in new order
 * @returns Updated SuccessPathV3
 */
export function reorderStepsInPath(
  path: SuccessPathV3,
  reorderedSteps: PathwayStep[]
): SuccessPathV3 {
  return {
    ...path,
    steps: reorderedSteps,
    frames: stepsToFrames(reorderedSteps),
  }
}

/**
 * Get the display label for a pathway step.
 * Uses custom label if set, otherwise generates from component/variant names.
 */
export function getStepDisplayLabel(
  step: PathwayStep,
  getFrameName?: (frameId: string) => string | undefined
): string {
  if (step.type === 'frame') {
    return getFrameName?.(step.frameId) || `Frame ${step.frameId.slice(-6)}`
  }

  // State step
  if (step.customLabel) {
    return step.customLabel
  }

  if (step.componentName && step.variantName) {
    return `${step.componentName}: ${step.variantName}`
  }

  if (step.componentName) {
    return step.componentName
  }

  return `State ${step.componentNodeId.slice(-6)}`
}

/**
 * Check if a pathway contains any state steps.
 */
export function pathwayHasStateSteps(pathway: SuccessPathway): boolean {
  const paths = getPathsV3FromPathway(pathway)
  return paths.some((p) => p.steps.some((s) => s.type === 'state'))
}

/**
 * Count the number of state steps in a pathway.
 */
export function countStateStepsInPathway(pathway: SuccessPathway): number {
  const paths = getPathsV3FromPathway(pathway)
  return paths.reduce(
    (count, p) => count + p.steps.filter((s) => s.type === 'state').length,
    0
  )
}
