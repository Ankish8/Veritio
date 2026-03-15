'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@veritio/ui'
import { VIZ_COLORS } from '@veritio/core/colors'
import type { PathwayStep, PrototypeTestFrame } from '@veritio/study-types'
import { isPathwayFrameStep } from '@veritio/study-types'
import { normalizeStepsForDisplay } from '../lib/utils/pathway-migration'

// ─── Overlay Frame Detection ────────────────────────────────────────────────
export function isOverlayFrame(frame: PrototypeTestFrame, previousFrame?: PrototypeTestFrame | null): boolean {
  if (!previousFrame) return false

  // Common overlay keywords used by multiple strategies
  const overlayKeywords = [
    'overlay', 'modal', 'dialog', 'drawer', 'panel', 'popup', 'menu',
    'dropdown', 'popover', 'sheet', 'sidebar', 'detail', 'details',
    'contact', 'profile', 'settings', 'options', 'filter', 'search',
    'notification', 'alert', 'toast', 'tooltip', 'hover', 'expanded',
    'new chat', 'compose', 'create', 'add new',
  ]
  const nameLower = frame.name.toLowerCase()
  const nameIndicatesOverlay = overlayKeywords.some(kw => nameLower.includes(kw))

  // When both frames have dimension data, use precise heuristics
  if (frame.width && frame.height && previousFrame.width && previousFrame.height) {
    const widthRatio = frame.width / previousFrame.width
    const heightRatio = frame.height / previousFrame.height
    const areaRatio = (frame.width * frame.height) / (previousFrame.width * previousFrame.height)

    // Strategy 1: Either dimension is significantly smaller (< 80%)
    const dimensionSmaller = widthRatio < 0.8 || heightRatio < 0.8

    // Strategy 2: Total area is much smaller (< 75% of base frame)
    const areaSmaller = areaRatio < 0.75

    // Strategy 3: Name-based + slight size difference
    if (nameIndicatesOverlay && (widthRatio < 0.95 || heightRatio < 0.95)) return true

    // Strategy 4: Aspect ratio significantly different from base
    const baseAspect = previousFrame.width / previousFrame.height
    const frameAspect = frame.width / frame.height
    const aspectDiff = Math.abs(baseAspect - frameAspect) / Math.max(baseAspect, frameAspect)
    const aspectVeryDifferent = aspectDiff > 0.3

    // Strategy 5: Same base name but very different size
    const sameBaseName = previousFrame.name.toLowerCase() === nameLower
    const veryDifferentSize = widthRatio < 0.5 || heightRatio < 0.5 || areaRatio < 0.5

    if (dimensionSmaller) return true
    if (areaSmaller) return true
    if (aspectVeryDifferent && areaRatio < 0.9) return true
    if (sameBaseName && veryDifferentSize) return true

    return false
  }

  // Fallback: when dimension data is unavailable, use name-based detection only.
  // This ensures overlay compositing works even for frames synced before
  // dimension data was populated.
  if (nameIndicatesOverlay) return true

  return false
}

// ─── Shared Types ───────────────────────────────────────────────────────────
export interface ComponentVariantData {
  component_set_id: string
  component_set_name: string
  variant_id: string
  variant_name: string
  variant_properties: Record<string, string>
  image_url: string
  image_width?: number
  image_height?: number
}
export interface ComponentInstanceData {
  instance_id: string
  frame_node_id: string
  component_id: string
  component_set_id?: string
  relative_x: number
  relative_y: number
  width: number
  height: number
  frame_width?: number
  frame_height?: number
  instance_name?: string
}

// ─── Overlay Computation ────────────────────────────────────────────────────
export function computePathOverlays(
  steps: PathwayStep[],
  frames: PrototypeTestFrame[],
  variants: ComponentVariantData[],
  instances: ComponentInstanceData[],
): Map<number, OverlayData[]> {
  const result = new Map<number, OverlayData[]>()
  if (!steps.length || !instances.length) return result

  // Normalize old-format steps before processing to ensure consistent position indexing
  const normalizedSteps = normalizeStepsForDisplay(steps)

  // Walk through steps: each step (frame or state) is its own position
  // State steps inherit the frame from their preceding frame step
  // Overlays are cumulative within the same frame (state changes persist)
  let currentFrameId: string | null = null
  let positionIndex = -1
  let cumulativeOverlays: OverlayData[] = []

  for (const step of normalizedSteps) {
    if (isPathwayFrameStep(step)) {
      currentFrameId = step.frameId
      positionIndex++
      // Frame change resets cumulative overlays
      cumulativeOverlays = []
    } else if (step.type === 'state' && currentFrameId && positionIndex >= 0) {
      positionIndex++ // Each state step is its own position

      // Find the frame object to get its figma_node_id
      const frame = frames.find(f => f.id === currentFrameId)
      if (!frame) continue

      // Find the variant image (if available)
      const variant = variants.find(v => v.variant_id === step.variantId)

      // Find the component instance position within this frame
      let instance = instances.find(i =>
        i.frame_node_id === frame.figma_node_id && (
          i.instance_id === step.componentNodeId ||
          i.component_id === step.variantId ||
          (variant && i.component_set_id === variant.component_set_id)
        )
      )
      if (!instance && step.componentNodeId) {
        // Fallback: instance IDs are unique across the file
        instance = instances.find(i => i.instance_id === step.componentNodeId)
      }
      if (!instance) continue

      const fallbackLabel = variant?.variant_name || instance.instance_name || variant?.component_set_name || 'Recorded interaction'
      const overlay: OverlayData = {
        variantImageUrl: variant?.image_url,
        variantLabel: fallbackLabel,
        relativeX: instance.relative_x,
        relativeY: instance.relative_y,
        componentWidth: variant?.image_width || instance.width,
        componentHeight: variant?.image_height || instance.height,
      }

      cumulativeOverlays = [...cumulativeOverlays, overlay]
      result.set(positionIndex, [...cumulativeOverlays])
    }
  }

  return result
}

