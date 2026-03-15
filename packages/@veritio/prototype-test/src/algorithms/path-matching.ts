import type { SuccessPath, SuccessPathwayV2, SuccessPathway, ComponentStateSnapshot, PathwayStateStep, PathwayStep } from '@veritio/study-types'
import { isPathwayStateStep, isPathwayFrameStep } from '@veritio/study-types'
import { normalizePathway, normalizePathwayV3, pathwayHasStateSteps } from '../lib/utils/pathway-migration'
import type { ComponentStateEventRecord } from '../player/types'

export interface PathMatchResult {
  matched: boolean
  matchedPathId: string | null
  matchedPathName: string | null
  isPrimaryPath: boolean
  partialProgress: number
  closestPathId: string | null
}
export function matchStrict(pathTaken: string[], expected: string[]): boolean {
  if (expected.length === 0) return false
  if (pathTaken.length < expected.length) return false
  const pathEnd = pathTaken.slice(-expected.length)
  return pathEnd.every((frameId, index) => frameId === expected[index])
}
export function calculatePartialProgress(
  pathTaken: string[],
  expected: string[]
): number {
  if (expected.length === 0) return 0
  if (pathTaken.length === 0) return 0

  let maxProgress = 0

  for (let startIdx = 0; startIdx < pathTaken.length; startIdx++) {
    let matchCount = 0
    for (let i = 0; i < expected.length && startIdx + i < pathTaken.length; i++) {
      if (pathTaken[startIdx + i] === expected[i]) {
        matchCount++
      } else {
        break // Stop at first mismatch
      }
    }
    maxProgress = Math.max(maxProgress, matchCount)
  }

  return maxProgress / expected.length
}

export function matchPathAgainstCriteria(
  pathTaken: string[],
  criteria: SuccessPathwayV2 | null
): PathMatchResult {
  if (!criteria || criteria.paths.length === 0) {
    return {
      matched: false,
      matchedPathId: null,
      matchedPathName: null,
      isPrimaryPath: false,
      partialProgress: 0,
      closestPathId: null,
    }
  }

  let bestProgress = 0
  let closestPathId: string | null = null

  for (const path of criteria.paths) {
    if (path.frames.length === 0) continue

    if (matchStrict(pathTaken, path.frames)) {
      return {
        matched: true,
        matchedPathId: path.id,
        matchedPathName: path.name,
        isPrimaryPath: path.is_primary,
        partialProgress: 1,
        closestPathId: path.id,
      }
    }

    const progress = calculatePartialProgress(pathTaken, path.frames)
    if (progress > bestProgress) {
      bestProgress = progress
      closestPathId = path.id
    }
  }

  return {
    matched: false,
    matchedPathId: null,
    matchedPathName: null,
    isPrimaryPath: false,
    partialProgress: bestProgress,
    closestPathId,
  }
}
export function matchPath(
  pathTaken: string[],
  pathway: SuccessPathway
): PathMatchResult {
  const normalized = normalizePathway(pathway)
  return matchPathAgainstCriteria(pathTaken, normalized)
}
export function isPathSuccessful(
  pathTaken: string[],
  pathway: SuccessPathway
): boolean {
  return matchPath(pathTaken, pathway).matched
}
export function detectNearMiss(
  pathTaken: string[],
  pathway: SuccessPathway,
  threshold = 0.7
): { path: SuccessPath; progress: number } | null {
  const result = matchPath(pathTaken, pathway)

  if (result.matched) return null
  if (result.partialProgress >= threshold && result.closestPathId) {
    const normalized = normalizePathway(pathway)
    const closestPath = normalized?.paths.find((p) => p.id === result.closestPathId)
    if (closestPath) {
      return {
        path: closestPath,
        progress: result.partialProgress,
      }
    }
  }

  return null
}
export function getGoalFramesFromPathway(pathway: SuccessPathway): string[] {
  const normalized = normalizePathway(pathway)
  if (!normalized || normalized.paths.length === 0) return []

  const goalFrames = new Set<string>()
  for (const path of normalized.paths) {
    if (path.frames.length > 0) {
      goalFrames.add(path.frames[path.frames.length - 1])
    }
  }
  return Array.from(goalFrames)
}
export function checkPathwayGoalStates(
  pathway: SuccessPathway,
  currentStates: ComponentStateSnapshot
): boolean {
  const v3 = normalizePathwayV3(pathway)
  if (!v3 || v3.paths.length === 0) return true

  const pathsWithGoalStates: PathwayStateStep[][] = []

  for (const path of v3.paths) {
    if (path.steps.length === 0) continue

    let lastFrameIdx = -1
    for (let i = path.steps.length - 1; i >= 0; i--) {
      if (isPathwayFrameStep(path.steps[i])) {
        lastFrameIdx = i
        break
      }
    }

    const trailingStates = path.steps
      .slice(lastFrameIdx + 1)
      .filter(isPathwayStateStep)

    if (trailingStates.length > 0) {
      pathsWithGoalStates.push(trailingStates)
    }
  }

  if (pathsWithGoalStates.length === 0) return true

  // Prevent premature success when START == GOAL frame but states haven't loaded yet
  const hasStates = Object.keys(currentStates).length > 0
  if (!hasStates) return false

  return pathsWithGoalStates.some((stateSteps) =>
    stateSteps.every(
      (step) => currentStates[step.componentNodeId] === step.variantId
    )
  )
}
export function calculatePathEfficiency(
  pathTaken: string[],
  pathway: SuccessPathway
): number {
  const normalized = normalizePathway(pathway)
  if (!normalized || normalized.paths.length === 0) return 0

  const primaryPath = normalized.paths.find((p) => p.is_primary) || normalized.paths[0]
  if (!primaryPath || primaryPath.frames.length === 0) return 0

  const result = matchPath(pathTaken, pathway)

  if (result.matched && result.isPrimaryPath) {
    if (pathTaken.length === primaryPath.frames.length) {
      return 100
    }
    const extraSteps = pathTaken.length - primaryPath.frames.length
    return Math.max(0, 100 - extraSteps * 5)
  }

  if (result.matched) {
    const extraSteps = pathTaken.length - primaryPath.frames.length
    return Math.max(50, 80 - Math.max(0, extraSteps) * 3)
  }

  return Math.round(result.partialProgress * 50)
}

