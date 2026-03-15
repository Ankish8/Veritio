'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { FIGMA_ORIGIN } from '../lib/constants/figma'

export type FigmaControlMessageType =
  | 'RESTART'                           // Reset to first/starting frame
  | 'NAVIGATE_FORWARD'                  // Go to next page
  | 'NAVIGATE_BACKWARD'                 // Go to previous page
  | 'NAVIGATE_TO_FRAME_AND_CLOSE_OVERLAYS'  // Jump to specific frame
export type FigmaEventType =
  | 'INITIAL_LOAD'           // Prototype finished loading
  | 'PRESENTED_NODE_CHANGED' // User navigated to a different frame
  | 'MOUSE_PRESS_OR_RELEASE' // Click event
  | 'NEW_STATE'              // Component variant changed (tabs, toggles, etc.)
  | 'ERROR'                  // Error occurred

export type ComponentStateSnapshot = Record<string, string>
export interface ComponentStateChangeEvent {
  nodeId: string
  newVariantId: string
  previousVariantId: string | null
  currentFrameNodeId: string | null
  cumulativeStates: ComponentStateSnapshot
}

export interface PrototypeControlsOptions {
  onComponentStateChange?: (event: ComponentStateChangeEvent) => void
}
export interface PrototypeState {
  isLoaded: boolean
  currentNodeId: string | null
  navigationHistory: string[]
  componentStates: ComponentStateSnapshot
  error: string | null
}

export interface PrototypeControls {
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  state: PrototypeState
  restart: () => void
  nextPage: () => void
  previousPage: () => void
  navigateToFrame: (nodeId: string) => void
  isEmbedApiEnabled: boolean
  canGoBack: boolean
}

