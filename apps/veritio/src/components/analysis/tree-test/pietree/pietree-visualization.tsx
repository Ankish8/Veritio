'use client'

import { useEffect, useRef, useMemo, useCallback, useState } from 'react'
import * as d3 from 'd3'
import type { TreeNode } from '@veritio/study-types'
import type { TreeTestResponse } from '@/lib/algorithms/tree-test-analysis'
import type { PietreeLayout } from './pietree-controls'
import { ZoomControls } from './zoom-controls'
import { PietreeTooltip } from './pietree-tooltip'
import { buildPietreeData, getCorrectPathSet } from './pietree-utils'
import { drawHorizontalTree, drawRadialTree, INITIAL_TOOLTIP, type TooltipState } from './pietree-renderers'
import { Loader2 } from 'lucide-react'

interface PietreeVisualizationProps {
  nodes: TreeNode[]
  responses: TreeTestResponse[]
  correctNodeIds: string[]
  layout?: PietreeLayout
  width?: number
  height?: number
  /** Minimum height per node for vertical spacing (default: 55px) */
  nodeSpacing?: number
  className?: string
}

/** D3.js Pietree visualization - shows navigation flow with 5-category pie charts */
export function PietreeVisualization({
  nodes,
  responses,
  correctNodeIds,
  layout = 'horizontal',
  width = 900,
  height = 600,
  nodeSpacing = 55,
  className,
}: PietreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)

  const [zoomLevel, setZoomLevel] = useState(1)
  const [isRendering, setIsRendering] = useState(true)
  const [tooltip, setTooltip] = useState<TooltipState>(INITIAL_TOOLTIP)

  const pietreeData = useMemo(
    () => buildPietreeData(nodes, responses, correctNodeIds),
    [nodes, responses, correctNodeIds]
  )

  const correctPathSet = useMemo(
    () => getCorrectPathSet(nodes, correctNodeIds),
    [nodes, correctNodeIds]
  )

  const handleZoomChange = useCallback((newZoom: number) => {
    if (!svgRef.current || !zoomRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(200).call(zoomRef.current.scaleTo, newZoom)
    setZoomLevel(newZoom)
  }, [])

  const renderKeyRef = useRef(0)

  useEffect(() => {
    if (!svgRef.current || !pietreeData) return

    const currentRenderKey = ++renderKeyRef.current
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsRendering(true)

    const renderVisualization = () => {
      if (renderKeyRef.current !== currentRenderKey) return
      if (!svgRef.current) return

      const svg = d3.select(svgRef.current)
      svg.selectAll('*').remove()

      const containerWidth = containerRef.current?.clientWidth || width
      const containerHeight = height
      const margin = { top: 40, right: 160, bottom: 40, left: 80 }

      svg
        .attr('width', containerWidth)
        .attr('height', containerHeight)
        .style('cursor', 'grab')

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)

      gRef.current = g

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform)
          setZoomLevel(event.transform.k)
        })

      svg.call(zoom)
      zoomRef.current = zoom

      const initialTransform = d3.zoomIdentity.translate(margin.left, margin.top)
      svg.call(zoom.transform, initialTransform)

      const root = d3.hierarchy(pietreeData)
      const innerWidth = containerWidth - margin.left - margin.right
      const innerHeight = containerHeight - margin.top - margin.bottom

      if (layout === 'horizontal') {
        drawHorizontalTree(g, root, innerWidth, innerHeight, correctPathSet, correctNodeIds, setTooltip, nodeSpacing)
      } else {
        drawRadialTree(g, root, innerWidth, innerHeight, correctPathSet, correctNodeIds, setTooltip)
      }

      setIsRendering(false)
    }

    let cleanup: (() => void) | undefined
    if (typeof requestIdleCallback !== 'undefined') {
      const idleId = requestIdleCallback(renderVisualization, { timeout: 500 })
      cleanup = () => cancelIdleCallback(idleId)
    } else {
      const timeoutId = setTimeout(renderVisualization, 1)
      cleanup = () => clearTimeout(timeoutId)
    }

    return cleanup
  }, [pietreeData, layout, width, height, nodes, correctNodeIds, correctPathSet, nodeSpacing])

  if (!pietreeData || nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 text-muted-foreground ${className || ''}`}>
        No tree data available
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className || ''}`} data-pdf-chart="pietree">
      <svg ref={svgRef} className="w-full" />

      {isRendering && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Rendering visualization...</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4">
        <ZoomControls
          zoom={zoomLevel}
          minZoom={0.1}
          maxZoom={4}
          onZoomChange={handleZoomChange}
        />
      </div>

      <PietreeTooltip
        data={tooltip.data}
        position={tooltip.position}
        visible={tooltip.visible}
      />
    </div>
  )
}
