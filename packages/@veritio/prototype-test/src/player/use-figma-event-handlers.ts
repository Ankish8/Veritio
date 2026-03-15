'use client'
import { useMemo, useCallback } from 'react'
import type { PrototypeTestTask, SuccessPathway } from '@veritio/study-types'
import type {
  ComponentStateEvent,
  ComponentStateSnapshot,
  ComponentStateSuccessCriteria,
} from '@veritio/study-types/study-flow-types'
import type {
  FigmaClickEvent,
  FigmaNavigationEvent,
  PrototypeComponentInstanceInput,
  PrototypeTestPhase,
} from './types'
import type { PrototypeTestFrame } from '@veritio/study-types'
import { castJsonArray } from '@veritio/core/database'
import { useFigmaFrameMapping } from './hooks'
import { getGoalFramesFromPathway, checkGoalStateDiff, matchPathWithStates } from '../algorithms/path-matching'
import { checkTaskSuccess } from './utils'

function getFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeComponentInstancePosition(instance: PrototypeComponentInstanceInput): {
  instanceId: string
  frameNodeId: string
  relativeX: number
  relativeY: number
} | null {
  const instanceId = 'instance_id' in instance ? instance.instance_id : instance.instanceId
  const frameNodeId = 'frame_node_id' in instance ? instance.frame_node_id : instance.frameNodeId
  const relativeX = getFiniteNumber('relative_x' in instance ? instance.relative_x : instance.relativeX)
  const relativeY = getFiniteNumber('relative_y' in instance ? instance.relative_y : instance.relativeY)

  if (!instanceId || !frameNodeId || relativeX === null || relativeY === null) {
    return null
  }

  return { instanceId, frameNodeId, relativeX, relativeY }
}

interface UseFigmaEventHandlersParams {
  frames: PrototypeTestFrame[]
  componentInstances: PrototypeComponentInstanceInput[]
  currentTask: PrototypeTestTask | undefined
  taskStarted: boolean
  tasksEndAutomatically: boolean

  // Refs from task tracking
  currentFrameIdRef: React.MutableRefObject<string | null>
  currentComponentStatesRef: React.MutableRefObject<ComponentStateSnapshot>
  componentStateEventsRef: React.MutableRefObject<any[]>

  // Tracking functions
  recordClick: (frameId: string | null, x: number, y: number, wasHotspot: boolean, triggeredTransition: boolean) => void
  recordNavigation: (fromFrameId: string | null, toFrameId: string) => void
  recordStateChange: (frameId: string | null, event: ComponentStateEvent) => void
  setCurrentFrame: (frameId: string, isInitial?: boolean) => void
  getPathTaken: () => string[]

  // Recording event capture
  captureRecordingClick: (frameId: string | null, x: number, y: number, wasHotspot: boolean, triggeredTransition: boolean) => void
  captureRecordingNav: (fromFrameId: string | null, toFrameId: string, triggeredBy: string) => void

  // Success callbacks
  followedCorrectPathRef: React.MutableRefObject<boolean | undefined>
  setShowSuccessModal: (show: boolean) => void
}