// ─── Component ──────────────────────────────────────────────────────────────
export interface OverlayData {
  variantImageUrl?: string
  variantLabel: string
  relativeX: number
  relativeY: number
  componentWidth: number
  componentHeight: number
}

interface CompositeThumbnailProps {
  baseImageUrl: string
  overlays: OverlayData[]
  frameWidth: number
  frameHeight: number
  showOverlayLabel?: boolean
  className?: string
}
export function CompositeThumbnail({
  baseImageUrl,
  overlays,
  frameWidth,
  frameHeight,
  showOverlayLabel = true,
  className,
}: CompositeThumbnailProps) {
  const [baseLoaded, setBaseLoaded] = useState(false)
  const [failedOverlays, setFailedOverlays] = useState<Record<string, boolean>>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const [imageArea, setImageArea] = useState<{ offsetX: number; offsetY: number; width: number; height: number } | null>(null)

  useEffect(() => {
    setFailedOverlays({})
  }, [overlays])

  // Calculate the actual image content area within the container (accounting for letterboxing)
  useEffect(() => {
    if (!baseLoaded || !containerRef.current) return

    const container = containerRef.current
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    const containerAspect = containerWidth / containerHeight
    const frameAspect = frameWidth / frameHeight

    let imgWidth: number, imgHeight: number, offsetX: number, offsetY: number

    if (frameAspect > containerAspect) {
      // Frame is wider than container - letterbox on top/bottom
      imgWidth = containerWidth
      imgHeight = containerWidth / frameAspect
      offsetX = 0
      offsetY = (containerHeight - imgHeight) / 2
    } else {
      // Frame is taller than container - letterbox on left/right
      imgHeight = containerHeight
      imgWidth = containerHeight * frameAspect
      offsetX = (containerWidth - imgWidth) / 2
      offsetY = 0
    }

    setImageArea({ offsetX, offsetY, width: imgWidth, height: imgHeight })
  }, [baseLoaded, frameWidth, frameHeight])

  // Calculate overlay position within the actual image content area
  const getOverlayStyle = (overlay: OverlayData) => {
    if (!imageArea) return { display: 'none' as const }

    const { relativeX, relativeY, componentWidth, componentHeight } = overlay

    // Handle anchor adjustment for expanded variants
    // When a component expands (e.g., a panel button → expanded panel),
    // we need to determine which edge is anchored:
    // - Right-side components (x > frameWidth/2) typically expand LEFT (right-anchored)
    // - Left-side components expand RIGHT (left-anchored)
    const instanceWidth = relativeX > frameWidth / 2
      ? frameWidth - relativeX
      : componentWidth

    // Adjust position if variant is larger than the instance position implies
    let adjustedX = relativeX
    if (relativeX > frameWidth / 2 && componentWidth > instanceWidth) {
      const rightEdge = relativeX + instanceWidth
      adjustedX = rightEdge - componentWidth
      adjustedX = Math.max(0, adjustedX)
    }

    // Position overlay relative to the image content area, not the container
    const left = imageArea.offsetX + (adjustedX / frameWidth) * imageArea.width
    const top = imageArea.offsetY + (relativeY / frameHeight) * imageArea.height
    const width = (componentWidth / frameWidth) * imageArea.width
    const height = (componentHeight / frameHeight) * imageArea.height

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    }
  }

  const combinedLabel = overlays.map(o => o.variantLabel).join(' + ')

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      {/* Base frame image */}
      <img
        src={baseImageUrl}
        alt="Frame"
        className="w-full h-full object-contain"
        onLoad={() => setBaseLoaded(true)}
        onError={() => setBaseLoaded(true)}
      />

      {/* Render ALL variant overlays positioned absolutely within the actual image bounds */}
      {baseLoaded && imageArea && overlays.map((overlay, idx) => {
        const overlayKey = `${idx}-${overlay.variantLabel}-${overlay.variantImageUrl || 'fallback'}`
        const hasImage = !!overlay.variantImageUrl && !failedOverlays[overlayKey]
        return (
          <div
            key={`overlay-${overlayKey}`}
            className="absolute"
            style={getOverlayStyle(overlay)}
          >
            {hasImage ? (
              <img
                src={overlay.variantImageUrl}
                alt={overlay.variantLabel}
                className="w-full h-full object-contain"
                style={{
                  boxShadow: `0 0 0 2px ${VIZ_COLORS.selectionBorder}, 0 2px 8px ${VIZ_COLORS.selectionShadow}`,
                  borderRadius: '2px',
                }}
                onError={() => {
                  setFailedOverlays((prev) => ({ ...prev, [overlayKey]: true }))
                }}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  boxShadow: `0 0 0 2px ${VIZ_COLORS.selectionBorder}`,
                  borderRadius: '2px',
                  backgroundColor: VIZ_COLORS.selectionBg,
                }}
              />
            )}
          </div>
        )
      })}

      {/* Loading indicator */}
      {!baseLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Label showing what component states changed */}
      {showOverlayLabel && overlays.length > 0 && (
        <div className="absolute bottom-1 left-1 right-1 z-10">
          <div className="bg-white/95 backdrop-blur-sm rounded px-1.5 py-0.5 shadow-sm border border-gray-200">
            <div className="text-[9px] font-medium text-gray-700 truncate">{combinedLabel}</div>
          </div>
        </div>
      )}
    </div>
  )
}
