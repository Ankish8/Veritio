'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Loader2,
  ExternalLink,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Play,
} from 'lucide-react'
import {
  Button,
  SearchableSelect,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Separator,
  cn,
} from '@veritio/ui'
import { generateEmbedUrl } from '../services/figma/embed-url'
import { usePrototypeControls } from '../hooks'
import type { PrototypeTestPrototype, PrototypeTestFrame } from '@veritio/study-types'

// Special value to represent "no selection" (use first frame as default)
const NO_SELECTION = '_first_frame_default'

interface PrototypePreviewProps {
  prototype: PrototypeTestPrototype
  frames?: PrototypeTestFrame[]
  className?: string
  contained?: boolean
  enableControls?: boolean
  onStartingFrameChange?: (frameId: string | null) => void
}

export function PrototypePreview({
  prototype,
  frames = [],
  className = '',
  contained = false,
  enableControls = true,
  onStartingFrameChange,
}: PrototypePreviewProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Track selected frame locally (since Figma events may not always fire)
  const [selectedFrameId, setSelectedFrameId] = useState<string>('')

  // Lazy loading: only load iframe when component becomes visible
  const [shouldLoadIframe, setShouldLoadIframe] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Prototype controls hook
  const {
    iframeRef,
    state: prototypeState,
    restart,
    nextPage,
    previousPage,
    navigateToFrame,
    isEmbedApiEnabled,
  } = usePrototypeControls()

  // Generate embed URL with Embed API enabled for controls
  // Memoized to prevent iframe reload on parent re-renders
  const embedUrl = useMemo(
    () => generateEmbedUrl(prototype.figma_url, { enableEmbedApi: enableControls }),
    [prototype.figma_url, enableControls]
  )

  // Use IntersectionObserver to detect when the container becomes visible
  // This enables lazy loading of the Figma iframe - critical for performance
  // when the tab is kept mounted but hidden (keepMounted: true)
  useEffect(() => {
    if (shouldLoadIframe) return // Already triggered, no need to observe

    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoadIframe(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 } // Trigger when 10% visible
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [shouldLoadIframe])

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    setError(null)
  }, [])

  const handleError = useCallback(() => {
    setError('Failed to load Figma prototype. Make sure the link is public.')
  }, [])

  const openInFigma = () => {
    window.open(prototype.figma_url, '_blank', 'noopener,noreferrer')
  }

  // The effective current frame ID - prefer Figma's reported ID, fallback to our local selection
  const effectiveFrameId = prototypeState.currentNodeId || selectedFrameId

  // Find current frame name from state
  const currentFrame = frames.find(f => f.figma_node_id === effectiveFrameId)

  // Convert frames to options for SearchableSelect (navigation)
  const frameOptions = useMemo(() =>
    frames.map(frame => ({
      value: frame.figma_node_id,
      label: frame.name,
    })),
    [frames]
  )

  // Convert frames to options for default starting frame selector
  const startingFrameOptions = useMemo(() => [
    { value: NO_SELECTION, label: 'First frame (default)' },
    ...frames.map(frame => ({
      value: frame.id,
      label: frame.name,
    })),
  ], [frames])

  // Handle frame selection from dropdown (navigation)
  const handleFrameSelect = useCallback((nodeId: string) => {
    setSelectedFrameId(nodeId)
    navigateToFrame(nodeId)
  }, [navigateToFrame])

  // Handle default starting frame change
  const handleStartingFrameChange = useCallback((value: string) => {
    if (onStartingFrameChange) {
      onStartingFrameChange(value === NO_SELECTION ? null : value)
    }
  }, [onStartingFrameChange])

  // Handle restart - reset local selection
  const handleRestart = useCallback(() => {
    setSelectedFrameId('')
    restart()
  }, [restart])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Contained mode - just the iframe that fills the container (with optional controls)
  if (contained) {
    return (
      <div ref={containerRef} className={cn('relative bg-gray-50', className)}>
        {(!shouldLoadIframe || !isLoaded) && !error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading prototype...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
            <div className="text-center space-y-2">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={openInFigma}>
                Open in Figma
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Only render iframe when tab becomes visible - prevents blocking initial page load */}
        {shouldLoadIframe && (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className={cn(
              'absolute inset-0 w-full h-full border-0',
              isLoaded && !error ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={handleLoad}
            onError={handleError}
            allow="fullscreen"
            loading="eager"
            title="Figma Prototype Preview"
            style={{ overflow: 'hidden' }}
          />
        )}
      </div>
    )
  }

  // Default mode with header and controls
  return (
    <TooltipProvider delayDuration={300}>
      <div ref={containerRef} className={cn('relative flex flex-col', className)}>
        {/* Header with Controls */}
        <div className="flex items-center justify-between p-2 border-b bg-muted/30">
          {/* Left side: Title and frame count */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate">
              {prototype.name || 'Prototype Preview'}
            </span>
            {prototype.frame_count !== undefined && (
              <span className="text-xs text-muted-foreground">
                ({prototype.frame_count} frames)
              </span>
            )}
            {/* Default Starting Frame selector */}
            {onStartingFrameChange && frames.length > 0 && (
              <>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                      <Play className="h-3.5 w-3.5 text-muted-foreground" />
                      <SearchableSelect
                        value={prototype.starting_frame_id || NO_SELECTION}
                        onValueChange={handleStartingFrameChange}
                        options={startingFrameOptions}
                        placeholder="Starting frame..."
                        searchPlaceholder="Search frames..."
                        className="h-7 min-w-[140px] max-w-[180px] text-xs"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Default starting frame for new tasks</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

          {/* Center: Prototype Controls */}
          {enableControls && isEmbedApiEnabled && isLoaded && (
            <div className="flex items-center gap-1">
              {/* Restart Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleRestart}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Restart prototype</p>
                </TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-5 mx-1" />

              {/* Previous Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={previousPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Previous page</p>
                </TooltipContent>
              </Tooltip>

              {/* Frame Selector (if frames available) */}
              {frames.length > 0 && (
                <SearchableSelect
                  value={effectiveFrameId}
                  onValueChange={handleFrameSelect}
                  options={frameOptions}
                  placeholder="Select frame..."
                  searchPlaceholder="Search frames..."
                  className="h-8 min-w-[140px] max-w-[200px] text-xs"
                />
              )}

              {/* Next Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={nextPage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Next page</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Right side: Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Fullscreen */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleFullscreen}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</p>
              </TooltipContent>
            </Tooltip>

            {/* Open in Figma */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={openInFigma}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Open in Figma</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Embed Container */}
        <div className="relative flex-1 min-h-[400px] bg-stone-100">
          {(!shouldLoadIframe || !isLoaded) && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading prototype...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={openInFigma}>
                  Open in Figma
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Only render iframe when tab becomes visible - prevents blocking initial page load */}
          {shouldLoadIframe && (
            <iframe
              ref={iframeRef}
              src={embedUrl}
              className={cn(
                'absolute inset-0 w-full h-full',
                isLoaded && !error ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={handleLoad}
              onError={handleError}
              allow="fullscreen"
              loading="eager"
              title="Figma Prototype Preview"
            />
          )}
        </div>

        {/* Footer: Sync status and current frame indicator */}
        <div className="flex items-center justify-between p-2 border-t bg-muted/20 text-xs text-muted-foreground">
          <div>
            {currentFrame && (
              <span>Current: <span className="font-medium text-foreground">{currentFrame.name}</span></span>
            )}
          </div>
          <div>
            {prototype.last_synced_at && (
              <span>Last synced: {new Date(prototype.last_synced_at).toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
