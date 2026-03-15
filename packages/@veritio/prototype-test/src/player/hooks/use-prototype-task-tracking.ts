'use client'
import { useRef, useCallback } from 'react'
import type { ClickEvent, NavigationEvent, TaskResult, ComponentStateEventRecord } from '../types'
import type { ComponentStateEvent, ComponentStateSnapshot } from '@veritio/study-types/study-flow-types'
import type { PrototypeTestTask } from '@veritio/study-types'

interface UsePrototypeTaskTrackingReturn {
  // Refs for external access
  clickEventsRef: React.MutableRefObject<ClickEvent[]>
  navigationEventsRef: React.MutableRefObject<NavigationEvent[]>
  componentStateEventsRef: React.MutableRefObject<ComponentStateEventRecord[]>
  currentFrameIdRef: React.MutableRefObject<string | null>
  currentComponentStatesRef: React.MutableRefObject<ComponentStateSnapshot>

  // Methods
  setCurrentTask: (taskId: string) => void  // Set current task for event tracking
  resetTaskState: () => void
  startTaskTiming: () => void
  recordClick: (
    frameId: string | null,
    x: number,
    y: number,
    wasHotspot: boolean,
    triggeredTransition: boolean
  ) => void
  recordNavigation: (
    fromFrameId: string | null,
    toFrameId: string
  ) => boolean // returns true if backtrack
  recordStateChange: (
    frameId: string | null,
    event: ComponentStateEvent
  ) => void
  setCurrentFrame: (frameId: string, initialPath?: boolean) => void
  buildTaskResult: (
    task: PrototypeTestTask,
    outcome: 'success' | 'failure' | 'skipped',
    followedCorrectPath?: boolean
  ) => TaskResult
  getPathTaken: () => string[]
  checkPathwayMatch: (successPathway: string[]) => boolean
}

