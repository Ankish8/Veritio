'use client'

import { useCallback, useRef, useEffect } from 'react'
import { zoom, zoomIdentity, ZoomBehavior, D3ZoomEvent } from 'd3-zoom'
import { select } from 'd3-selection'
import { Button } from '@veritio/ui/components/button'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import type { ZoomTransform } from './flow-graph-utils'

interface FlowZoomControlsProps {
  transform: ZoomTransform
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
}

/**
 * Zoom control buttons (zoom in, zoom out, reset) for the flow diagram.
 */
export function FlowZoomControls({ transform, onZoomIn, onZoomOut, onZoomReset }: FlowZoomControlsProps) {
  return (
    <>
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-background/80 backdrop-blur-sm rounded-lg border p-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomIn} title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomOut} title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="h-px bg-border my-0.5" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomReset} title="Reset zoom">
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {transform.k !== 1 && (
        <div className="absolute bottom-3 right-3 z-10 px-2 py-1 bg-background/80 backdrop-blur-sm rounded border text-xs text-muted-foreground">
          {Math.round(transform.k * 100)}%
        </div>
      )}
    </>
  )
}

/**
 * Hook to set up d3-zoom behavior on an SVG element.
 * Returns zoom handlers and the current transform.
 */
export function useFlowZoom(
  svgRef: React.RefObject<SVGSVGElement | null>,
  onTransformChange: (transform: ZoomTransform) => void
) {
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const svg = select(svgRef.current)

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        const { x, y, k } = event.transform
        onTransformChange({ x, y, k })
      })

    svg.call(zoomBehavior)
    zoomBehaviorRef.current = zoomBehavior

    return () => {
      svg.on('.zoom', null)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    const svg = select(svgRef.current)
    zoomBehaviorRef.current.scaleBy(svg.transition().duration(200), 1.3)
  }, [svgRef])

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    const svg = select(svgRef.current)
    zoomBehaviorRef.current.scaleBy(svg.transition().duration(200), 0.7)
  }, [svgRef])

  const handleZoomReset = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    const svg = select(svgRef.current)
    svg.transition().duration(300).call(zoomBehaviorRef.current.transform, zoomIdentity)
  }, [svgRef])

  return { handleZoomIn, handleZoomOut, handleZoomReset }
}
