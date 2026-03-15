import { useEffect, useRef } from 'react'
import type { PrototypeTestFrame, PathwayStep } from '@veritio/study-types'
import type { ComponentStateSnapshot } from '../../hooks/use-prototype-controls'
import { isOverlayFrame } from '../composite-thumbnail'
import { findBaseFrameIndex } from './overlay-utils'
import { restoreStepsFromPathwaySteps } from './pathway-builder-step-restoration'
import type { BuilderStep, PathMode } from './pathway-builder-types'

interface UsePathwayBuilderLifecycleProps {
  open: boolean
  frames: PrototypeTestFrame[]
  startFrameId?: string | null
  initialPath: string[]
  initialSteps?: PathwayStep[]
  initialName: string
  editingPathId?: string

  // Navigation
  restart: () => void
  navigateToFrame: (nodeId: string) => void
  hasIframeEverLoadedRef: React.MutableRefObject<boolean>
  wasLoadedBeforeOpenRef: React.MutableRefObject<boolean>

  // Refs to reset
  unlockRequestedRef: React.MutableRefObject<boolean>
  pendingAutoApplyStatesRef: React.MutableRefObject<Map<string, string>>
  savedThisSessionRef: React.MutableRefObject<boolean>
  modalOpenedAtRef: React.MutableRefObject<number>
  lastNavFrameIdRef: React.MutableRefObject<string | null>
  lastProcessedStateRef: React.MutableRefObject<string | null>
  trackingPromptDismissedRef: React.MutableRefObject<boolean>
  pendingComponentEventRef: React.MutableRefObject<unknown>
  prevComponentStateRef: React.MutableRefObject<ComponentStateSnapshot>
  hasSeenFirstStateChangeRef: React.MutableRefObject<boolean>

  // Setters
  setSteps: React.Dispatch<React.SetStateAction<BuilderStep[]>>
  setPathName: React.Dispatch<React.SetStateAction<string>>
  setPathMode: React.Dispatch<React.SetStateAction<PathMode>>
  setHoveredStepIndex: React.Dispatch<React.SetStateAction<number | null>>
  setDeleteConfirm: React.Dispatch<React.SetStateAction<{ open: boolean; fromIndex: number; stepsToDelete: number }>>
  setFrameSelector: React.Dispatch<React.SetStateAction<{ open: boolean; type: 'start' | 'goal' }>>
  setGoalLockDisabled: React.Dispatch<React.SetStateAction<boolean>>
  setOverlayHintEligible: React.Dispatch<React.SetStateAction<boolean>>
  setHasPrototypeInteraction: (v: boolean) => void
  setShowTrackingPrompt: (v: boolean) => void
  setTrackComponentStates: (v: boolean) => void

  // Goal frame info (for overlay hint eligibility)
  goalFrameNodeId: string | null | undefined
}

/**
 * Manages modal open/close lifecycle effects:
 * - Resets all state when modal opens
 * - Restores steps from initialSteps
 * - Navigates prototype back to correct frame on close without save
 * - Controls overlay hint eligibility timer
 */
export function usePathwayBuilderLifecycle({
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
  setHasPrototypeInteraction,
  setShowTrackingPrompt,
  setTrackComponentStates,
  goalFrameNodeId,
}: UsePathwayBuilderLifecycleProps) {
  // Overlay hint eligibility timer
  useEffect(() => {
    if (!open) {
      setOverlayHintEligible(false)
      return
    }
    setOverlayHintEligible(true)
    const timeout = setTimeout(() => setOverlayHintEligible(false), 4000)
    return () => clearTimeout(timeout)
  }, [open, goalFrameNodeId])

  // Reset all state when modal opens
  useEffect(() => {
    if (open) {
      wasLoadedBeforeOpenRef.current = hasIframeEverLoadedRef.current
      setGoalLockDisabled(false)
      unlockRequestedRef.current = false
      pendingAutoApplyStatesRef.current.clear()
      setPathName(initialName)
      setPathMode('strict')
      setHoveredStepIndex(null)
      setDeleteConfirm({ open: false, fromIndex: -1, stepsToDelete: 0 })
      setFrameSelector({ open: false, type: 'start' })
      savedThisSessionRef.current = false
      setHasPrototypeInteraction(false)
      trackingPromptDismissedRef.current = false
      setShowTrackingPrompt(false)
      pendingComponentEventRef.current = null
      modalOpenedAtRef.current = Date.now()

      const hasStateSteps = initialSteps?.some(s => s.type === 'state') ?? false
      if (hasStateSteps && initialSteps) {
        const { steps: restoredSteps, lastComponentState } = restoreStepsFromPathwaySteps(initialSteps)
        setTrackComponentStates(true)
        setSteps(restoredSteps.length > 0 ? restoredSteps : [])
        prevComponentStateRef.current = lastComponentState
        hasSeenFirstStateChangeRef.current = true
      } else {
        setSteps(initialPath.length > 0
          ? initialPath.map(frameId => ({ frameId, componentStates: {}, changedComponents: [] }))
          : []
        )
        setTrackComponentStates(false)
        prevComponentStateRef.current = {}
        hasSeenFirstStateChangeRef.current = false
      }

      lastNavFrameIdRef.current = null
      lastProcessedStateRef.current = null
    }
  }, [open, initialPath, initialSteps, initialName])

  // Handle close: restart prototype and navigate back to last saved frame
  const prevOpenRef = useRef(open)
  useEffect(() => {
    const wasOpen = prevOpenRef.current
    prevOpenRef.current = open

    if (wasOpen && !open) {
      if (!savedThisSessionRef.current && hasIframeEverLoadedRef.current) {
        restart()

        setTimeout(() => {
          if (initialPath.length > 0) {
            const lastSavedFrameId = initialPath[initialPath.length - 1]
            const lastSavedFrame = frames.find(f => f.id === lastSavedFrameId)

            let targetFrame = lastSavedFrame
            if (lastSavedFrame && initialPath.length > 1) {
              const prevFrame = frames.find(f => f.id === initialPath[initialPath.length - 2])
              if (prevFrame && isOverlayFrame(lastSavedFrame, prevFrame)) {
                const baseIndex = findBaseFrameIndex(initialPath, frames)
                if (baseIndex >= 0) {
                  targetFrame = frames.find(f => f.id === initialPath[baseIndex]) || lastSavedFrame
                }
              }
            }

            if (targetFrame?.figma_node_id) {
              navigateToFrame(targetFrame.figma_node_id)
            }
          } else {
            const startFrame = startFrameId ? frames.find(f => f.id === startFrameId) : null
            if (startFrame?.figma_node_id) {
              navigateToFrame(startFrame.figma_node_id)
            }
          }
        }, 300)
      }
    }
  }, [open, restart, navigateToFrame, initialPath, frames, startFrameId])
}
