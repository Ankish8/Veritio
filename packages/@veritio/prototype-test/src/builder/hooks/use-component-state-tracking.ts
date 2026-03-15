'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuthFetch } from '../../hooks'
import { findFrameByFigmaNodeId } from '../../lib/figma-frame-matching'
import type { PrototypeTestFrame } from '@veritio/study-types'
import type { ComponentStateChangeEvent, ComponentStateSnapshot } from '../../hooks/use-prototype-controls'
import type { BuilderStep, ComponentVariant, ComponentInstance } from './use-pathway-builder-state'

interface UseComponentStateTrackingProps {
  open: boolean
  frames: PrototypeTestFrame[]
  prototypeStudyId: string
  prototypeId: string
  isEditingExistingPath: boolean
  openRef: React.MutableRefObject<boolean>
  trackComponentStatesRef: React.MutableRefObject<boolean>
  pathFrameIdsRef: React.MutableRefObject<string[]>
  pathModeRef: React.MutableRefObject<'flexible' | 'strict'>
  goalLockDisabledRef: React.MutableRefObject<boolean>
  componentStatesRef: React.MutableRefObject<ComponentStateSnapshot[]>
  modalOpenedAtRef: React.MutableRefObject<number>
  pendingAutoApplyStatesRef: React.MutableRefObject<Map<string, string>>
  unlockRequestedRef: React.MutableRefObject<boolean>
  lastProcessedStateRef: React.MutableRefObject<string | null>
  setSteps: React.Dispatch<React.SetStateAction<BuilderStep[]>>
  setOverlayHintEligible: React.Dispatch<React.SetStateAction<boolean>>
  setGoalLockDisabled: React.Dispatch<React.SetStateAction<boolean>>
}
export function useComponentStateTracking({
  open,
  frames,
  prototypeStudyId,
  prototypeId,
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
}: UseComponentStateTrackingProps) {
  // Component tracking state
  const [trackComponentStates, setTrackComponentStates] = useState(false)
  const [hasPrototypeInteraction, setHasPrototypeInteraction] = useState(false)

  // Track previous component state to detect changes
  const prevComponentStateRef = useRef<ComponentStateSnapshot>({})
  // Track if we've seen the first state change (to ignore initial load)
  const hasSeenFirstStateChangeRef = useRef(false)

  // Component tracking prompt - shown when user clicks component without tracking enabled
  const [showTrackingPrompt, setShowTrackingPrompt] = useState(false)

  // Remember if user dismissed the prompt - don't ask again this session
  const trackingPromptDismissedRef = useRef(false)
  // Store the pending event that triggered the prompt so we can capture it when user enables tracking
  const pendingComponentEventRef = useRef<ComponentStateChangeEvent | null>(null)

  // Component variants for displaying actual variant images
  const [componentVariants, setComponentVariants] = useState<ComponentVariant[]>([])
  // Component instances with their positions for compositing
  const [componentInstances, setComponentInstances] = useState<ComponentInstance[]>([])

  const authFetch = useAuthFetch()
  const handleComponentStateChange = useCallback((event: ComponentStateChangeEvent) => {
    if (!openRef.current) return

    if (!trackComponentStatesRef.current) {
      // Ignore events within 1s of the modal opening (tracking-disabled path ONLY).
      if (Date.now() - modalOpenedAtRef.current < 1000) return
      setHasPrototypeInteraction(true)

      if (!trackingPromptDismissedRef.current) {
        pendingComponentEventRef.current = event
        setShowTrackingPrompt(true)
      }
      return
    }

    // Skip if we don't have at least one step yet
    if (pathFrameIdsRef.current.length === 0) return

    // Skip the first state change (initial prototype load with default states)
    if (!hasSeenFirstStateChangeRef.current) {
      hasSeenFirstStateChangeRef.current = true
      return
    }

    const { nodeId, newVariantId, currentFrameNodeId, cumulativeStates } = event

    const pendingVariant = pendingAutoApplyStatesRef.current.get(nodeId)
    if (pendingVariant && pendingVariant === newVariantId) {
      pendingAutoApplyStatesRef.current.delete(nodeId)
      return
    }

    if (isEditingExistingPath && !goalLockDisabledRef.current) {
      unlockRequestedRef.current = true
      setOverlayHintEligible(false)
      setGoalLockDisabled(true)
    }

    // Find the current frame FIRST before deduplication
    let frame = currentFrameNodeId ? findFrameByFigmaNodeId(frames, currentFrameNodeId) : null

    // FALLBACK: If frame not found, use the last step's frame
    if (!frame && pathFrameIdsRef.current.length > 0) {
      const lastStepFrameId = pathFrameIdsRef.current[pathFrameIdsRef.current.length - 1]
      frame = frames.find(f => f.id === lastStepFrameId) || null
    }

    // Deduplication: Create a unique key for this state change
    const effectiveFrameNodeId = frame?.figma_node_id || currentFrameNodeId
    const stateKey = `${nodeId}:${newVariantId}:${effectiveFrameNodeId}`
    if (lastProcessedStateRef.current === stateKey) {
      return
    }
    lastProcessedStateRef.current = stateKey

    if (!frame) return

    // Create a new step for THIS specific change
    // Merge with cumulative states from all previous steps
    const cumulativePrevState = componentStatesRef.current.reduce(
      (acc, state) => ({ ...acc, ...state }), {} as ComponentStateSnapshot
    )
    const stateToStore = { ...cumulativePrevState, ...cumulativeStates }
    const newStep: BuilderStep = { frameId: frame.id, componentStates: stateToStore, changedComponents: [nodeId] }
    if (pathModeRef.current === 'flexible') {
      setSteps(prev => prev.length === 0 ? [newStep] : [prev[0], newStep])
    } else {
      setSteps(prev => [...prev, newStep])
    }
  }, [frames, isEditingExistingPath, openRef, trackComponentStatesRef, pathFrameIdsRef, pathModeRef, goalLockDisabledRef, componentStatesRef, modalOpenedAtRef, pendingAutoApplyStatesRef, unlockRequestedRef, lastProcessedStateRef, setSteps, setOverlayHintEligible, setGoalLockDisabled])

  // Fetch component variants and instances when dialog opens
  useEffect(() => {
    if (open && prototypeId) {
      // Fetch component variants
      authFetch(`/api/studies/${prototypeStudyId}/prototype/component-variants`)
        .then((res) => {
          if (!res.ok) {
            // Component variants fetch failed
            return null
          }
          return res.json()
        })
        .then((response: { data: { variants: ComponentVariant[] } } | null) => {
          if (response?.data?.variants) {
            setComponentVariants(response.data.variants)
          }
        })
        .catch(() => {
          // Failed to fetch component variants
        })

      // Fetch component instances (positions)
      authFetch(`/api/studies/${prototypeStudyId}/prototype/component-instances`)
        .then((res) => {
          if (!res.ok) {
            // Component instances fetch failed
            return null
          }
          return res.json()
        })
        .then((response: { data: { instances: ComponentInstance[] } } | null) => {
          if (response?.data?.instances) {
            setComponentInstances(response.data.instances)
          }
        })
        .catch(() => {
          // Failed to fetch component instances
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prototypeId, prototypeStudyId])

  // Handler for the "Enable" tracking button in the prompt dialog
  const handleEnableTracking = useCallback(() => {
    setTrackComponentStates(true)
    setShowTrackingPrompt(false)

    hasSeenFirstStateChangeRef.current = true

    const pendingEvent = pendingComponentEventRef.current
    if (pendingEvent) {
      const { nodeId, currentFrameNodeId, cumulativeStates } = pendingEvent

      const frame = currentFrameNodeId ? findFrameByFigmaNodeId(frames, currentFrameNodeId) : null
      if (frame) {
        setSteps(prev => {
          const resetPrev = prev.map(s => ({ ...s, componentStates: {}, changedComponents: [] as string[] }))
          return [...resetPrev, { frameId: frame.id, componentStates: { ...cumulativeStates }, changedComponents: [nodeId] }]
        })
      }

      pendingComponentEventRef.current = null
    }
  }, [frames, setSteps])

  return {
    // State
    trackComponentStates,
    hasPrototypeInteraction,
    showTrackingPrompt,
    componentVariants,
    componentInstances,

    // Setters
    setTrackComponentStates,
    setHasPrototypeInteraction,
    setShowTrackingPrompt,

    // Refs
    prevComponentStateRef,
    hasSeenFirstStateChangeRef,
    trackingPromptDismissedRef,
    pendingComponentEventRef,

    // Callbacks
    handleComponentStateChange,
    handleEnableTracking,
  }
}