export interface PathwayPosition {
  frameId: string
  index: number
  cumulativeStates: Record<string, string>
  newStateChanges: Array<{ componentNodeId: string; variantId: string }>
}

export interface StateSequenceMatchResult {
  allStatesReached: boolean
  inCorrectOrder: boolean
  positionsMatched: number
  totalPositionsWithStates: number
}

export interface PathWithStatesMatchResult extends PathMatchResult {
  stateSequenceMatch?: StateSequenceMatchResult
}
export function extractPathwayPositions(steps: PathwayStep[]): PathwayPosition[] {
  if (steps.length === 0) return []

  const positions: PathwayPosition[] = []
  let currentFrameId: string | null = null
  let cumulativeStates: Record<string, string> = {}

  for (const step of steps) {
    if (isPathwayFrameStep(step)) {
      currentFrameId = step.frameId

      // Create a frame-only position for every frame transition (including the first frame).
      // The first frame MUST get a position so that subsequent frame transitions are detected
      // by the `positions[last].frameId !== currentFrameId` check. Without this, pathways like
      // [frame:A, frame:B, frame:A, state:X] would have positions.length === 0 for all three
      // frame steps, making a multi-frame pathway appear as same-frame to matchPathWithStates.
      // These empty positions are ignored by matchStateSequence and checkGoalStateDiff.
      if (positions.length === 0) {
        // Always create a position for the first frame
        positions.push({
          frameId: currentFrameId,
          index: 0,
          cumulativeStates: { ...cumulativeStates },
          newStateChanges: [],
        })
      } else if (positions[positions.length - 1]?.frameId !== currentFrameId) {
        positions.push({
          frameId: currentFrameId,
          index: positions.length,
          cumulativeStates: { ...cumulativeStates },
          newStateChanges: [],
        })
      }
    } else if (isPathwayStateStep(step)) {
      if (currentFrameId === null) continue // State before any frame — skip

      cumulativeStates = { ...cumulativeStates, [step.componentNodeId]: step.variantId }

      positions.push({
        frameId: currentFrameId,
        index: positions.length,
        cumulativeStates: { ...cumulativeStates },
        newStateChanges: [{ componentNodeId: step.componentNodeId, variantId: step.variantId }],
      })
    }
  }

  return positions
}
export function checkGoalStateDiff(
  pathway: SuccessPathway,
  currentStates: ComponentStateSnapshot
): boolean {
  if (!pathwayHasStateSteps(pathway)) {
    return checkPathwayGoalStates(pathway, currentStates)
  }

  const v3 = normalizePathwayV3(pathway)
  if (!v3 || v3.paths.length === 0) return true

  return v3.paths.some((path) => {
    const positions = extractPathwayPositions(path.steps)
    if (positions.length === 0) return true

    const goalFrameId = positions[positions.length - 1].frameId
    // Only enforce state requirements on the goal frame, not intermediate frames
    const goalFramePositions = positions.filter((p) => p.frameId === goalFrameId)
    const goalPosition = findLastPositionWithStates(goalFramePositions)
    if (!goalPosition) return true

    // Prevent premature success when START == GOAL frame but states haven't loaded yet
    const hasStates = Object.keys(currentStates).length > 0
    if (!hasStates) return false

    return goalPosition.newStateChanges.every(
      (change) => currentStates[change.componentNodeId] === change.variantId
    )
  })
}

