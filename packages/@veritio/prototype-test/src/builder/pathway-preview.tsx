'use client'

import { useMemo, memo } from 'react'
import { cn } from '@veritio/ui'
import type {
  PathwayStep,
  PathwayFrameStep,
  PathwayStateStep,
  PrototypeTestFrame,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'

// Type guards (inline to avoid import issues)
function isPathwayStateStep(step: PathwayStep): step is PathwayStateStep {
  return step.type === 'state'
}

interface PathwayPreviewProps {
  steps: PathwayStep[]
  frames: PrototypeTestFrame[]
  className?: string
  orientation?: 'horizontal' | 'vertical'
  compact?: boolean
}
export const PathwayPreview = memo(function PathwayPreview({
  steps,
  frames,
  className,
  orientation = 'horizontal',
  compact = false,
}: PathwayPreviewProps) {
  // Calculate layout dimensions based on steps
  const layout = useMemo(() => {
    const nodeWidth = compact ? 48 : 64
    const nodeHeight = compact ? 36 : 48
    const stateNodeSize = compact ? 20 : 28
    const gap = compact ? 24 : 32
    const arrowLength = compact ? 16 : 20

    // Calculate positions for each node
    const nodes = steps.map((step, index) => {
      const isState = isPathwayStateStep(step)
      const x = index * (nodeWidth + gap + arrowLength)
      const y = 0

      return {
        step,
        index,
        isState,
        x,
        y,
        width: isState ? stateNodeSize : nodeWidth,
        height: isState ? stateNodeSize : nodeHeight,
        centerX: x + (isState ? stateNodeSize / 2 : nodeWidth / 2),
        centerY: isState ? stateNodeSize / 2 : nodeHeight / 2,
      }
    })

    const totalWidth = nodes.length > 0
      ? nodes[nodes.length - 1].x + nodes[nodes.length - 1].width
      : 0
    const totalHeight = nodeHeight

    return {
      nodes,
      totalWidth,
      totalHeight,
      nodeWidth,
      nodeHeight,
      stateNodeSize,
      gap,
      arrowLength,
    }
  }, [steps, compact])

  // Get frame info for a frame step
  const getFrameInfo = (step: PathwayFrameStep) => {
    const frame = frames.find(f => f.id === step.frameId)
    return {
      name: frame?.name || 'Unknown',
      thumbnail: frame?.thumbnail_url || null,
    }
  }

  // Get state info for a state step
  const getStateInfo = (step: PathwayStateStep) => {
    return {
      name: step.componentName || 'State',
      label: step.customLabel || step.variantName || step.componentName || 'State',
    }
  }

  if (steps.length === 0) {
    return (
      <div className={cn(
        'flex items-center justify-center text-muted-foreground text-sm py-4',
        className
      )}>
        No steps yet
      </div>
    )
  }

  const { nodes, totalWidth, totalHeight, arrowLength } = layout

  // Add padding for the SVG viewport
  const padding = compact ? 8 : 12
  const svgWidth = totalWidth + padding * 2
  const svgHeight = totalHeight + padding * 2

  return (
    <div className={cn('overflow-x-auto', className)}>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="block"
      >
        <g transform={`translate(${padding}, ${padding})`}>
          {/* Render connections (arrows) between nodes */}
          {nodes.slice(0, -1).map((node, index) => {
            const nextNode = nodes[index + 1]
            const startX = node.x + node.width
            const startY = node.centerY
            const endX = nextNode.x
            const endY = nextNode.centerY

            return (
              <g key={`arrow-${index}`}>
                {/* Connection line */}
                <line
                  x1={startX + 4}
                  y1={startY}
                  x2={endX - 4}
                  y2={endY}
                  stroke="currentColor"
                  strokeWidth={compact ? 1.5 : 2}
                  className="text-muted-foreground/40"
                />
                {/* Arrow head */}
                <polygon
                  points={`${endX - 4},${endY - 4} ${endX - 4},${endY + 4} ${endX},${endY}`}
                  fill="currentColor"
                  className="text-muted-foreground/40"
                />
              </g>
            )
          })}

          {/* Render nodes */}
          {nodes.map((node, index) => {
            if (node.isState) {
              // State node - diamond/circle shape
              const step = node.step as PathwayStateStep
              const info = getStateInfo(step)
              const cx = node.x + node.width / 2
              const cy = node.centerY

              return (
                <g key={`node-${index}`}>
                  {/* Diamond shape for state */}
                  <rect
                    x={node.x}
                    y={cy - node.height / 2}
                    width={node.width}
                    height={node.height}
                    rx={4}
                    className="fill-violet-100 dark:fill-violet-900/50 stroke-violet-400 dark:stroke-violet-600"
                    strokeWidth={1.5}
                  />
                  {/* State icon - simple layered rectangles */}
                  <g>
                    <rect
                      x={cx - 4}
                      y={cy - 2}
                      width={8}
                      height={5}
                      rx={1}
                      className="fill-violet-500 dark:fill-violet-400"
                    />
                    <rect
                      x={cx - 3}
                      y={cy - 4}
                      width={6}
                      height={4}
                      rx={1}
                      className="fill-violet-400 dark:fill-violet-500"
                      opacity={0.7}
                    />
                  </g>
                  {/* Label below (if not compact) */}
                  {!compact && (
                    <text
                      x={cx}
                      y={node.height + 12}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[9px]"
                    >
                      {info.label.length > 10 ? info.label.slice(0, 10) + '…' : info.label}
                    </text>
                  )}
                </g>
              )
            } else {
              // Frame node - rectangle with optional thumbnail
              const step = node.step as PathwayFrameStep
              const info = getFrameInfo(step)
              const isStart = index === 0
              const isGoal = index === nodes.length - 1 && nodes.length > 1

              return (
                <g key={`node-${index}`}>
                  {/* Frame rectangle */}
                  <rect
                    x={node.x}
                    y={0}
                    width={node.width}
                    height={node.height}
                    rx={4}
                    strokeWidth={1.5}
                    className={cn(
                      isStart
                        ? 'fill-emerald-100 dark:fill-emerald-900/50 stroke-emerald-400 dark:stroke-emerald-600'
                        : isGoal
                          ? 'fill-blue-100 dark:fill-blue-900/50 stroke-blue-400 dark:stroke-blue-600'
                          : 'fill-muted stroke-border'
                    )}
                  />
                  {/* Thumbnail or placeholder */}
                  {info.thumbnail ? (
                    <image
                      href={info.thumbnail}
                      x={node.x + 2}
                      y={2}
                      width={node.width - 4}
                      height={node.height - 4}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`inset(0 round 2px)`}
                    />
                  ) : (
                    <text
                      x={node.x + node.width / 2}
                      y={node.height / 2 + 4}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[12px] font-medium"
                    >
                      {index + 1}
                    </text>
                  )}
                  {/* Step number badge */}
                  <circle
                    cx={node.x + 8}
                    cy={8}
                    r={6}
                    fill="currentColor"
                    className="text-foreground"
                  />
                  <text
                    x={node.x + 8}
                    y={11}
                    textAnchor="middle"
                    className="fill-background text-[8px] font-medium"
                  >
                    {index + 1}
                  </text>
                  {/* Start/Goal badge */}
                  {(isStart || isGoal) && !compact && (
                    <text
                      x={node.x + node.width / 2}
                      y={node.height + 10}
                      textAnchor="middle"
                      className={cn(
                        'text-[8px] font-medium',
                        isStart ? 'fill-emerald-600 dark:fill-emerald-400' :
                        'fill-blue-600 dark:fill-blue-400'
                      )}
                    >
                      {isStart ? 'Start' : 'Goal'}
                    </text>
                  )}
                </g>
              )
            }
          })}
        </g>
      </svg>
    </div>
  )
})
interface PathwayPreviewPanelProps {
  steps: PathwayStep[]
  frames: PrototypeTestFrame[]
  isOpen?: boolean
  onToggle?: () => void
}

export const PathwayPreviewPanel = memo(function PathwayPreviewPanel({
  steps,
  frames,
  isOpen = true,
  onToggle,
}: PathwayPreviewPanelProps) {
  return (
    <div className="border-t">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <span>Flow Preview</span>
        <span className="text-[12px]">{isOpen ? '▼' : '▶'}</span>
      </button>

      {/* Preview content */}
      {isOpen && (
        <div className="px-3 pb-3">
          <PathwayPreview
            steps={steps}
            frames={frames}
            compact
            className="bg-muted/30 rounded-md p-2"
          />
          {steps.length >= 2 && (
            <p className="text-[12px] text-muted-foreground mt-1 text-center">
              This is how your path will appear in analysis
            </p>
          )}
        </div>
      )}
    </div>
  )
})
