'use client'

import { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { generatePathName } from '../../lib/utils/pathway-migration'
import { findFrameByFigmaNodeId } from '../../lib/figma-frame-matching'
import type { PrototypeTestPrototype, PrototypeTestFrame, PathwayStep } from '@veritio/study-types'
import type { ComponentStateSnapshot } from '../../hooks/use-prototype-controls'
import { useComponentStateTracking } from './use-component-state-tracking'
import { useFigmaFrameNavigation } from './use-figma-frame-navigation'
import { buildPathwayStepsFromBuilderSteps } from './pathway-builder-step-restoration'
import { usePathwayBuilderStepInfo } from './pathway-builder-step-info'
import { useGoalLockEffects } from './use-goal-lock-effects'
import { usePathwayBuilderLifecycle } from './use-pathway-builder-lifecycle'

export type { ComponentVariant, ComponentInstance, BuilderStep, PathwayBuilderResult, PathMode } from './pathway-builder-types'
import type { BuilderStep, PathMode, PathwayBuilderResult } from './pathway-builder-types'

interface UsePathwayBuilderStateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prototype: PrototypeTestPrototype
  frames: PrototypeTestFrame[]
  startFrameId?: string | null
  initialPath?: string[]
  initialSteps?: PathwayStep[]
  initialName?: string
  editingPathId?: string
  onSave: (result: PathwayBuilderResult) => void
}