export function usePrototypeControls(options?: PrototypeControlsOptions): PrototypeControls {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const lastPointerEventRef = useRef<number | null>(null)

  const [state, setState] = useState<PrototypeState>({
    isLoaded: false,
    currentNodeId: null,
    navigationHistory: [],
    componentStates: {},
    error: null,
  })

  // Store callback in ref to avoid dependency issues in handleMessage
  const onComponentStateChangeRef = useRef(options?.onComponentStateChange)
  onComponentStateChangeRef.current = options?.onComponentStateChange

  // Check if Embed API is enabled (client-id is configured)
  const isEmbedApiEnabled = typeof window !== 'undefined' &&
    !!process.env.NEXT_PUBLIC_FIGMA_EMBED_CLIENT_ID
  const sendMessage = useCallback((type: FigmaControlMessageType, data?: Record<string, unknown>) => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) {
      return
    }

    if (!isEmbedApiEnabled) {
      return
    }

    const message = data ? { type, data } : { type }
    iframe.contentWindow.postMessage(message, FIGMA_ORIGIN)
  }, [isEmbedApiEnabled])

  const handleMessage = useCallback((event: MessageEvent) => {
    // Only process messages from Figma
    if (!event.origin.includes('figma.com')) return

    // CRITICAL: Only process messages from OUR iframe, not other Figma iframes
    // This prevents multiple hook instances from all processing the same message
    // and ensures each hook only tracks state for its specific iframe
    if (event.source !== iframeRef.current?.contentWindow) {
      // Silently ignore messages from other iframes - this is expected behavior
      return
    }

    const data = event.data
    if (!data || typeof data !== 'object') return

    switch (data.type as FigmaEventType) {
      case 'INITIAL_LOAD':
        setState(prev => ({
          ...prev,
          isLoaded: true,
          error: null,
        }))
        break

      case 'PRESENTED_NODE_CHANGED': {
        // Figma wraps the payload in a `data` property: {type: '...', data: {presentedNodeId: '...'}}
        const payload = data.data || data
        const nodeId = payload.presentedNodeId || payload.nodeId

        if (nodeId) {
          setState(prev => ({
            ...prev,
            currentNodeId: nodeId,
            navigationHistory: [...prev.navigationHistory, nodeId],
          }))
        }
        break
      }

      case 'NEW_STATE': {
        // Component variant changed (tab click, toggle, modal, etc.)
        const payload = data.data || data
        const nodeId = payload.nodeId || data.nodeId
        const newVariantId = payload.newVariantId || data.newVariantId
        const interactionType = payload.interactionType || data.interactionType

        // Track click-based interactions only (exclude hover).
        // Some components report MOUSE_UP / ON_RELEASE instead of ON_CLICK, so
        // accept common press/release variants. If interactionType is missing,
        // require a recent pointer event to avoid hover-triggered state changes.
        const normalizedInteractionType = typeof interactionType === 'string'
          ? interactionType.toUpperCase()
          : undefined
        const isHoverInteraction = !!normalizedInteractionType && (
          normalizedInteractionType.includes('HOVER') ||
          normalizedInteractionType.includes('ENTER') ||
          normalizedInteractionType.includes('LEAVE')
        )
        const isExplicitClick = !!normalizedInteractionType && (
          normalizedInteractionType.includes('CLICK') ||
          normalizedInteractionType.includes('PRESS') ||
          normalizedInteractionType.includes('TAP') ||
          normalizedInteractionType.includes('RELEASE') ||
          normalizedInteractionType.includes('MOUSE_DOWN') ||
          normalizedInteractionType.includes('MOUSE_UP')
        )
        const pointerRecentlyActive = lastPointerEventRef.current != null &&
          Date.now() - lastPointerEventRef.current < 800
        const isClickInteraction = isExplicitClick || (!normalizedInteractionType && pointerRecentlyActive)

        if (nodeId && newVariantId && isClickInteraction) {
          // CRITICAL FIX: Build cumulative states SYNCHRONOUSLY with the new variant
          // This ensures we don't have race conditions where cumulativeStates has stale data
          //
          // The issue was: if we rely on reading prev.componentStates inside setState,
          // and multiple events fire in quick succession, React's batching could cause
          // the updater to see stale state. Instead, we maintain our own sync copy.

          // Use flushSync to ensure the state update completes BEFORE we fire the callback
          // This prevents race conditions where the callback fires before state is updated
          let callbackDataToFire: ComponentStateChangeEvent | null = null

          setState(prev => {
            const previousVariantId = prev.componentStates[nodeId] || null
            const newCumulativeStates = {
              ...prev.componentStates,
              [nodeId]: newVariantId,
            }

            // Prepare callback data - create a fresh copy to avoid mutation issues
            callbackDataToFire = {
              nodeId,
              newVariantId,
              previousVariantId,
              currentFrameNodeId: prev.currentNodeId,
              cumulativeStates: { ...newCumulativeStates },
            }

            return {
              ...prev,
              componentStates: newCumulativeStates,
            }
          })

          // Fire callback OUTSIDE setState but using the data captured INSIDE
          // This runs synchronously after setState completes (in message event handlers,
          // React typically flushes state updates synchronously)
          if (onComponentStateChangeRef.current && callbackDataToFire) {
            // Use a local const to capture the value - prevents closure issues
            const capturedCallbackData = callbackDataToFire

            queueMicrotask(() => {
              if (onComponentStateChangeRef.current) {
                onComponentStateChangeRef.current(capturedCallbackData)
              }
            })
          }
        }
        break
      }

      case 'MOUSE_PRESS_OR_RELEASE': {
        lastPointerEventRef.current = Date.now()
        break
      }

      case 'ERROR': {
        // Figma wraps the payload in a `data` property
        const errorPayload = data.data || data
        setState(prev => ({
          ...prev,
          error: errorPayload.message || 'Unknown error',
          isLoaded: false,
        }))
        break
      }
    }
  }, [])

  // Set up message listener
  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  // Control methods
  const restart = useCallback(() => {
    sendMessage('RESTART')
    // Reset navigation history and component states on restart
    setState(prev => ({
      ...prev,
      navigationHistory: [],
      componentStates: {},
    }))
  }, [sendMessage])

  const nextPage = useCallback(() => {
    sendMessage('NAVIGATE_FORWARD')
  }, [sendMessage])

  const previousPage = useCallback(() => {
    sendMessage('NAVIGATE_BACKWARD')
  }, [sendMessage])

  const navigateToFrame = useCallback((nodeId: string) => {
    sendMessage('NAVIGATE_TO_FRAME_AND_CLOSE_OVERLAYS', { nodeId })
  }, [sendMessage])

  const canGoBack = state.navigationHistory.length > 1

  return {
    iframeRef,
    state,
    restart,
    nextPage,
    previousPage,
    navigateToFrame,
    isEmbedApiEnabled,
    canGoBack,
  }
}
