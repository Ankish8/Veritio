'use client'

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@veritio/ui/utils'
import { generateEmbedUrl } from '../../services/figma/embed-url'
import type { FigmaEmbedProps } from '../types'
function isEmbedApiConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_FIGMA_EMBED_CLIENT_ID
}

/**
 * Figma prototype embed component.
 *
 * Uses Figma's Embed Kit 2.0 for postMessage communication:
 * - MOUSE_PRESS_OR_RELEASE: Click tracking
 * - PRESENTED_NODE_CHANGED: Navigation tracking
 * - INITIAL_LOAD: Prototype loaded successfully
 *
 * URL formatting includes:
 * - hide-ui=1: Hides Figma navigation/flows chrome
 * - /proto/ URL format: Ensures prototype mode
 * - bg-color: Light gray background
 *
 * @see https://www.figma.com/developers/embed
 */
export function FigmaEmbed({
  prototype,
  currentFrameId,
  taskKey,
  showHotspotHints = false,
  scaleMode = 'fit',
  onLoad,
  onError,
  onNavigate,
  onClick,
  onStateChange,
  onStateSnapshot,
  className,
}: FigmaEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const frameLoadTimeRef = useRef<number>(Date.now())
  const currentNodeRef = useRef<string | null>(null)
  // Track loading stages - wait for both INITIAL_LOAD and first PRESENTED_NODE_CHANGED
  const hasInitialLoadRef = useRef(false)
  const hasFirstFrameRef = useRef(false)
  const hasCalledOnLoadRef = useRef(false)

  // Check if Embed API is properly configured
  const embedApiConfigured = isEmbedApiConfigured()

  // Track previous taskKey to detect task changes
  const prevTaskKeyRef = useRef<string | number | undefined>(undefined)

  // Navigate to starting frame when task changes (without reloading iframe)
  useEffect(() => {
    // Skip initial render and only handle task changes
    if (prevTaskKeyRef.current !== undefined && taskKey !== prevTaskKeyRef.current) {
      // Task changed - navigate to new starting frame using postMessage
      if (iframeRef.current?.contentWindow && currentFrameId) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'NAVIGATE_TO_FRAME_AND_CLOSE_OVERLAYS',
            data: { nodeId: currentFrameId }
          },
          'https://www.figma.com'
        )
      }
    }
    prevTaskKeyRef.current = taskKey
  }, [taskKey, currentFrameId])

  // Store the initial frame ID for the embed URL (only used on first load)
  // Subsequent task navigations are handled via postMessage
  const initialFrameIdRef = useRef<string | null | undefined>(currentFrameId)

  // Build the embed URL using the shared generator
  // enableEmbedApi: true adds client-id which is REQUIRED for postMessage events
  // URL uses initial frame - subsequent navigation handled via postMessage
  const embedUrl = useMemo(() => {
    if (!prototype.figma_url) return null
    return generateEmbedUrl(prototype.figma_url, {
      startNodeId: initialFrameIdRef.current,
      showHotspotHints,
      enableEmbedApi: true,
      scaleMode,
    })
  }, [prototype.figma_url, showHotspotHints, scaleMode])

  // Handle postMessage events from Figma
  // Note: Figma Embed Kit v2 wraps payloads in a nested structure:
  // { type: 'EVENT_TYPE', data: { ...payload } }
  const handleMessage = useCallback((event: MessageEvent) => {
    // Only process messages from Figma
    if (!event.origin.includes('figma.com')) return

    // CRITICAL: Only process messages from OUR iframe, not preloader or other iframes
    // This prevents the preloader from triggering onLoad before the visible iframe is ready
    if (event.source !== iframeRef.current?.contentWindow) return

    const message = event.data
    if (!message || typeof message !== 'object') return

    // Extract the nested payload (Kit v2 structure)
    const payload = message.data || {}

    // Helper to check if prototype is fully ready and call onLoad
    // We ONLY wait for INITIAL_LOAD - this is when Figma considers prototype ready
    const checkAndCallOnLoad = () => {
      if (hasInitialLoadRef.current && !hasCalledOnLoadRef.current) {
        hasCalledOnLoadRef.current = true
        setIsLoading(false)
        onLoad?.()
      }
    }

    // Handle different Figma embed events
    switch (message.type) {
      case 'INITIAL_LOAD':
        hasInitialLoadRef.current = true
        checkAndCallOnLoad()
        break

      case 'PRESENTED_NODE_CHANGED': {
        // Track navigation between frames
        // Kit v2: payload contains { presentedNodeId, nodeId, ... }
        const fromNodeId = currentNodeRef.current
        const toNodeId = payload.presentedNodeId || payload.nodeId || message.presentedNodeId
        const stateMappings = payload.stateMappings || message.stateMappings

        if (stateMappings && typeof stateMappings === 'object') {
          onStateSnapshot?.(stateMappings)
        }

        if (toNodeId && toNodeId !== fromNodeId) {
          currentNodeRef.current = toNodeId
          frameLoadTimeRef.current = Date.now()

          // Mark first frame as received - prototype is now visible
          if (!hasFirstFrameRef.current) {
            hasFirstFrameRef.current = true
            checkAndCallOnLoad()
          }

          onNavigate?.({
            fromNodeId,
            toNodeId,
          })
        }
        break
      }

      case 'NEW_STATE': {
        const stateEvent = {
          nodeId: payload.nodeId,
          fromVariantId: payload.currentVariantId ?? null,
          toVariantId: payload.newVariantId,
          isTimedChange: payload.isTimedChange || false,
          timestamp: Date.now(),
        }
        onStateChange?.(stateEvent)
        break
      }

      case 'MOUSE_PRESS_OR_RELEASE': {
        // Track click events from Figma Embed Kit v2
        // - handled: true = click triggered a hotspot/navigation, false = misclick
        // - interactionType: 'ON_CLICK' when click triggered a transition
        const wasHotspot = payload.handled ?? message.handled ?? false
        const triggeredTransition = (payload.interactionType || message.interactionType) === 'ON_CLICK'

        // Figma provides local coordinates (not always in root frame space):
        // - nearestScrollingFrameMousePosition: local to nearest scrolling frame
        // - targetNodeMousePosition: local to clicked node
        //
        // We emit nearest-scrolling-frame coordinates as primary plus node IDs
        // so the player can rebase nested-frame clicks to root frame coordinates.
        const scrollFramePos = payload.nearestScrollingFrameMousePosition || message.nearestScrollingFrameMousePosition
        const targetNodePos = payload.targetNodeMousePosition || message.targetNodeMousePosition || {}
        const nearestScrollingFrameId = payload.nearestScrollingFrameId || message.nearestScrollingFrameId
        const targetNodeId = payload.targetNodeId || message.targetNodeId

        // Use nearest scrolling-frame position, fall back to element-relative if unavailable
        const x = Math.round(scrollFramePos?.x ?? targetNodePos.x ?? 0)
        const y = Math.round(scrollFramePos?.y ?? targetNodePos.y ?? 0)

        onClick?.({
          x,
          y,
          wasHotspot,
          triggeredTransition,
          targetNodeId,
          nearestScrollingFrameId,
          targetNodeX: typeof targetNodePos?.x === 'number' ? Math.round(targetNodePos.x) : undefined,
          targetNodeY: typeof targetNodePos?.y === 'number' ? Math.round(targetNodePos.y) : undefined,
        })
        break
      }

      case 'ERROR': {
        const errorMessage = payload.message || message.message || 'Failed to load prototype'
        setLoadError(errorMessage)
        setIsLoading(false)
        onError?.(errorMessage)
        break
      }
    }
  }, [onLoad, onError, onNavigate, onClick, onStateChange, onStateSnapshot])

  // Set up message listener for Figma postMessage events
  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  // Handle iframe load event (fallback for cases where postMessage events don't fire)
  const handleIframeLoad = useCallback(() => {
    // Fallback timeout in case INITIAL_LOAD postMessage never arrives.
    // The iframe's onLoad fires when the outer Figma HTML loads, but
    // INITIAL_LOAD fires later after the prototype WebSocket connects.
    // If INITIAL_LOAD doesn't fire (e.g., Embed API issue), this fallback
    // ensures the prototype becomes visible after a short delay.
    setTimeout(() => {
      if (!hasCalledOnLoadRef.current) {
        // Force loading complete after timeout
        hasInitialLoadRef.current = true
        hasFirstFrameRef.current = true
        hasCalledOnLoadRef.current = true
        setIsLoading(false)
        onLoad?.()
      }
    }, 3000) // 3 seconds - enough for Figma to initialize after iframe HTML loads
  }, [onLoad])

  // Handle iframe error
  const handleIframeError = useCallback(() => {
    setLoadError('Failed to load prototype')
    setIsLoading(false)
    onError?.('Failed to load prototype iframe')
  }, [onError])

  if (!embedUrl) {
    return (
      <div
        className={cn('flex-1 flex items-center justify-center', className)}
        style={{ backgroundColor: 'var(--style-page-bg)' }}
      >
        <p style={{ color: 'var(--style-text-secondary)' }}>No prototype URL configured</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div
        className={cn('flex-1 flex items-center justify-center', className)}
        style={{ backgroundColor: 'var(--style-page-bg)' }}
      >
        <div className="text-center px-6">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--destructive)' }} />
          <p className="font-medium mb-2" style={{ color: 'var(--destructive)' }}>Failed to load prototype</p>
          <p className="text-sm" style={{ color: 'var(--style-text-secondary)' }}>{loadError}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn('flex-1 relative overflow-hidden', className)}
      style={{ backgroundColor: 'var(--style-page-bg)' }}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10"
          style={{ backgroundColor: 'var(--style-card-bg)', opacity: 0.9 }}
        >
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" style={{ color: 'var(--brand)' }} />
            <p className="text-sm" style={{ color: 'var(--style-text-secondary)' }}>Loading prototype...</p>
          </div>
        </div>
      )}

      {/* Figma embed iframe - stable key, navigation handled via postMessage */}
      {/* No loading="lazy" - we want immediate load for background preloading */}
      <iframe
        key="figma-embed"
        ref={iframeRef}
        src={embedUrl}
        className="absolute inset-0 w-full h-full border-0"
        allowFullScreen
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        allow="clipboard-write"
        title="Figma Prototype"
      />
    </div>
  )
}
