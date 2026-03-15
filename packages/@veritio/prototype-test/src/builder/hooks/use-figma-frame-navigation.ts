'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { generateEmbedUrl } from '../../services/figma/embed-url'
import { usePrototypeControls } from '../../hooks'
import { FIGMA_ORIGIN } from '../../lib/constants/figma'
import { findFrameByFigmaNodeId } from '../../lib/figma-frame-matching'
import { isOverlayFrame } from '../composite-thumbnail'
import { findBaseFrameIndex } from './overlay-utils'
import type { PrototypeTestPrototype, PrototypeTestFrame } from '@veritio/study-types'
import type { ComponentStateChangeEvent, ComponentStateSnapshot } from '../../hooks/use-prototype-controls'
import type { BuilderStep, PathMode } from './use-pathway-builder-state'

interface UseFigmaFrameNavigationProps {
  open: boolean
  prototype: PrototypeTestPrototype
  frames: PrototypeTestFrame[]
  startFrameId?: string | null
  initialPath: string[]
  editingPathId?: string
  pathMode: PathMode
  trackComponentStates: boolean
  onComponentStateChange: (event: ComponentStateChangeEvent) => void
  pathFrameIdsRef: React.MutableRefObject<string[]>
  stepsRef: React.MutableRefObject<BuilderStep[]>
  lastNavFrameIdRef: React.MutableRefObject<string | null>
  lastProcessedStateRef: React.MutableRefObject<string | null>
  hasSeenFirstStateChangeRef: React.MutableRefObject<boolean>
  setSteps: React.Dispatch<React.SetStateAction<BuilderStep[]>>
  componentStates: ComponentStateSnapshot[]
  pathFrameIds: string[]
}
export function useFigmaFrameNavigation({
  open,
  prototype,
  frames,
  startFrameId,
  initialPath,
  editingPathId,
  pathMode,
  trackComponentStates,
  onComponentStateChange,
  pathFrameIdsRef,
  stepsRef,
  lastNavFrameIdRef,
  lastProcessedStateRef,
  hasSeenFirstStateChangeRef,
  setSteps,
  componentStates,
  pathFrameIds,
}: UseFigmaFrameNavigationProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  // Track whether the iframe has ever loaded
  const hasIframeEverLoadedRef = useRef(false)
  const wasLoadedBeforeOpenRef = useRef(false)
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const lastFigmaUrlRef = useRef<string | null>(null)

  // Find the starting frame
  const startFrame = startFrameId ? frames.find(f => f.id === startFrameId) : null

  // Use prototype controls hook
  const {
    iframeRef,
    state: prototypeState,
    restart,
    navigateToFrame,
    isEmbedApiEnabled,
  } = usePrototypeControls({
    onComponentStateChange,
  })

  const currentNodeIdRef = useRef<string | null>(null)
  useEffect(() => {
    currentNodeIdRef.current = prototypeState.currentNodeId
  }, [prototypeState.currentNodeId])

  const navigateToFramePreservingOverlays = useCallback((nodeId: string, options?: { allowFallback?: boolean }) => {
    const iframeWindow = iframeRef.current?.contentWindow
    if (!iframeWindow) {
      if (options?.allowFallback !== false) {
        navigateToFrame(nodeId)
      }
      return
    }

    iframeWindow.postMessage(
      {
        type: 'NAVIGATE_TO_FRAME',
        data: { nodeId },
      },
      FIGMA_ORIGIN
    )
    if (options?.allowFallback === false) return
    const fallbackNodeId = nodeId
    setTimeout(() => {
      if (currentNodeIdRef.current === fallbackNodeId) return
      navigateToFrame(fallbackNodeId)
    }, 400)
  }, [navigateToFrame, iframeRef])

  const sendChangeComponentState = useCallback((nodeId: string, newVariantId: string) => {
    if (!isEmbedApiEnabled) return
    const iframeWindow = iframeRef.current?.contentWindow
    if (!iframeWindow) return

    iframeWindow.postMessage(
      {
        type: 'CHANGE_COMPONENT_STATE',
        data: { nodeId, newVariantId },
      },
      FIGMA_ORIGIN
    )
  }, [iframeRef, isEmbedApiEnabled])

  // Find frame by figma_node_id
  const findFrameByNodeId = useCallback(
    (nodeId: string): PrototypeTestFrame | undefined => {
      return findFrameByFigmaNodeId(frames, nodeId)
    },
    [frames]
  )

  // --- Goal/overlay derived values ---
  const goalFrameId = pathFrameIds.length > 0 ? pathFrameIds[pathFrameIds.length - 1] : null
  const goalFrameForLock = goalFrameId ? frames.find((frame) => frame.id === goalFrameId) : null
  const goalFrameNodeId = goalFrameForLock?.figma_node_id ?? null

  const initialGoalFrameId = initialPath.length > 0 ? initialPath[initialPath.length - 1] : null
  const initialGoalFrameNodeId = initialGoalFrameId
    ? frames.find(frame => frame.id === initialGoalFrameId)?.figma_node_id ?? null
    : null
  const initialBaseFrameIndex = useMemo(() => findBaseFrameIndex(initialPath, frames), [initialPath, frames])
  const initialBaseFrameId = initialBaseFrameIndex >= 0 ? initialPath[initialBaseFrameIndex] : null
  const initialBaseFrameNodeId = initialBaseFrameId
    ? frames.find(frame => frame.id === initialBaseFrameId)?.figma_node_id ?? null
    : null

  const goalPrevFrameId = pathFrameIds.length > 1 ? pathFrameIds[pathFrameIds.length - 2] : null
  const goalPrevFrame = useMemo(() => (
    goalPrevFrameId ? frames.find(f => f.id === goalPrevFrameId) || null : null
  ), [goalPrevFrameId, frames])
  const goalIsOverlay = useMemo(() => (
    !!(goalFrameForLock && goalPrevFrame && isOverlayFrame(goalFrameForLock, goalPrevFrame))
  ), [goalFrameForLock, goalPrevFrame])
  const goalBaseFrameIndex = useMemo(() => findBaseFrameIndex(pathFrameIds, frames), [pathFrameIds, frames])
  const goalBaseFrameId = goalBaseFrameIndex >= 0 ? pathFrameIds[goalBaseFrameIndex] : null
  const goalBaseFrameForLock = goalBaseFrameId
    ? frames.find((frame) => frame.id === goalBaseFrameId) || null
    : null
  const goalBaseFrameNodeId = goalBaseFrameForLock?.figma_node_id ?? null
  const shouldLockPreviewToGoal = false
  const selectableFrames = useMemo(() => {
    if (frames.length === 0) return []

    const referenceFrame = startFrame || frames[0]
    const mainPageName = referenceFrame?.page_name

    const frameAreas = frames
      .filter(f => f.width && f.height)
      .map(f => (f.width || 0) * (f.height || 0))
      .sort((a, b) => a - b)
    const medianArea = frameAreas.length > 0
      ? frameAreas[Math.floor(frameAreas.length / 2)]
      : 0

    return frames.filter(frame => {
      if (mainPageName && frame.page_name && frame.page_name !== mainPageName) {
        return false
      }
      if (frame.width && frame.height && medianArea > 0) {
        const area = frame.width * frame.height
        if (area < medianArea * 0.4) {
          return false
        }
      }
      return true
    })
  }, [frames, startFrame])
  useEffect(() => {
    if (!prototype.figma_url) return
    if (lastFigmaUrlRef.current === prototype.figma_url) return
    lastFigmaUrlRef.current = prototype.figma_url
    setEmbedUrl(null)
  }, [prototype.figma_url])

  useEffect(() => {
    if (!open) return
    if (!prototype.figma_url) return
    if (embedUrl) return
    if (editingPathId && !initialGoalFrameNodeId) return
    if (editingPathId && frames.length === 0) return

    const startNodeId = (editingPathId && initialBaseFrameNodeId)
      ? initialBaseFrameNodeId
      : (editingPathId && initialGoalFrameNodeId && !goalIsOverlay)
        ? initialGoalFrameNodeId
        : (startFrame?.figma_node_id ?? null)

    const url = generateEmbedUrl(prototype.figma_url, {
      startNodeId: startNodeId || undefined,
      showHotspotHints: true,
      enableEmbedApi: true,
    })
    setEmbedUrl(url)
  }, [open, prototype.figma_url, embedUrl, editingPathId, initialBaseFrameNodeId, initialGoalFrameNodeId, startFrame?.figma_node_id, goalIsOverlay, frames.length])
  useEffect(() => {
    if (prototypeState.isLoaded) {
      setIsLoaded(true)
      hasIframeEverLoadedRef.current = true
    }
  }, [prototypeState.isLoaded])
  const prevHistoryLengthRef = useRef(0)
  const hasCompletedInitialLoadRef = useRef(false)
  const wasOpenRef = useRef(false)

  // Reset tracking refs when modal opens
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      prevHistoryLengthRef.current = prototypeState.navigationHistory.length
      hasCompletedInitialLoadRef.current = false
    }
    wasOpenRef.current = open
  }, [open, prototypeState.navigationHistory.length])

  // Watch for navigation changes
  useEffect(() => {
    if (!open) return

    const { currentNodeId, navigationHistory } = prototypeState
    const historyLength = navigationHistory.length

    if (historyLength <= prevHistoryLengthRef.current) return
    prevHistoryLengthRef.current = historyLength

    if (initialPath.length > 0 && !hasCompletedInitialLoadRef.current) {
      hasCompletedInitialLoadRef.current = true
      if (currentNodeId) {
        const skipFrame = findFrameByNodeId(currentNodeId)
        if (skipFrame) lastNavFrameIdRef.current = skipFrame.id
      }
      return
    }

    if (currentNodeId) {
      const frame = findFrameByNodeId(currentNodeId)
      if (frame) {
        if (lastNavFrameIdRef.current === frame.id) {
          return
        }

        const navStepStates = trackComponentStates
          ? { ...componentStates.reduce((acc, s) => ({ ...acc, ...s }), {} as ComponentStateSnapshot), ...prototypeState.componentStates }
          : {}
        const newStep: BuilderStep = { frameId: frame.id, componentStates: navStepStates, changedComponents: [] }

        if (pathMode === 'flexible') {
          setSteps(prev => prev.length === 0 ? [newStep] : [prev[0], newStep])
        } else {
          setSteps(prev => [...prev, newStep])
        }
        if (trackComponentStates) hasSeenFirstStateChangeRef.current = true

        lastNavFrameIdRef.current = frame.id
        lastProcessedStateRef.current = null
      }
    }
  }, [prototypeState.navigationHistory.length, prototypeState.currentNodeId, open, findFrameByNodeId, initialPath.length, trackComponentStates, prototypeState.componentStates, pathMode, componentStates, frames, lastNavFrameIdRef, lastProcessedStateRef, hasSeenFirstStateChangeRef, setSteps])

  // Add starting frame when prototype loads (if no initial path provided)
  useEffect(() => {
    if (prototypeState.isLoaded && stepsRef.current.length === 0 && initialPath.length === 0) {
      const frameToAdd = startFrame || (prototypeState.currentNodeId ? findFrameByNodeId(prototypeState.currentNodeId) : null)
      if (frameToAdd) {
        const initialState = trackComponentStates ? { ...prototypeState.componentStates } : {}
        setSteps([{ frameId: frameToAdd.id, componentStates: initialState, changedComponents: [] }])
        lastNavFrameIdRef.current = frameToAdd.id
        if (wasLoadedBeforeOpenRef.current) {
          restart()
          if (frameToAdd.figma_node_id) {
            setTimeout(() => navigateToFrame(frameToAdd.figma_node_id!), 300)
          }
        }
      }
    }
  }, [prototypeState.isLoaded, startFrame, initialPath.length, prototypeState.currentNodeId, findFrameByNodeId, trackComponentStates, prototypeState.componentStates, navigateToFrame, restart, lastNavFrameIdRef, setSteps, stepsRef])

  // Track if we've navigated to last frame in edit mode
  const hasNavigatedToLastFrameRef = useRef(false)

  useEffect(() => {
    if (open) {
      hasNavigatedToLastFrameRef.current = false
    }
  }, [open])

  // When editing an existing path, navigate to the goal screen
  useEffect(() => {
    if (!isLoaded) return
    if (!open) return
    if (initialPath.length === 0) return
    if (hasNavigatedToLastFrameRef.current) return

    if (
      wasLoadedBeforeOpenRef.current &&
      goalIsOverlay &&
      prototypeState.currentNodeId === goalFrameNodeId
    ) {
      hasNavigatedToLastFrameRef.current = true
      return
    }

    let targetFrame: PrototypeTestFrame | undefined
    if (shouldLockPreviewToGoal && goalFrameForLock) {
      if (goalIsOverlay && !wasLoadedBeforeOpenRef.current) {
        targetFrame = goalBaseFrameForLock || goalFrameForLock
      } else {
        targetFrame = goalFrameForLock
      }
    } else {
      for (let i = initialPath.length - 1; i >= 1; i--) {
        const frame = frames.find(f => f.id === initialPath[i])
        if (!frame) continue
        const prevFrame = frames.find(f => f.id === initialPath[i - 1]) || null
        if (!isOverlayFrame(frame, prevFrame)) {
          targetFrame = frame
          break
        }
      }
      if (!targetFrame) {
        targetFrame = frames.find(f => f.id === initialPath[initialPath.length - 1])
      }
    }

    if (targetFrame?.figma_node_id) {
      const targetIndex = initialPath.findIndex(id => id === targetFrame?.id)
      const prevFrame = targetIndex > 0 ? frames.find(f => f.id === initialPath[targetIndex - 1]) || null : null
      const targetIsOverlay = !!(targetFrame && prevFrame && isOverlayFrame(targetFrame, prevFrame))
      hasNavigatedToLastFrameRef.current = true
      const nodeId = targetFrame.figma_node_id
      const delay = wasLoadedBeforeOpenRef.current ? 100 : 500
      setTimeout(() => {
        navigateToFramePreservingOverlays(nodeId, { allowFallback: !targetIsOverlay })
      }, delay)

      setTimeout(() => {
        if (!hasCompletedInitialLoadRef.current) {
          hasCompletedInitialLoadRef.current = true
          const currentFrame = frames.find(f => f.figma_node_id === nodeId)
          if (currentFrame) lastNavFrameIdRef.current = currentFrame.id
        }
      }, delay + 600)
    }
  }, [isLoaded, open, initialPath, frames, navigateToFramePreservingOverlays, prototypeState.isLoaded, shouldLockPreviewToGoal, goalFrameForLock, goalIsOverlay, goalBaseFrameForLock, goalFrameNodeId, lastNavFrameIdRef])

  // Fallback: set loaded after iframe onLoad + timeout
  const handleIframeLoad = useCallback(() => {
    setTimeout(() => {
      setIsLoaded((prev) => {
        if (!prev) {
          hasIframeEverLoadedRef.current = true
          if (startFrame && stepsRef.current.length === 0) {
            const initialState = trackComponentStates ? { ...prototypeState.componentStates } : {}
            setSteps([{ frameId: startFrame.id, componentStates: initialState, changedComponents: [] }])
            lastNavFrameIdRef.current = startFrame.id
          }
          return true
        }
        return prev
      })
    }, 2000)
  }, [startFrame, trackComponentStates, prototypeState.componentStates, lastNavFrameIdRef, setSteps, stepsRef])

  // Find current frame from prototype state to highlight it
  const currentFrame = prototypeState.currentNodeId
    ? findFrameByNodeId(prototypeState.currentNodeId)
    : null

  return {
    // State
    isLoaded,
    embedUrl,

    // Derived values
    goalFrameForLock,
    goalFrameNodeId,
    goalIsOverlay,
    goalBaseFrameNodeId,
    goalBaseFrameIndex,
    shouldLockPreviewToGoal,
    selectableFrames,
    currentFrame,

    // Prototype controls
    iframeRef,
    prototypeState,
    restart,
    navigateToFrame,
    sendChangeComponentState,

    // Callbacks
    handleIframeLoad,
    findFrameByNodeId,

    // Refs
    hasIframeEverLoadedRef,
    wasLoadedBeforeOpenRef,
    hasCompletedInitialLoadRef,
  }
}
