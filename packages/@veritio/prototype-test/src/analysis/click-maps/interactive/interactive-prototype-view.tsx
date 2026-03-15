'use client'

import { memo, useRef, useEffect, useState, useCallback } from 'react'
import { cn } from '@veritio/ui'
import { Button } from '@veritio/ui/components/button'
import { History, Route } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import { FigmaEmbed } from '../../../player/components/figma-embed'
import { HeatmapOverlay } from './heatmap-overlay'
import { ClickTrailRenderer } from './click-trail-renderer'
import { StateIndicator } from './state-indicator'
import { StateHistoryPanel } from './state-history-panel'
import {
  useInteractiveHeatmapState,
  type ClickWithState,
} from './hooks/use-interactive-heatmap-state'
import type { PrototypeTestPrototype, PrototypeTestFrame } from '@veritio/core/database/types'
import type { ComponentStateEvent, ComponentStateSnapshot } from '../../../lib/supabase/study-flow-types'
import type { FigmaNavigationEvent } from '../../../player/types'

interface InteractivePrototypeViewProps {
  prototype: PrototypeTestPrototype
  frames: PrototypeTestFrame[]
  clicks: ClickWithState[]
  startingFrameId?: string | null
  showTrails?: boolean
  onTrailsChange?: (show: boolean) => void
  className?: string
}
export const InteractivePrototypeView = memo(function InteractivePrototypeView({
  prototype,
  frames,
  clicks,
  startingFrameId,
  showTrails = false,
  onTrailsChange,
  className,
}: InteractivePrototypeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [isLoaded, setIsLoaded] = useState(false)
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false)

  // Interactive heatmap state hook
  const {
    currentFrameId,
    currentStates,
    matchingMode,
    filteredClicks,
    clickCount,
    recordedStates,
    setCurrentFrameId,
    updateComponentState,
    setStateSnapshot,
    toggleMatchingMode,
    jumpToState,
  } = useInteractiveHeatmapState({ clicks })

  // Get current frame data for display
  const currentFrame = frames.find((f) => f.node_id === currentFrameId)
  const currentFrameName = currentFrame?.name || null
  const currentFrameThumbnail = currentFrame?.thumbnail_url || null

  // Active state key for history panel highlighting
  const activeStateKey = currentStates && Object.keys(currentStates).length > 0
    ? Object.keys(currentStates)
        .sort()
        .map((k) => `${k}:${currentStates[k]}`)
        .join('|')
    : 'no-state'

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }

    // Initial size
    updateSize()

    // Observe resize
    const observer = new ResizeObserver(updateSize)
    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [])

  // Handle Figma navigation events
  const handleNavigate = useCallback(
    (event: FigmaNavigationEvent) => {
      setCurrentFrameId(event.toNodeId)
    },
    [setCurrentFrameId]
  )

  // Handle Figma state change events
  const handleStateChange = useCallback(
    (event: ComponentStateEvent) => {
      updateComponentState(event.nodeId, event.toVariantId)
    },
    [updateComponentState]
  )

  // Handle Figma state snapshot (from stateMappings)
  const handleStateSnapshot = useCallback(
    (snapshot: ComponentStateSnapshot) => {
      setStateSnapshot(snapshot)
    },
    [setStateSnapshot]
  )

  // Handle prototype load
  const handleLoad = useCallback(() => {
    setIsLoaded(true)
  }, [])

  // Handle state selection from history panel
  const handleStateSelect = useCallback(
    (stateKey: string) => {
      jumpToState(stateKey)
      setHistoryPanelOpen(false)
    },
    [jumpToState]
  )

  // Convert filtered clicks to heatmap format
  const heatmapClicks = filteredClicks.map((click) => ({
    id: click.id,
    normalizedX: click.normalizedX,
    normalizedY: click.normalizedY,
    wasHotspot: click.wasHotspot,
  }))

  // Convert filtered clicks to trail format
  const trailClicks = filteredClicks.map((click) => ({
    id: click.id,
    normalizedX: click.normalizedX,
    normalizedY: click.normalizedY,
    timestamp: click.timestamp,
    participantId: click.participantId,
    wasHotspot: click.wasHotspot,
  }))

  return (
    <div className={cn('relative flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showTrails ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-2"
              onClick={() => onTrailsChange?.(!showTrails)}
            >
              <Route className="w-4 h-4" />
              <span className="text-xs">Click Trails</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {showTrails
                ? 'Hide click trails connecting sequential clicks'
                : 'Show click trails connecting sequential clicks'}
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-2"
              onClick={() => setHistoryPanelOpen(true)}
            >
              <History className="w-4 h-4" />
              <span className="text-xs">State History</span>
              {recordedStates.length > 0 && (
                <span className="ml-1 text-[12px] bg-muted-foreground/20 px-1.5 py-0.5 rounded-full">
                  {recordedStates.length}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">View all recorded component states for this frame</p>
          </TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        <div className="text-xs text-muted-foreground">
          Navigate the prototype to see clicks for each screen and state
        </div>
      </div>

      {/* Main content */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden bg-muted/20">
        {/* Figma Prototype Embed */}
        <FigmaEmbed
          prototype={prototype}
          currentFrameId={startingFrameId}
          onLoad={handleLoad}
          onNavigate={handleNavigate}
          onStateChange={handleStateChange}
          onStateSnapshot={handleStateSnapshot}
          className="absolute inset-0"
        />

        {/* Heatmap Overlay (pointer-events: none) */}
        {isLoaded && containerSize.width > 0 && (
          <HeatmapOverlay
            clicks={heatmapClicks}
            width={containerSize.width}
            height={containerSize.height}
            opacity={0.5}
            showDots={false}
          />
        )}

        {/* Click Trail Renderer (per Q25) */}
        {isLoaded && containerSize.width > 0 && (
          <ClickTrailRenderer
            clicks={trailClicks}
            width={containerSize.width}
            height={containerSize.height}
            visible={showTrails}
          />
        )}

        {/* State Indicator Badge (top-left per Q6) */}
        {isLoaded && (
          <StateIndicator
            frameName={currentFrameName}
            currentStates={currentStates}
            clickCount={clickCount}
            matchingMode={matchingMode}
            onToggleMatchingMode={toggleMatchingMode}
          />
        )}
      </div>

      {/* State History Panel (per Q7) */}
      <StateHistoryPanel
        open={historyPanelOpen}
        onOpenChange={setHistoryPanelOpen}
        recordedStates={recordedStates}
        activeStateKey={activeStateKey}
        frameThumbnailUrl={currentFrameThumbnail}
        frameName={currentFrameName}
        onStateSelect={handleStateSelect}
      />
    </div>
  )
})

export default InteractivePrototypeView