export function usePrototypeTaskTracking(): UsePrototypeTaskTrackingReturn {
  // Event recording refs
  const clickEventsRef = useRef<ClickEvent[]>([])
  const navigationEventsRef = useRef<NavigationEvent[]>([])
  const componentStateEventsRef = useRef<ComponentStateEventRecord[]>([])
  const navigationSequenceRef = useRef<number>(0)
  const componentStateSequenceRef = useRef<number>(0)

  // Task tracking ref (needed for associating events with tasks)
  const currentTaskIdRef = useRef<string | null>(null)

  // Timing refs
  const taskStartTimeRef = useRef<number>(0)
  const firstClickTimeRef = useRef<number | null>(null)
  const frameLoadTimeRef = useRef<number>(0)
  const currentFrameIdRef = useRef<string | null>(null)
  const currentComponentStatesRef = useRef<ComponentStateSnapshot>({})

  // Click tracking for current task
  const clickCountRef = useRef<number>(0)
  const misclickCountRef = useRef<number>(0)
  const backtrackCountRef = useRef<number>(0)
  const pathTakenRef = useRef<string[]>([])

  // Set current task ID for event tracking
  const setCurrentTask = useCallback((taskId: string) => {
    currentTaskIdRef.current = taskId
  }, [])

  // Reset task state for new task
  const resetTaskState = useCallback(() => {
    firstClickTimeRef.current = null
    frameLoadTimeRef.current = Date.now()
    currentFrameIdRef.current = null
    clickCountRef.current = 0
    misclickCountRef.current = 0
    backtrackCountRef.current = 0
    pathTakenRef.current = []
    navigationSequenceRef.current = 0
    componentStateSequenceRef.current = 0
    currentComponentStatesRef.current = {}
  }, [])

  // Start timing for a task
  const startTaskTiming = useCallback(() => {
    taskStartTimeRef.current = Date.now()
    frameLoadTimeRef.current = Date.now()
  }, [])

  // Record a click event
  const recordClick = useCallback(
    (
      frameId: string | null,
      x: number,
      y: number,
      wasHotspot: boolean,
      triggeredTransition: boolean
    ) => {
      const now = Date.now()

      // Record first click time
      if (firstClickTimeRef.current === null) {
        firstClickTimeRef.current = now
      }

      // Update click counts
      clickCountRef.current++
      if (!wasHotspot) {
        misclickCountRef.current++
      }

      // Record click event (only if we have frameId and taskId)
      if (frameId && currentTaskIdRef.current) {
        clickEventsRef.current.push({
          taskId: currentTaskIdRef.current,
          frameId,
          x,
          y,
          timestamp: now,
          wasHotspot,
          triggeredTransition,
          timeSinceFrameLoadMs: now - frameLoadTimeRef.current,
          componentStates: { ...currentComponentStatesRef.current },
        })
      }
    },
    []
  )

  // Record a navigation event, returns true if it was a backtrack
  const recordNavigation = useCallback(
    (fromFrameId: string | null, toFrameId: string): boolean => {
      const now = Date.now()

      // Skip same-frame "navigations" (Figma re-fires PRESENTED_NODE_CHANGED
      // for component state changes without actually changing the frame)
      if (toFrameId === currentFrameIdRef.current) return false

      // Track if this is a backtrack
      const pathIndex = pathTakenRef.current.indexOf(toFrameId)
      const isBacktrack = pathIndex !== -1 && pathIndex < pathTakenRef.current.length - 1
      if (isBacktrack) backtrackCountRef.current++

      // Add to path (always add, even if visited before)
      pathTakenRef.current.push(toFrameId)

      // Record navigation event (only if we have taskId)
      if (currentTaskIdRef.current) {
        navigationEventsRef.current.push({
          taskId: currentTaskIdRef.current,
          fromFrameId,
          toFrameId,
          triggeredBy: 'click',
          timeOnFromFrameMs: now - frameLoadTimeRef.current,
          sequenceNumber: navigationSequenceRef.current++,
          timestamp: now,
        })
      }

      // Update current frame
      currentFrameIdRef.current = toFrameId
      frameLoadTimeRef.current = now

      return isBacktrack
    },
    []
  )

  // Record a component state change
  const recordStateChange = useCallback(
    (frameId: string | null, event: ComponentStateEvent) => {
      // Update current snapshot
      currentComponentStatesRef.current = {
        ...currentComponentStatesRef.current,
        [event.nodeId]: event.toVariantId,
      }

      if (currentTaskIdRef.current) {
        componentStateEventsRef.current.push({
          taskId: currentTaskIdRef.current,
          frameId,
          componentNodeId: event.nodeId,
          fromVariantId: event.fromVariantId,
          toVariantId: event.toVariantId,
          isTimedChange: event.isTimedChange,
          sequenceNumber: componentStateSequenceRef.current++,
          timestamp: event.timestamp,
        })
      }
    },
    []
  )

  // Set current frame (for initial load or navigation)
  const setCurrentFrame = useCallback(
    (frameId: string, initialPath: boolean = false) => {
      currentFrameIdRef.current = frameId
      frameLoadTimeRef.current = Date.now()
      if (initialPath) {
        pathTakenRef.current = [frameId]
      }
    },
    []
  )

  // Build task result object
  const buildTaskResult = useCallback(
    (
      task: PrototypeTestTask,
      outcome: 'success' | 'failure' | 'skipped',
      followedCorrectPath?: boolean
    ): TaskResult => {
      const now = Date.now()
      return {
        taskId: task.id,
        outcome,
        pathTaken: [...pathTakenRef.current],
        followedCorrectPath,
        totalTimeMs: now - taskStartTimeRef.current,
        timeToFirstClickMs: firstClickTimeRef.current
          ? firstClickTimeRef.current - taskStartTimeRef.current
          : 0,
        clickCount: clickCountRef.current,
        misclickCount: misclickCountRef.current,
        backtrackCount: backtrackCountRef.current,
      }
    },
    []
  )

  // Get current path taken
  const getPathTaken = useCallback(() => [...pathTakenRef.current], [])

  // Check if the pathway matches for pathway-based success criteria
  const checkPathwayMatch = useCallback((successPathway: string[]): boolean => {
    const pathTaken = pathTakenRef.current
    if (successPathway.length === 0) return false
    if (pathTaken.length < successPathway.length) return false

    // Check if the path taken ends with the success pathway sequence
    const pathEnd = pathTaken.slice(-successPathway.length)
    return pathEnd.every((frameId, index) => frameId === successPathway[index])
  }, [])

  return {
    clickEventsRef,
    navigationEventsRef,
    componentStateEventsRef,
    currentFrameIdRef,
    currentComponentStatesRef,
    setCurrentTask,
    resetTaskState,
    startTaskTiming,
    recordClick,
    recordNavigation,
    recordStateChange,
    setCurrentFrame,
    buildTaskResult,
    getPathTaken,
    checkPathwayMatch,
  }
}
