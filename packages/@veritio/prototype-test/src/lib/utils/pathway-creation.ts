
import {
  type SuccessPath,
  type SuccessPathV3,
  type SuccessPathway,
  type SuccessPathwayV2,
  type SuccessPathwayV3,
  type PathwayStep,
  type PathwayFrameStep,
  type PathwayStateStep,
} from '../supabase/study-flow-types'
import { generateId } from './pathway-internal'
import {
  generatePathName,
  stepsToFrames,
  stepsToPositionFrames,
  normalizePathway,
  normalizePathwayV3,
} from './pathway-conversion'

export function createFrameStep(frameId: string, isOptional = false): PathwayFrameStep {
  return {
    type: 'frame',
    id: generateId(),
    frameId,
    isOptional,
  }
}

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
export function addPathToPathway(
  pathway: SuccessPathway,
  newPath: SuccessPath
): SuccessPathwayV2 {
  const normalized = normalizePathway(pathway) || { version: 2, paths: [] }

  // If new path is primary, unmark existing primary
  let paths = normalized.paths
  if (newPath.is_primary) {
    paths = paths.map((p) => ({ ...p, is_primary: false }))
  }

  // If this is the first path, make it primary
  const isFirstPath = paths.length === 0
  const pathToAdd = isFirstPath ? { ...newPath, is_primary: true } : newPath

  return {
    version: 2,
    paths: [...paths, pathToAdd],
  }
}
export function addPathToPathwayV3(
  pathway: SuccessPathway,
  newPath: SuccessPathV3
): SuccessPathwayV3 {
  const normalized = normalizePathwayV3(pathway) || { version: 3, paths: [] }

  // If new path is primary, unmark existing primary
  let paths = normalized.paths
  if (newPath.is_primary) {
    paths = paths.map((p) => ({ ...p, is_primary: false }))
  }

  // If this is the first path, make it primary
  const isFirstPath = paths.length === 0
  const pathToAdd = isFirstPath ? { ...newPath, is_primary: true } : newPath

  return {
    version: 3,
    paths: [...paths, pathToAdd],
  }
}
export function updatePathInPathway(
  pathway: SuccessPathway,
  pathId: string,
  updates: Partial<Omit<SuccessPath, 'id'>>
): SuccessPathwayV2 {
  const normalized = normalizePathway(pathway) || { version: 2, paths: [] }

  // If setting this path as primary, unmark others
  let paths = normalized.paths
  if (updates.is_primary) {
    paths = paths.map((p) => ({ ...p, is_primary: false }))
  }

  return {
    version: 2,
    paths: paths.map((p) => (p.id === pathId ? { ...p, ...updates } : p)),
  }
}
export function updatePathInPathwayV3(
  pathway: SuccessPathway,
  pathId: string,
  updates: Partial<Omit<SuccessPathV3, 'id'>>
): SuccessPathwayV3 {
  const normalized = normalizePathwayV3(pathway) || { version: 3, paths: [] }

  // If setting this path as primary, unmark others
  let paths = normalized.paths
  if (updates.is_primary) {
    paths = paths.map((p) => ({ ...p, is_primary: false }))
  }

  // If steps are updated, also update the frames array (one entry per visual position)
  const updatesWithFrames = updates.steps
    ? { ...updates, frames: stepsToPositionFrames(updates.steps) }
    : updates

  return {
    version: 3,
    paths: paths.map((p) => (p.id === pathId ? { ...p, ...updatesWithFrames } : p)),
  }
}
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
export function setPathAsPrimary(
  pathway: SuccessPathway,
  pathId: string
): SuccessPathwayV2 {
  const normalized = normalizePathway(pathway) || { version: 2, paths: [] }

  return {
    version: 2,
    paths: normalized.paths.map((p) => ({
      ...p,
      is_primary: p.id === pathId,
    })),
  }
}
export function reorderPathsInPathway(
  pathway: SuccessPathway,
  reorderedPaths: SuccessPath[]
): SuccessPathwayV2 {
  return {
    version: 2,
    paths: reorderedPaths,
  }
}
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
export function updateStepInPath(
  path: SuccessPathV3,
  stepId: string,
  updates: Partial<PathwayStep>
): SuccessPathV3 {
  // Cast needed: spreading Partial<PathwayStep> over a PathwayStep widens the
  // discriminant union ('frame'|'state') which TypeScript can't narrow back.
  const newSteps = path.steps.map((s) =>
    s.id === stepId ? { ...s, ...updates } : s
  ) as PathwayStep[]

  return {
    ...path,
    steps: newSteps,
    frames: stepsToFrames(newSteps),
  }
}
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