function findLastPositionWithStates(positions: PathwayPosition[]): PathwayPosition | null {
  for (let i = positions.length - 1; i >= 0; i--) {
    if (positions[i].newStateChanges.length > 0) {
      return positions[i]
    }
  }
  return null
}
export function matchStateSequence(
  positions: PathwayPosition[],
  stateEvents: ComponentStateEventRecord[],
  taskId: string
): StateSequenceMatchResult {
  const positionsWithStates = positions.filter((p) => p.newStateChanges.length > 0)
  const taskEvents = stateEvents
    .filter((e) => e.taskId === taskId)
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber)

  if (positionsWithStates.length === 0) {
    return { allStatesReached: true, inCorrectOrder: true, positionsMatched: 0, totalPositionsWithStates: 0 }
  }

  if (taskEvents.length === 0) {
    return { allStatesReached: false, inCorrectOrder: false, positionsMatched: 0, totalPositionsWithStates: positionsWithStates.length }
  }

  let eventIdx = 0
  let positionsMatched = 0

  for (const position of positionsWithStates) {
    let allChangesFound = true

    for (const change of position.newStateChanges) {
      let found = false
      for (let i = eventIdx; i < taskEvents.length; i++) {
        if (
          taskEvents[i].componentNodeId === change.componentNodeId &&
          taskEvents[i].toVariantId === change.variantId
        ) {
          eventIdx = i + 1 // Move past this event for future searches
          found = true
          break
        }
      }
      if (!found) {
        allChangesFound = false
        break
      }
    }

    if (allChangesFound) {
      positionsMatched++
    } else {
      break // Can't match further positions in order
    }
  }

  const inCorrectOrder = positionsMatched === positionsWithStates.length

  let allStatesReached = inCorrectOrder
  if (!inCorrectOrder) {
    allStatesReached = positionsWithStates.every((position) =>
      position.newStateChanges.every((change) =>
        taskEvents.some(
          (e) => e.componentNodeId === change.componentNodeId && e.toVariantId === change.variantId
        )
      )
    )
  }

  return {
    allStatesReached,
    inCorrectOrder,
    positionsMatched,
    totalPositionsWithStates: positionsWithStates.length,
  }
}
export function matchPathWithStates(
  pathTaken: string[],
  pathway: SuccessPathway,
  stateEvents: ComponentStateEventRecord[],
  taskId: string
): PathWithStatesMatchResult {
  if (!pathwayHasStateSteps(pathway)) {
    return matchPath(pathTaken, pathway)
  }

  const v3 = normalizePathwayV3(pathway)
  if (!v3 || v3.paths.length === 0) {
    return {
      matched: false,
      matchedPathId: null,
      matchedPathName: null,
      isPrimaryPath: false,
      partialProgress: 0,
      closestPathId: null,
    }
  }

  for (const path of v3.paths) {
    const positions = extractPathwayPositions(path.steps)
    const uniqueFrames = new Set(positions.map((p) => p.frameId))
    const isSameFrame = uniqueFrames.size <= 1

    const stateResult = matchStateSequence(positions, stateEvents, taskId)

    if (isSameFrame) {
      if (stateResult.allStatesReached) {
        return {
          matched: true,
          matchedPathId: path.id,
          matchedPathName: path.name,
          isPrimaryPath: path.is_primary,
          partialProgress: 1,
          closestPathId: path.id,
          stateSequenceMatch: stateResult,
        }
      }
    } else {
      // Use frame-type steps only for matchStrict (positions include state steps)
      const frameOnlyIds = path.steps
        .filter(isPathwayFrameStep)
        .map((s) => s.frameId)

      const frameResult = matchPathAgainstCriteria(pathTaken, {
        version: 2,
        paths: [{
          id: path.id,
          name: path.name,
          frames: frameOnlyIds,
          is_primary: path.is_primary,
        }],
      })

      if (frameResult.matched && stateResult.allStatesReached) {
        return {
          ...frameResult,
          stateSequenceMatch: stateResult,
        }
      }
    }
  }

  const v3Fallback = normalizePathwayV3(pathway)
  const fallbackPaths = v3Fallback?.paths.map((p) => ({
    id: p.id,
    name: p.name,
    frames: p.steps.filter(isPathwayFrameStep).map((s) => s.frameId),
    is_primary: p.is_primary,
  })) ?? []
  const frameResult = matchPathAgainstCriteria(pathTaken, fallbackPaths.length > 0 ? { version: 2, paths: fallbackPaths } : null)

  return {
    ...frameResult,
    matched: false,
  }
}
