'use client'

import { useRef, useEffect, useState, useCallback, memo, useMemo } from 'react'
import { sankeyLinkHorizontal } from 'd3-sankey'
import { cn } from '@veritio/ui'
import { FLOW_NODE_FILLS } from '@veritio/core/colors'
import { FlowNodeTooltip, FlowLinkTooltip } from './flow-tooltip'
import { isNodeOnPath, isLinkOnPath } from './build-flow-data'
import { TooltipPopover } from './flow-tooltip-popover'
import { FlowZoomControls, useFlowZoom } from './flow-zoom-controls'
import { computeSankeyLayout } from './flow-graph-utils'
import type { SankeyLinkExtended, ZoomTransform } from './flow-graph-utils'
import type {
  FlowDiagramData,
  FlowDiagramConfig,
  FlowNode,
  FlowLink,
  OptimalPath,
  OptimalPathType,
} from './types'
import { DEFAULT_FLOW_CONFIG } from './types'

interface FlowVisualizationProps {
  data: FlowDiagramData
  highlightPath: OptimalPathType | null
  showBacktracks: boolean
  config?: Partial<FlowDiagramConfig>
  className?: string
  onNodeClick?: (node: FlowNode) => void
  onLinkClick?: (link: FlowLink) => void
}

export const FlowVisualization = memo(function FlowVisualization({
  data,
  highlightPath,
  showBacktracks,
  config: configOverrides,
  className,
  onNodeClick,
  onLinkClick,
}: FlowVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [hoveredNode, setHoveredNode] = useState<FlowNode | null>(null)
  const [hoveredLink, setHoveredLink] = useState<FlowLink | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 })
  const [transform, setTransform] = useState<ZoomTransform>({ x: 0, y: 0, k: 1 })

  const config = useMemo(
    () => ({ ...DEFAULT_FLOW_CONFIG, ...configOverrides }),
    [configOverrides]
  )

  const activePath: OptimalPath | null = highlightPath
    ? data.optimalPaths[highlightPath]
    : null

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDimensions({ width: Math.max(width, 400), height: Math.max(height, 300) })
      }
    })
    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Setup d3-zoom
  const { handleZoomIn, handleZoomOut, handleZoomReset } = useFlowZoom(svgRef, setTransform)

  // Compute Sankey layout
  const { sankeyNodes, sankeyLinks, backtrackLinks, svgWidth, svgHeight } = useMemo(
    () => computeSankeyLayout(data.nodes, data.links, dimensions, config),
    [data, dimensions, config]
  )

  // Node position map for backtrack arrow rendering
  const sankeyNodeMap = useMemo(
    () => new Map(sankeyNodes.map((n) => [n.id, n])),
    [sankeyNodes]
  )

  // Node map for tooltips
  const nodeMap = useMemo(
    () => new Map(data.nodes.map((n) => [n.id, n])),
    [data.nodes]
  )

  const getLinkColor = useCallback(
    (link: FlowLink, isHighlighted: boolean) => {
      if (isHighlighted && highlightPath) return config.pathColors[highlightPath]
      if (link.isBacktrack) return FLOW_NODE_FILLS.backtrack
      return config.outcomeColors[link.dominantOutcome] || config.outcomeColors.mixed
    },
    [config, highlightPath]
  )

  const getNodeBorderColor = useCallback(
    (node: FlowNode) => config.roleColors[node.role] || config.roleColors.regular,
    [config]
  )

  const handleNodeMouseEnter = useCallback(
    (event: React.MouseEvent, node: FlowNode) => {
      setHoveredNode(node)
      setPopoverPosition({ x: event.clientX, y: event.clientY })
      setPopoverOpen(true)
    },
    []
  )

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNode(null)
    setPopoverOpen(false)
  }, [])

  const handleLinkMouseEnter = useCallback(
    (event: React.MouseEvent, link: SankeyLinkExtended) => {
      const originalLink = data.links.find(
        (l) => l.source === (link.source as any).id && l.target === (link.target as any).id
      )
      if (originalLink) {
        setHoveredLink(originalLink)
        setPopoverPosition({ x: event.clientX, y: event.clientY })
        setPopoverOpen(true)
      }
    },
    [data.links]
  )

  const handleLinkMouseLeave = useCallback(() => {
    setHoveredLink(null)
    setPopoverOpen(false)
  }, [])

  // Empty state
  if (data.nodes.length === 0) {
    return (
      <div
        ref={containerRef}
        className={cn('flex items-center justify-center text-muted-foreground min-h-[400px]', className)}
      >
        <div className="text-center">
          <p className="text-lg font-medium">No navigation data</p>
          <p className="text-sm mt-1">Participants haven&apos;t completed this task yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('relative w-full h-full min-h-[400px]', className)}>
      <FlowZoomControls
        transform={transform}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
      />

      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="block cursor-grab active:cursor-grabbing"
      >
        <defs>
          {sankeyLinks.map((link, i) => {
            const sourceNode = link.source
            const targetNode = link.target
            const originalLink = data.links.find(
              (l) => l.source === (sourceNode as any).id && l.target === (targetNode as any).id
            )
            const isHighlighted = originalLink && isLinkOnPath(
              (sourceNode as any).id, (targetNode as any).id, activePath, nodeMap
            )
            const color = originalLink
              ? getLinkColor(originalLink, isHighlighted || false)
              : config.outcomeColors.mixed

            return (
              <linearGradient
                key={`link-gradient-${i}`}
                id={`link-gradient-${i}`}
                gradientUnits="userSpaceOnUse"
                x1={String(sourceNode.x1)}
                y1="0"
                x2={String(targetNode.x0)}
                y2="0"
              >
                <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                <stop offset="100%" stopColor={color} stopOpacity={0.6} />
              </linearGradient>
            )
          })}
        </defs>

        <g
          ref={gRef}
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
        >
          {/* Links */}
          <g className="links">
            {sankeyLinks.map((link, i) => {
              const sourceNode = link.source
              const targetNode = link.target
              const originalLink = data.links.find(
                (l) => l.source === (sourceNode as any).id && l.target === (targetNode as any).id
              )
              const isHighlighted = originalLink && isLinkOnPath(
                (sourceNode as any).id, (targetNode as any).id, activePath
              )
              const isBacktrack = originalLink?.isBacktrack || false
              const path = sankeyLinkHorizontal()
              const d = path(link as any)

              return (
                <g key={`link-${i}`}>
                  <path
                    d={d || ''}
                    fill="none"
                    stroke={`url(#link-gradient-${i})`}
                    strokeWidth={Math.max(link.width || 1, 2)}
                    strokeOpacity={
                      hoveredLink === originalLink
                        ? config.linkOpacityHover
                        : isHighlighted
                          ? 0.8
                          : activePath
                            ? 0.08
                            : config.linkOpacity
                    }
                    className="cursor-pointer transition-opacity duration-150"
                    style={{ strokeDasharray: isBacktrack ? '8,4' : undefined }}
                    onMouseEnter={(e) => handleLinkMouseEnter(e, link)}
                    onMouseLeave={handleLinkMouseLeave}
                    onClick={() => originalLink && onLinkClick?.(originalLink)}
                  />
                  {isBacktrack && (
                    <text
                      x={(sourceNode.x1 + targetNode.x0) / 2}
                      y={(link.y0 + link.y1) / 2 - 8}
                      textAnchor="middle"
                      className="fill-amber-500 text-xs pointer-events-none"
                    >
                      ↩
                    </text>
                  )}
                </g>
              )
            })}
          </g>

          {/* Backtrack Arrows */}
          {showBacktracks && backtrackLinks.length > 0 && (
            <g className="backtracks">
              {backtrackLinks.map((link, i) => {
                const sourceNode = sankeyNodeMap.get(link.source)
                const targetNode = sankeyNodeMap.get(link.target)
                if (!sourceNode || !targetNode) return null

                const x1 = sourceNode.x1
                const y1 = (sourceNode.y0 + sourceNode.y1) / 2
                const x2 = targetNode.x0
                const y2 = (targetNode.y0 + targetNode.y1) / 2
                const dx = Math.abs(x2 - x1)
                const curveOffset = Math.max(dx * 0.3, 40)
                const maxY = Math.max(sourceNode.y1, targetNode.y1)
                const cpY = maxY + curveOffset
                const d = `M ${x1} ${y1} C ${x1} ${cpY}, ${x2} ${cpY}, ${x2} ${y2}`
                const strokeWidth = Math.max(Math.min(link.value * 2, 12), 3)

                return (
                  <g key={`backtrack-${i}`} opacity={activePath ? 0.15 : 1}>
                    <path
                      d={d}
                      fill="none"
                      stroke={FLOW_NODE_FILLS.backtrack}
                      strokeWidth={strokeWidth}
                      strokeOpacity={0.45}
                      strokeDasharray="8,4"
                      className="pointer-events-auto cursor-pointer"
                      onMouseEnter={(e) => {
                        setHoveredLink(link)
                        setPopoverPosition({ x: e.clientX, y: e.clientY })
                        setPopoverOpen(true)
                      }}
                      onMouseLeave={handleLinkMouseLeave}
                    />
                    <polygon
                      points={`${x2},${y2} ${x2 - 7},${y2 - 4} ${x2 - 7},${y2 + 4}`}
                      fill={FLOW_NODE_FILLS.backtrack}
                      opacity={0.65}
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={cpY + 4}
                      textAnchor="middle"
                      className="fill-amber-500 text-[12px] pointer-events-none font-medium"
                    >
                      ↩ {link.value > 1 ? `×${link.value}` : ''}
                    </text>
                  </g>
                )
              })}
            </g>
          )}

          {/* Nodes */}
          <g className="nodes">
            {sankeyNodes.map((node) => {
              const originalNode = data.nodes.find((n) => n.id === node.id)
              if (!originalNode) return null

              const isHighlighted = isNodeOnPath(node.id, activePath, nodeMap)
              const isDeadEnd = data.deadEndNodeIds.has(node.id)
              const isState = originalNode.type === 'state'
              const borderColor = getNodeBorderColor(originalNode)
              const isDimmed = activePath && !isHighlighted
              const nodeWidth = node.x1 - node.x0
              const nodeHeight = node.y1 - node.y0

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x0}, ${node.y0})`}
                  className="cursor-pointer"
                  opacity={isDimmed ? 0.25 : 1}
                  onMouseEnter={(e) => handleNodeMouseEnter(e, originalNode)}
                  onMouseLeave={handleNodeMouseLeave}
                  onClick={() => onNodeClick?.(originalNode)}
                >
                  <rect
                    width={nodeWidth}
                    height={nodeHeight}
                    rx={isState ? 6 : 4}
                    fill={
                      isState
                        ? FLOW_NODE_FILLS.componentState
                        : originalNode.role === 'start'
                          ? FLOW_NODE_FILLS.start
                          : originalNode.role === 'success'
                            ? FLOW_NODE_FILLS.success
                            : isDeadEnd
                              ? FLOW_NODE_FILLS.deadEnd
                              : FLOW_NODE_FILLS.regular
                    }
                    stroke={isHighlighted ? config.pathColors[highlightPath!] : borderColor}
                    strokeWidth={isHighlighted ? 3 : 1.5}
                    strokeDasharray={isState ? '4,2' : undefined}
                    className={cn(
                      'transition-all duration-150',
                      hoveredNode === originalNode && 'filter drop-shadow-md'
                    )}
                  />
                  <text
                    x={nodeWidth + 8}
                    y={nodeHeight / 2 + 4}
                    textAnchor="start"
                    className={cn(
                      'text-[11px] font-medium pointer-events-none',
                      isState ? 'fill-violet-700' : 'fill-foreground'
                    )}
                  >
                    {originalNode.name.length > 28
                      ? originalNode.name.slice(0, 25) + '...'
                      : originalNode.name}
                  </text>
                  {originalNode.role === 'start' && (
                    <circle cx={-8} cy={nodeHeight / 2} r={4} className="fill-blue-500" />
                  )}
                  {isDeadEnd && originalNode.role !== 'success' && (
                    <g transform={`translate(${nodeWidth - 8}, -8)`}>
                      <circle r={8} className="fill-red-500" />
                      <text
                        textAnchor="middle"
                        y={4}
                        className="fill-white text-[12px] font-bold pointer-events-none"
                      >
                        ✕
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </g>
        </g>
      </svg>

      {/* Tooltip */}
      {popoverOpen && (hoveredNode || hoveredLink) && (
        <TooltipPopover position={popoverPosition}>
          {hoveredNode && <FlowNodeTooltip node={hoveredNode} />}
          {hoveredLink && (
            <FlowLinkTooltip
              link={hoveredLink}
              sourceNode={nodeMap.get(hoveredLink.source) || null}
              targetNode={nodeMap.get(hoveredLink.target) || null}
            />
          )}
        </TooltipPopover>
      )}
    </div>
  )
})

export default FlowVisualization