export function usePathwayBuilderState({
  open,
  onOpenChange,
  prototype,
  frames,
  startFrameId,
  initialPath = [],
  initialSteps,
  initialName = '',
  editingPathId,
  onSave,
}: UsePathwayBuilderStateProps) {
  const [steps, setSteps] = useState<BuilderStep[]>(
    initialPath.map(frameId => ({ frameId, componentStates: {}, changedComponents: [] }))
  )
  const [pathName, setPathName] = useState(initialName)

  const [pathMode, setPathMode] = useState<PathMode>('strict')

  const [goalLockDisabled, setGoalLockDisabled] = useState(false)
  const [overlayHintEligible, setOverlayHintEligible] = useState(false)
  const goalLockDisabledRef = useRef(goalLockDisabled)
  const unlockRequestedRef = useRef(false)
  const pendingAutoApplyStatesRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    goalLockDisabledRef.current = goalLockDisabled
  }, [goalLockDisabled])

  const pathFrameIds = useMemo(() => steps.map(s => s.frameId), [steps])
  const componentStates = useMemo(() => steps.map(s => s.componentStates), [steps])
  const changedComponentsPerStep = useMemo(() => steps.map(s => s.changedComponents), [steps])

  // CRITICAL: Ref for synchronous access to componentStates during render.
  const componentStatesRef = useRef<ComponentStateSnapshot[]>([])

  useLayoutEffect(() => {
    componentStatesRef.current = componentStates
  }, [componentStates])

  // CRITICAL FIX: Radix UI Dialog sets pointer-events: none on body which breaks
  // React 19's synthetic event system.
  useEffect(() => {
    if (!open) return
    const fix = () => {
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = ''
      }
    }
    fix()
    const t = setTimeout(fix, 0)
    const observer = new MutationObserver(fix)
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] })
    return () => { clearTimeout(t); observer.disconnect() }
  }, [open])

  const openRef = useRef(open)
  const trackComponentStatesRef = useRef(false) // Will be synced below
  const stepsRef = useRef(steps)
  const pathFrameIdsRef = useRef(pathFrameIds)
  const pathModeRef = useRef(pathMode)
  openRef.current = open
  stepsRef.current = steps
  pathFrameIdsRef.current = pathFrameIds
  pathModeRef.current = pathMode

  const isEditingExistingPath = !!editingPathId

  const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean
    fromIndex: number
    stepsToDelete: number
  }>({ open: false, fromIndex: -1, stepsToDelete: 0 })

  const [frameSelector, setFrameSelector] = useState<{
    open: boolean
    type: 'start' | 'goal'
  }>({ open: false, type: 'start' })

  const modalOpenedAtRef = useRef<number>(0)
  const savedThisSessionRef = useRef(false)
  const lastProcessedStateRef = useRef<string | null>(null)
  const lastNavFrameIdRef = useRef<string | null>(null)

  const componentStateTracking = useComponentStateTracking({
    open,
    frames,
    prototypeStudyId: prototype.study_id,
    prototypeId: prototype.id,
    isEditingExistingPath,
    openRef,
    trackComponentStatesRef,
    pathFrameIdsRef,
    pathModeRef,
    goalLockDisabledRef,
    componentStatesRef,
    modalOpenedAtRef,
    pendingAutoApplyStatesRef,
    unlockRequestedRef,
    lastProcessedStateRef,
    setSteps,
    setOverlayHintEligible,
    setGoalLockDisabled,
  })

  const {
    trackComponentStates,
    hasPrototypeInteraction,
    showTrackingPrompt,
    componentVariants,
    componentInstances,
    setTrackComponentStates,
    setShowTrackingPrompt,
    prevComponentStateRef,
    hasSeenFirstStateChangeRef,
    trackingPromptDismissedRef,
    pendingComponentEventRef,
    handleComponentStateChange,
    handleEnableTracking,
  } = componentStateTracking

  // Keep the ref in sync
  trackComponentStatesRef.current = trackComponentStates

  const navigation = useFigmaFrameNavigation({
    open,
    prototype,
    frames,
    startFrameId,
    initialPath,
    editingPathId,
    pathMode,
    trackComponentStates,
    onComponentStateChange: handleComponentStateChange,
    pathFrameIdsRef,
    stepsRef,
    lastNavFrameIdRef,
    lastProcessedStateRef,
    hasSeenFirstStateChangeRef,
    setSteps,
    componentStates,
    pathFrameIds,
  })

  const {
    isLoaded,
    embedUrl,
    goalFrameForLock,
    goalFrameNodeId,
    goalIsOverlay,
    goalBaseFrameNodeId,
    goalBaseFrameIndex,
    shouldLockPreviewToGoal,
    selectableFrames,
    currentFrame,
    iframeRef,
    prototypeState,
    restart,
    navigateToFrame,
    sendChangeComponentState,
    handleIframeLoad,
    hasIframeEverLoadedRef,
    wasLoadedBeforeOpenRef,
  } = navigation

  // Lifecycle: open/close reset, step restoration, close-dismiss navigation
  usePathwayBuilderLifecycle({
    open,
    frames,
    startFrameId,
    initialPath,
    initialSteps,
    initialName,
    restart,
    navigateToFrame,
    hasIframeEverLoadedRef,
    wasLoadedBeforeOpenRef,
    unlockRequestedRef,
    pendingAutoApplyStatesRef,
    savedThisSessionRef,
    modalOpenedAtRef,
    lastNavFrameIdRef,
    lastProcessedStateRef,
    trackingPromptDismissedRef,
    pendingComponentEventRef,
    prevComponentStateRef,
    hasSeenFirstStateChangeRef,
    setSteps,
    setPathName,
    setPathMode,
    setHoveredStepIndex,
    setDeleteConfirm,
    setFrameSelector,
    setGoalLockDisabled,
    setOverlayHintEligible,
    setHasPrototypeInteraction: componentStateTracking.setHasPrototypeInteraction,
    setShowTrackingPrompt,
    setTrackComponentStates,
    goalFrameNodeId,
  })

  useEffect(() => {
    if (trackComponentStates && steps.length > 0 && !hasSeenFirstStateChangeRef.current) {
      prevComponentStateRef.current = { ...prototypeState.componentStates }
      hasSeenFirstStateChangeRef.current = true
    }
  }, [trackComponentStates, steps.length, prototypeState.componentStates])

  const prevTrackComponentStatesRef = useRef(trackComponentStates)
  useEffect(() => {
    const wasDisabled = !prevTrackComponentStatesRef.current
    const isNowEnabled = trackComponentStates
    prevTrackComponentStatesRef.current = trackComponentStates

    if (wasDisabled && isNowEnabled) {
      navigation.hasCompletedInitialLoadRef.current = true

      if (prototypeState.currentNodeId && open) {
        const currentFrameMatch = findFrameByFigmaNodeId(frames, prototypeState.currentNodeId)
        if (currentFrameMatch) {
          const lastFrameId = pathFrameIds.length > 0 ? pathFrameIds[pathFrameIds.length - 1] : null
          if (currentFrameMatch.id !== lastFrameId) {
            const currentStates = { ...prototypeState.componentStates }
            const newStep: BuilderStep = { frameId: currentFrameMatch.id, componentStates: currentStates, changedComponents: [] }
            setSteps(prev => [...prev, newStep])
            lastNavFrameIdRef.current = currentFrameMatch.id
            hasSeenFirstStateChangeRef.current = true
          }
        }
      }
    }
  }, [trackComponentStates, prototypeState.currentNodeId, prototypeState.componentStates, open, frames, pathFrameIds])

  // Goal lock, auto-apply state, and overlay hint effects (extracted)
  const goalLockEffects = useGoalLockEffects({
    open,
    isLoaded,
    shouldLockPreviewToGoal,
    goalBaseFrameNodeId,
    goalBaseFrameIndex,
    goalFrameNodeId,
    goalIsOverlay,
    trackComponentStates,
    pathFrameIds,
    componentStates,
    initialPath,
    overlayHintEligible,
    goalLockDisabled,
    prototypeState,
    unlockRequestedRef,
    pendingAutoApplyStatesRef,
    wasLoadedBeforeOpenRef,
    sendChangeComponentState,
    findFrameByNodeId: navigation.findFrameByNodeId,
  })

  const { showOverlayHint, setShowOverlayHint } = goalLockEffects

  // Path manipulation handlers
  const startFrame = startFrameId ? frames.find(f => f.id === startFrameId) : null

  const handleClearPath = useCallback(() => {
    const resetFrameId = startFrame?.id || (frames.length > 0 ? frames[0].id : null)
    setSteps(resetFrameId
      ? [{ frameId: resetFrameId, componentStates: {}, changedComponents: [] }]
      : []
    )
    prevComponentStateRef.current = {}
    componentStateTracking.setHasPrototypeInteraction(false)
    trackingPromptDismissedRef.current = false
    hasSeenFirstStateChangeRef.current = true
    lastNavFrameIdRef.current = resetFrameId
    lastProcessedStateRef.current = null
    modalOpenedAtRef.current = Date.now()
    restart()
  }, [restart, startFrame, frames])

  const handlePathModeChange = useCallback((newMode: PathMode) => {
    setPathMode(newMode)
    if (newMode === 'flexible' && steps.length > 2) {
      setSteps(prev => prev.length > 2 ? [prev[0], prev[prev.length - 1]] : prev)
    }
  }, [steps.length])

  const handleDeleteFromStep = (index: number) => {
    if (index === 0) return
    const numStepsToDelete = steps.length - index
    setDeleteConfirm({ open: true, fromIndex: index, stepsToDelete: numStepsToDelete })
  }

  const handleConfirmDelete = () => {
    const truncatedSteps = steps.slice(0, deleteConfirm.fromIndex)

    setSteps(truncatedSteps)
    setDeleteConfirm({ open: false, fromIndex: -1, stepsToDelete: 0 })
    setHoveredStepIndex(null)
    lastProcessedStateRef.current = null

    if (truncatedSteps.length === 1) {
      lastNavFrameIdRef.current = null
      hasSeenFirstStateChangeRef.current = true
      restart()
    } else if (truncatedSteps.length > 1) {
      const lastStep = truncatedSteps[truncatedSteps.length - 1]
      const lastFrame = frames.find(f => f.id === lastStep.frameId)
      if (lastFrame?.figma_node_id) {
        lastNavFrameIdRef.current = lastFrame.id
        navigateToFrame(lastFrame.figma_node_id)
      }
    }
  }

  const handleFrameSelect = useCallback((selectedFrameIds: string[]) => {
    if (selectedFrameIds.length === 0) return

    const selectedFrameId = selectedFrameIds[0]

    const emptyStep = (frameId: string): BuilderStep => ({ frameId, componentStates: {}, changedComponents: [] })

    if (frameSelector.type === 'start') {
      setSteps([emptyStep(selectedFrameId)])
      prevComponentStateRef.current = {}
      hasSeenFirstStateChangeRef.current = true
      lastNavFrameIdRef.current = selectedFrameId
      lastProcessedStateRef.current = null

      const frame = frames.find(f => f.id === selectedFrameId)
      if (frame?.figma_node_id) {
        navigateToFrame(frame.figma_node_id)
      }
    } else {
      if (steps.length === 0) {
        const currentFrameId = prototypeState.currentNodeId
          ? findFrameByFigmaNodeId(frames, prototypeState.currentNodeId)?.id
          : null
        if (currentFrameId && currentFrameId !== selectedFrameId) {
          setSteps([emptyStep(currentFrameId), emptyStep(selectedFrameId)])
        } else {
          setSteps([emptyStep(selectedFrameId)])
        }
      } else if (steps.length === 1) {
        if (steps[0].frameId !== selectedFrameId) {
          setSteps(prev => [...prev, emptyStep(selectedFrameId)])
        }
      } else {
        setSteps(prev => [...prev.slice(0, -1), emptyStep(selectedFrameId)])
      }
    }

    setFrameSelector({ open: false, type: 'start' })
  }, [frameSelector.type, steps, frames, navigateToFrame, prototypeState.currentNodeId])

  const openFrameSelector = useCallback((type: 'start' | 'goal') => {
    setFrameSelector({ open: true, type })
  }, [])

  const getFrameName = useCallback(
    (frameId: string) => frames.find((f) => f.id === frameId)?.name,
    [frames]
  )

  // Save handler
  const handleSave = useCallback(() => {
    if (pathFrameIds.length < 2 && !editingPathId) return

    savedThisSessionRef.current = true

    const finalName = pathName.trim() || (pathFrameIds.length > 0 ? generatePathName(pathFrameIds, getFrameName) : '')

    const pathwaySteps = trackComponentStates && steps.length > 0
      ? buildPathwayStepsFromBuilderSteps(steps, componentVariants)
      : undefined

    onSave({
      steps: pathwaySteps,
      frames: pathFrameIds,
      name: finalName,
      editingPathId,
    })
    onOpenChange(false)
  }, [steps, pathFrameIds, pathName, getFrameName, editingPathId, trackComponentStates, componentVariants, onSave, onOpenChange])

  const canSave = pathFrameIds.length >= 2 && !goalIsOverlay

  // Get frames for the path
  const pathFrames = pathFrameIds
    .map((id) => frames.find((f) => f.id === id))
    .filter(Boolean) as PrototypeTestFrame[]

  // Step info helpers (extracted)
  const stepInfo = usePathwayBuilderStepInfo({
    componentStates,
    changedComponentsPerStep,
    componentVariants,
    componentInstances,
    trackComponentStates,
  })

  const modalTitle = editingPathId
    ? `Edit: ${initialName || 'Task Flow'}`
    : 'Configure Task Flow'

  const pathStartFrame = pathFrames[0]
  const pathGoalFrame = pathFrames.length > 1 ? pathFrames[pathFrames.length - 1] : null
  const pathMiddleFrames = pathFrames.slice(1, -1)

  return {
    isLoaded,
    pathMode,
    pathName,
    trackComponentStates,
    hasPrototypeInteraction,
    deleteConfirm,
    frameSelector,
    showTrackingPrompt,
    hoveredStepIndex,
    showOverlayHint,
    embedUrl,
    componentVariants,
    componentInstances,
    goalLockDisabled,
    overlayHintEligible,
    pathFrameIds,
    componentStates,
    changedComponentsPerStep,
    pathFrames,
    pathStartFrame,
    pathGoalFrame,
    pathMiddleFrames,
    currentFrame,
    canSave,
    goalIsOverlay,
    shouldLockPreviewToGoal,
    selectableFrames,
    modalTitle,
    goalFrameForLock,
    goalBaseFrameNodeId,
    goalFrameNodeId,
    handleSave,
    handleClearPath,
    handleDeleteFromStep,
    handleConfirmDelete,
    handleFrameSelect,
    handleIframeLoad,
    openFrameSelector,
    getFrameName,
    handleEnableTracking,
    getStepVariantInfo: stepInfo.getStepVariantInfo,
    getOverlaysForStep: stepInfo.getOverlaysForStep,
    getFrameDimensions: stepInfo.getFrameDimensions,
    iframeRef,
    prototypeState,
    setPathMode: handlePathModeChange,
    setPathName,
    setTrackComponentStates,
    setDeleteConfirm,
    setFrameSelector,
    setShowTrackingPrompt,
    setHoveredStepIndex,
    setShowOverlayHint,
    trackingPromptDismissedRef,
    hasSeenFirstStateChangeRef,
    pendingComponentEventRef,
  }
}
