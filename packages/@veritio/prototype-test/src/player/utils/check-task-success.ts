import type { PrototypeTestTask, SuccessPathway } from '@veritio/study-types'
import type { ComponentStateSuccessCriteria, ComponentStateSnapshot } from '@veritio/study-types/study-flow-types'
import { castJsonArray } from '@veritio/core/database'
import { getGoalFramesFromPathway, checkGoalStateDiff, matchPathWithStates } from '../../algorithms/path-matching'
import type { ComponentStateEventRecord } from '../types'

export interface CheckTaskSuccessInput {
  task: PrototypeTestTask
  currentFrameId: string | null
  pathTaken: string[]
  componentStateEvents: ComponentStateEventRecord[]
  currentComponentStates: ComponentStateSnapshot
  checkComponentStateSuccess: (frameId: string | null) => boolean
  checkStateOnlySuccess: () => boolean
}

export interface CheckTaskSuccessResult {
  isSuccess: boolean
  followedCorrectPath?: boolean
}
export function checkTaskSuccess(input: CheckTaskSuccessInput): CheckTaskSuccessResult {
  const {
    task,
    currentFrameId,
    pathTaken,
    componentStateEvents,
    currentComponentStates,
    checkComponentStateSuccess,
    checkStateOnlySuccess,
  } = input

  const successCriteriaType = task.success_criteria_type || 'destination'
  let isSuccess = false
  let followedCorrectPath: boolean | undefined

  if (successCriteriaType === 'pathway') {
    const successPathway = task.success_pathway as SuccessPathway
    const matchResult = matchPathWithStates(
      pathTaken, successPathway, componentStateEvents, task.id
    )

    if (matchResult.matched) {
      followedCorrectPath = matchResult.stateSequenceMatch?.inCorrectOrder ?? true
      isSuccess = true
    } else {
      // Check if user reached the goal via an incorrect path
      const goalFrames = getGoalFramesFromPathway(successPathway)
      if (currentFrameId && goalFrames.includes(currentFrameId)) {
        followedCorrectPath = false
        isSuccess = true
      }
    }

    // Verify goal state requirements using diff-based detection
    if (isSuccess && !checkGoalStateDiff(successPathway, currentComponentStates)) {
      isSuccess = false
    }

    // For pathways with state steps, prevent false positive from Figma snapshot
    // pre-loading states. If no actual state events exist for this task, the
    // goal state must be from the initial snapshot, not user interaction.
    if (isSuccess && matchResult.stateSequenceMatch) {
      const hasRelevantEvents = componentStateEvents.some(e => e.taskId === task.id)
      if (!hasRelevantEvents) {
        isSuccess = false
      }
    }
  } else if (successCriteriaType === 'component_state') {
    isSuccess = checkStateOnlySuccess()
  } else {
    // Destination-based
    const successFrameIds = (task.success_frame_ids as string[]) || []
    isSuccess = currentFrameId ? successFrameIds.includes(currentFrameId) : false
  }

  // For destination/pathway with component state requirement (not component_state-only)
  if (isSuccess && successCriteriaType !== 'component_state' && task.enable_interactive_components) {
    const successStates = castJsonArray<ComponentStateSuccessCriteria>(task.success_component_states)
    if (successStates.length > 0) {
      isSuccess = checkComponentStateSuccess(currentFrameId)
    }
  }

  return { isSuccess, followedCorrectPath }
}