export function useFigmaEventHandlers({
  frames,
  componentInstances,
  currentTask,
  taskStarted,
  tasksEndAutomatically,
  currentFrameIdRef,
  currentComponentStatesRef,
  componentStateEventsRef,
  recordClick,
  recordNavigation,
  recordStateChange,
  setCurrentFrame,
  getPathTaken,
  captureRecordingClick,
  captureRecordingNav,
  followedCorrectPathRef,
  setShowSuccessModal,
}: UseFigmaEventHandlersParams) {
  // Frame ID conversion utilities
  const { getFrameIdFromNodeId, getFigmaNodeIdFromFrameId } = useFigmaFrameMapping(frames)

  // Component instance offset map for coordinate rebasing
  const componentInstanceOffsetMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    for (const instance of componentInstances) {
      const normalized = normalizeComponentInstancePosition(instance)
      if (!normalized) continue
      map.set(`${normalized.frameNodeId}:${normalized.instanceId}`, {
        x: normalized.relativeX,
        y: normalized.relativeY,
      })
    }
    return map
  }, [componentInstances])

  const frameDimensionMap = useMemo(() => {
    const map = new Map<string, { width: number; height: number }>()
    for (const frame of frames) {
      const width = typeof frame.width === 'number' ? frame.width : null
      const height = typeof frame.height === 'number' ? frame.height : null
      if (width !== null && height !== null) {
        map.set(frame.id, { width, height })
      }
    }
    return map
  }, [frames])

  const mapClickToFrameCoordinates = useCallback((event: FigmaClickEvent) => {
    let resolvedX = event.x
    let resolvedY = event.y

    const currentFrameId = currentFrameIdRef.current
    const currentFrameNodeId = getFigmaNodeIdFromFrameId(currentFrameId)

    if (currentFrameNodeId) {
      if (
        event.nearestScrollingFrameId &&
        event.nearestScrollingFrameId !== currentFrameNodeId
      ) {
        const scrollingFrameOffset = componentInstanceOffsetMap.get(
          `${currentFrameNodeId}:${event.nearestScrollingFrameId}`
        )

        if (scrollingFrameOffset) {
          resolvedX = scrollingFrameOffset.x + event.x
          resolvedY = scrollingFrameOffset.y + event.y
        } else if (
          event.targetNodeId &&
          typeof event.targetNodeX === 'number' &&
          typeof event.targetNodeY === 'number'
        ) {
          const targetNodeOffset = componentInstanceOffsetMap.get(
            `${currentFrameNodeId}:${event.targetNodeId}`
          )
          if (targetNodeOffset) {
            resolvedX = targetNodeOffset.x + event.targetNodeX
            resolvedY = targetNodeOffset.y + event.targetNodeY
          }
        }
      }
    }

    if (currentFrameId) {
      const dims = frameDimensionMap.get(currentFrameId)
      if (dims) {
        resolvedX = Math.max(0, Math.min(dims.width, resolvedX))
        resolvedY = Math.max(0, Math.min(dims.height, resolvedY))
      }
    }

    return {
      x: Math.round(resolvedX),
      y: Math.round(resolvedY),
    }
  }, [getFigmaNodeIdFromFrameId, componentInstanceOffsetMap, frameDimensionMap, currentFrameIdRef])

  // Component state success checking
  const checkComponentStateSuccess = useCallback((frameId: string | null) => {
    if (!currentTask?.enable_interactive_components) return false
    const successStates = castJsonArray<ComponentStateSuccessCriteria>(currentTask.success_component_states)
    if (successStates.length === 0) return false

    const successFrameIds = (currentTask.success_frame_ids as string[]) || []
    if (!frameId || successFrameIds.length === 0 || !successFrameIds.includes(frameId)) {
      return false
    }

    const currentStates = currentComponentStatesRef.current
    return successStates.every(
      (state) => currentStates[state.componentNodeId] === state.variantId
    )
  }, [currentTask, currentComponentStatesRef])

  const checkStateOnlySuccess = useCallback(() => {
    if (!currentTask) return false

    const stateSuccessCriteria = (currentTask as any).state_success_criteria as {
      states: ComponentStateSuccessCriteria[]
      logic: 'AND' | 'OR'
    } | null

    if (!stateSuccessCriteria || !stateSuccessCriteria.states || stateSuccessCriteria.states.length === 0) {
      return false
    }

    const currentStates = currentComponentStatesRef.current
    const { states, logic } = stateSuccessCriteria

    if (logic === 'OR') {
      return states.some(
        (state) => currentStates[state.componentNodeId] === state.variantId
      )
    } else {
      return states.every(
        (state) => currentStates[state.componentNodeId] === state.variantId
      )
    }
  }, [currentTask, currentComponentStatesRef])

  // Handle click events from Figma
  const handleFigmaClick = useCallback(
    (event: FigmaClickEvent) => {
      if (!currentTask) return
      const { x, y } = mapClickToFrameCoordinates(event)
      recordClick(currentFrameIdRef.current, x, y, event.wasHotspot, event.triggeredTransition)
      captureRecordingClick(currentFrameIdRef.current, x, y, event.wasHotspot, event.triggeredTransition)
    },
    [currentTask, mapClickToFrameCoordinates, recordClick, currentFrameIdRef, captureRecordingClick]
  )

  const handleFigmaStateSnapshot = useCallback(
    (snapshot: ComponentStateSnapshot) => {
      currentComponentStatesRef.current = snapshot
    },
    [currentComponentStatesRef]
  )

  const handleFigmaStateChange = useCallback(
    (event: ComponentStateEvent) => {
      recordStateChange(currentFrameIdRef.current, event)

      if (!currentTask || !taskStarted || !tasksEndAutomatically) return

      const successCriteriaType = currentTask.success_criteria_type || 'destination'

      // V3 pathway state check
      if (successCriteriaType === 'pathway' && currentTask.flow_type !== 'free_flow') {
        const successPathway = currentTask.success_pathway as SuccessPathway
        const goalFrames = getGoalFramesFromPathway(successPathway)
        const currentFrame = currentFrameIdRef.current
        if (currentFrame && goalFrames.includes(currentFrame)) {
          if (checkGoalStateDiff(successPathway, currentComponentStatesRef.current)) {
            const hasStateEvents = componentStateEventsRef.current.some(e => e.taskId === currentTask.id)
            if (!hasStateEvents) return

            const pathTaken = getPathTaken()
            const matchResult = matchPathWithStates(
              pathTaken, successPathway, componentStateEventsRef.current, currentTask.id
            )

            if (matchResult.matched) {
              followedCorrectPathRef.current = matchResult.stateSequenceMatch?.inCorrectOrder ?? true
            } else {
              followedCorrectPathRef.current = false
            }
            setShowSuccessModal(true)
            return
          }
        }
      }

      // Task-level component state success criteria
      if (currentTask.enable_interactive_components) {
        let isSuccess = false

        if (successCriteriaType === 'component_state') {
          isSuccess = checkStateOnlySuccess()
        } else {
          isSuccess = checkComponentStateSuccess(currentFrameIdRef.current)
        }

        if (isSuccess) {
          setShowSuccessModal(true)
        }
      }
    },
    [currentTask, recordStateChange, currentFrameIdRef, currentComponentStatesRef, componentStateEventsRef, taskStarted, tasksEndAutomatically, checkComponentStateSuccess, checkStateOnlySuccess, getPathTaken, followedCorrectPathRef, setShowSuccessModal]
  )

  // Handle navigation events from Figma
  const handleFigmaNavigate = useCallback(
    (event: FigmaNavigationEvent) => {
      const fromFrameId = getFrameIdFromNodeId(event.fromNodeId || '')
      const toFrameId = getFrameIdFromNodeId(event.toNodeId)

      if (toFrameId && currentTask) {
        recordNavigation(fromFrameId, toFrameId)
        captureRecordingNav(fromFrameId, toFrameId, 'hotspot_click')

        if (
          taskStarted &&
          tasksEndAutomatically &&
          currentTask.flow_type !== 'free_flow'
        ) {
          const result = checkTaskSuccess({
            task: currentTask,
            currentFrameId: toFrameId,
            pathTaken: getPathTaken(),
            componentStateEvents: componentStateEventsRef.current,
            currentComponentStates: currentComponentStatesRef.current,
            checkComponentStateSuccess,
            checkStateOnlySuccess,
          })

          if (result.isSuccess) {
            followedCorrectPathRef.current = result.followedCorrectPath
            setShowSuccessModal(true)
          }
        }
      }
    },
    [currentTask, getFrameIdFromNodeId, taskStarted, tasksEndAutomatically, recordNavigation, getPathTaken, componentStateEventsRef, captureRecordingNav, checkComponentStateSuccess, checkStateOnlySuccess, currentComponentStatesRef, followedCorrectPathRef, setShowSuccessModal]
  )

  // Handle Figma embed load
  const handleFigmaLoad = useCallback(() => {
    if (currentTask?.start_frame_id) {
      setCurrentFrame(currentTask.start_frame_id, true)
    }
  }, [currentTask, setCurrentFrame])

  // Handle manual task completion check
  const checkManualComplete = useCallback(() => {
    if (!currentTask) return null

    if (currentTask.flow_type === 'free_flow') {
      return { isSuccess: true, followedCorrectPath: undefined }
    }

    return checkTaskSuccess({
      task: currentTask,
      currentFrameId: currentFrameIdRef.current,
      pathTaken: getPathTaken(),
      componentStateEvents: componentStateEventsRef.current,
      currentComponentStates: currentComponentStatesRef.current,
      checkComponentStateSuccess,
      checkStateOnlySuccess,
    })
  }, [currentTask, getPathTaken, componentStateEventsRef, currentFrameIdRef, currentComponentStatesRef, checkComponentStateSuccess, checkStateOnlySuccess])

  return {
    getFrameIdFromNodeId,
    getFigmaNodeIdFromFrameId,
    handleFigmaClick,
    handleFigmaNavigate,
    handleFigmaStateChange,
    handleFigmaStateSnapshot,
    handleFigmaLoad,
    checkManualComplete,
  }
}
