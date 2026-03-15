import { useState, useEffect, useMemo, useRef } from 'react'
import type { ComponentStateSnapshot } from '../../hooks/use-prototype-controls'

interface UseGoalLockEffectsProps {
  open: boolean
  isLoaded: boolean
  shouldLockPreviewToGoal: boolean
  goalBaseFrameNodeId: string | null | undefined
  goalBaseFrameIndex: number
  goalFrameNodeId: string | null | undefined
  goalIsOverlay: boolean
  trackComponentStates: boolean
  pathFrameIds: string[]
  componentStates: ComponentStateSnapshot[]
  initialPath: string[]
  overlayHintEligible: boolean
  goalLockDisabled: boolean
  prototypeState: {
    currentNodeId: string | null
    componentStates: Record<string, string>
  }
  unlockRequestedRef: React.MutableRefObject<boolean>
  pendingAutoApplyStatesRef: React.MutableRefObject<Map<string, string>>
  wasLoadedBeforeOpenRef: React.MutableRefObject<boolean>
  sendChangeComponentState: (componentNodeId: string, variantId: string) => void
  findFrameByNodeId: (nodeId: string) => void
}

export function useGoalLockEffects({
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
  findFrameByNodeId,
}: UseGoalLockEffectsProps) {
  // Goal lock effect
  const lastLockAttemptRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (!isLoaded) return
    if (!shouldLockPreviewToGoal) return
    if (!goalBaseFrameNodeId) return
    if (unlockRequestedRef.current) return

    if (prototypeState.currentNodeId === goalBaseFrameNodeId) {
      lastLockAttemptRef.current = null
      return
    }
    if (goalIsOverlay && prototypeState.currentNodeId === goalFrameNodeId) {
      if (!wasLoadedBeforeOpenRef.current) {
        lastLockAttemptRef.current = prototypeState.currentNodeId
        findFrameByNodeId(goalBaseFrameNodeId)
      }
      return
    }

    if (lastLockAttemptRef.current === prototypeState.currentNodeId) {
      return
    }

    lastLockAttemptRef.current = prototypeState.currentNodeId
  }, [open, isLoaded, shouldLockPreviewToGoal, goalBaseFrameNodeId, prototypeState.currentNodeId, goalIsOverlay, goalFrameNodeId])

  useEffect(() => {
    lastLockAttemptRef.current = null
    unlockRequestedRef.current = false
  }, [goalFrameNodeId, shouldLockPreviewToGoal])

  // Auto-apply goal state
  const goalStepIndex = pathFrameIds.length > 0 ? pathFrameIds.length - 1 : -1
  const goalStateSnapshot = goalStepIndex >= 0 ? componentStates[goalStepIndex] : null
  const baseStateSnapshot = goalBaseFrameIndex >= 0 ? componentStates[goalBaseFrameIndex] : null
  const autoApplyStateSnapshot = goalIsOverlay ? baseStateSnapshot : goalStateSnapshot
  const autoApplyHasComponentStates = trackComponentStates && !!autoApplyStateSnapshot && Object.keys(autoApplyStateSnapshot).length > 0
  const autoApplyStateKey = useMemo(() => {
    if (!autoApplyStateSnapshot) return ''
    return Object.keys(autoApplyStateSnapshot)
      .sort()
      .map((key) => `${key}:${autoApplyStateSnapshot[key]}`)
      .join('|')
  }, [autoApplyStateSnapshot])
  const isEditingWithStates = initialPath.length > 0 && autoApplyHasComponentStates
  const shouldAutoApplyGoalState = (shouldLockPreviewToGoal && autoApplyHasComponentStates) || isEditingWithStates

  const autoApplyStateRef = useRef<{ key: string; attempts: number }>({ key: '', attempts: 0 })
  const [showOverlayHint, setShowOverlayHint] = useState(false)

  useEffect(() => {
    autoApplyStateRef.current = { key: '', attempts: 0 }
  }, [goalFrameNodeId, open])

  useEffect(() => {
    if (!open) return
    if (!isLoaded) return
    if (!shouldAutoApplyGoalState) return
    if (!goalBaseFrameNodeId) return
    if (!autoApplyStateSnapshot) return
    if (prototypeState.currentNodeId !== goalBaseFrameNodeId) return

    const matchesCurrent = Object.entries(autoApplyStateSnapshot).every(
      ([componentNodeId, variantId]) =>
        prototypeState.componentStates[componentNodeId] === variantId
    )
    if (matchesCurrent) return

    if (autoApplyStateRef.current.key !== autoApplyStateKey) {
      autoApplyStateRef.current = { key: autoApplyStateKey, attempts: 0 }
    }

    if (autoApplyStateRef.current.attempts >= 3) return
    autoApplyStateRef.current.attempts += 1

    Object.entries(autoApplyStateSnapshot).forEach(([componentNodeId, variantId]) => {
      pendingAutoApplyStatesRef.current.set(componentNodeId, variantId)
      sendChangeComponentState(componentNodeId, variantId)
    })
  }, [
    open,
    isLoaded,
    shouldAutoApplyGoalState,
    goalBaseFrameNodeId,
    autoApplyStateSnapshot,
    autoApplyStateKey,
    prototypeState.currentNodeId,
    prototypeState.componentStates,
    sendChangeComponentState,
  ])

  // Overlay hint effect
  useEffect(() => {
    if (!open) {
      setShowOverlayHint(false)
      return
    }
    if (!overlayHintEligible) {
      setShowOverlayHint(false)
      return
    }
    if (!isLoaded || !goalIsOverlay || !goalFrameNodeId) {
      setShowOverlayHint(false)
      return
    }
    if (goalLockDisabled) {
      setShowOverlayHint(false)
      return
    }
    if (prototypeState.currentNodeId === goalFrameNodeId) {
      setShowOverlayHint(false)
      return
    }
    const timeout = setTimeout(() => setShowOverlayHint(true), 200)
    return () => clearTimeout(timeout)
  }, [open, overlayHintEligible, isLoaded, goalIsOverlay, goalFrameNodeId, prototypeState.currentNodeId, goalLockDisabled])

  return {
    showOverlayHint,
    setShowOverlayHint,
  }
}
