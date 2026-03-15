/**
 * Pathway Query Utilities
 *
 * Read-only functions for querying and inspecting pathway data.
 * These never modify pathway structures.
 */

import {
  type SuccessPath,
  type SuccessPathV3,
  type SuccessPathway,
  type PathwayStep,
  isPathwayFrameStep,
} from '../supabase/study-flow-types'
import { normalizePathway, normalizePathwayV3 } from './pathway-conversion'
export function getPathsFromPathway(pathway: SuccessPathway): SuccessPath[] {
  const normalized = normalizePathway(pathway)
  return normalized?.paths || []
}
export function getPathsV3FromPathway(pathway: SuccessPathway): SuccessPathV3[] {
  const normalized = normalizePathwayV3(pathway)
  return normalized?.paths || []
}
export function getPrimaryPath(pathway: SuccessPathway): SuccessPath | undefined {
  const paths = getPathsFromPathway(pathway)
  return paths.find((p) => p.is_primary) || paths[0]
}
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
export function hasValidPaths(pathway: SuccessPathway): boolean {
  const paths = getPathsFromPathway(pathway)
  return paths.some((p) => p.frames.length >= 2)
}
export function hasValidPathsV3(pathway: SuccessPathway): boolean {
  const paths = getPathsV3FromPathway(pathway)
  return paths.some((p) => p.steps.length >= 2)
}
export function getPathCount(pathway: SuccessPathway): number {
  return getPathsFromPathway(pathway).length
}
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
export function pathwayHasStateSteps(pathway: SuccessPathway): boolean {
  const paths = getPathsV3FromPathway(pathway)
  return paths.some((p) => p.steps.some((s) => s.type === 'state'))
}
export function countStateStepsInPathway(pathway: SuccessPathway): number {
  const paths = getPathsV3FromPathway(pathway)
  return paths.reduce(
    (count, p) => count + p.steps.filter((s) => s.type === 'state').length,
    0
  )
}
