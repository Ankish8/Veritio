import type { PathwayStep } from '@veritio/study-types'
import type { ComponentStateSnapshot } from '../../hooks/use-prototype-controls'
import type { BuilderStep, ComponentVariant } from './pathway-builder-types'

/**
 * Restores BuilderStep[] from legacy step format where duplicate frame entries
 * indicate component state changes within the same frame.
 */
export function restoreFromLegacyFormat(initialSteps: PathwayStep[]): BuilderStep[] {
  const restoredSteps: BuilderStep[] = []
  let currentStates: ComponentStateSnapshot = {}
  let currentChanges: string[] = []
  let frameIndex = -1
  let currentFrameId: string | null = null

  for (const step of initialSteps) {
    if (step.type === 'frame') {
      if (frameIndex >= 0 && currentFrameId) {
        restoredSteps.push({ frameId: currentFrameId, componentStates: currentStates, changedComponents: currentChanges })
      }
      frameIndex++
      currentFrameId = step.frameId
      currentStates = {}
      currentChanges = []
    } else if (step.type === 'state') {
      currentStates[step.componentNodeId] = step.variantId
      currentChanges.push(step.componentNodeId)
    }
  }
  if (frameIndex >= 0 && currentFrameId) {
    restoredSteps.push({ frameId: currentFrameId, componentStates: currentStates, changedComponents: currentChanges })
  }

  return restoredSteps
}

/**
 * Restores BuilderStep[] from modern step format where each state step
 * creates a new BuilderStep with cumulative component states.
 */
export function restoreFromModernFormat(initialSteps: PathwayStep[]): BuilderStep[] {
  const restoredSteps: BuilderStep[] = []
  let cumulativeState: ComponentStateSnapshot = {}
  let currentFrameId: string | null = null

  for (const step of initialSteps) {
    if (step.type === 'frame') {
      currentFrameId = step.frameId
      restoredSteps.push({ frameId: currentFrameId, componentStates: { ...cumulativeState }, changedComponents: [] })
    } else if (step.type === 'state' && currentFrameId) {
      cumulativeState = { ...cumulativeState, [step.componentNodeId]: step.variantId }
      restoredSteps.push({ frameId: currentFrameId, componentStates: { ...cumulativeState }, changedComponents: [step.componentNodeId] })
    }
  }

  return restoredSteps
}

/**
 * Detects whether initialSteps uses the legacy format (duplicate frame entries
 * for the same frame, indicating component state changes).
 */
export function isLegacyStepFormat(initialSteps: PathwayStep[]): boolean {
  let lastFrameStepId: string | null = null
  for (const step of initialSteps) {
    if (step.type === 'frame') {
      if (lastFrameStepId === step.frameId) {
        return true
      }
      lastFrameStepId = step.frameId
    }
  }
  return false
}

/**
 * Restores BuilderStep[] from PathwayStep[], automatically detecting format.
 * Returns the restored steps and the last component state snapshot for ref initialization.
 */
export function restoreStepsFromPathwaySteps(initialSteps: PathwayStep[]): {
  steps: BuilderStep[]
  lastComponentState: ComponentStateSnapshot
} {
  const legacy = isLegacyStepFormat(initialSteps)
  const steps = legacy
    ? restoreFromLegacyFormat(initialSteps)
    : restoreFromModernFormat(initialSteps)

  const lastState = steps[steps.length - 1]?.componentStates || {}

  return { steps, lastComponentState: { ...lastState } }
}

/**
 * Converts BuilderStep[] back to PathwayStep[] for saving.
 * This is the inverse of restoreStepsFromPathwaySteps.
 */
export function buildPathwayStepsFromBuilderSteps(
  steps: BuilderStep[],
  componentVariants: ComponentVariant[]
): PathwayStep[] {
  const pathwaySteps: PathwayStep[] = []

  steps.forEach((step, index) => {
    const prevFrameId = index > 0 ? steps[index - 1].frameId : null
    if (step.frameId !== prevFrameId) {
      pathwaySteps.push({
        type: 'frame',
        id: `frame-${index}`,
        frameId: step.frameId,
      })
    }

    step.changedComponents.forEach((componentNodeId) => {
      const variantId = step.componentStates[componentNodeId]
      if (variantId) {
        const variant = componentVariants.find(v => v.variant_id === variantId)
        pathwaySteps.push({
          type: 'state',
          id: `state-${index}-${componentNodeId}`,
          componentNodeId,
          variantId: variantId as string,
          componentName: variant?.component_set_name,
          variantName: variant?.variant_name,
        })
      }
    })
  })

  return pathwaySteps
}
