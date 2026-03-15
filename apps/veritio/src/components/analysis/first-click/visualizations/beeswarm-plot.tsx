'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { loadD3, type D3Module } from '@/lib/d3/load-d3'

interface BeeswarmPlotProps {
  times: Array<{ timeMs: number; wasCorrect: boolean; participantId: string }>
  width?: number
  height?: number
  className?: string
}

export function BeeswarmPlot({ times, width: propWidth, height = 120, className }: BeeswarmPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [d3, setD3] = useState<D3Module | null>(null)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    timeMs: number
    wasCorrect: boolean
    participantId: string
  } | null>(null)

  useEffect(() => {
    loadD3().then(setD3)
  }, [])

  useEffect(() => {
    if (!d3 || !svgRef.current || times.length === 0) return

    const containerWidth = propWidth ?? containerRef.current?.clientWidth ?? 600
    const margin = { top: 10, right: 20, bottom: 28, left: 20 }
    const w = containerWidth - margin.left - margin.right
    const h = height - margin.top - margin.bottom
    const radius = 4

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', containerWidth).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const maxTime = d3.max(times, (d) => d.timeMs) ?? 1000
    const xScale = d3.scaleLinear().domain([0, maxTime]).range([0, w]).nice()

    // Force simulation to jitter dots vertically and avoid overlap
    const nodes = times.map((d) => ({
      ...d,
      x: xScale(d.timeMs),
      y: h / 2,
    }))

    const simulation = d3
      .forceSimulation(nodes)
      .force('x', d3.forceX<(typeof nodes)[0]>((d) => xScale(d.timeMs)).strength(1))
      .force('y', d3.forceY(h / 2).strength(0.1))
      .force('collide', d3.forceCollide(radius + 1))
      .stop()

    simulation.tick(120)

    // Clamp y positions within bounds
    for (const node of nodes) {
      node.y = Math.max(radius, Math.min(h - radius, node.y))
    }

    // Draw dots
    g.selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', radius)
      .attr('fill', (d) => (d.wasCorrect ? '#10b981' : '#ef4444'))
      .attr('fill-opacity', 0.75)
      .attr('stroke', (d) => (d.wasCorrect ? '#059669' : '#dc2626'))
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer')
      .on('mouseenter', (_event, d) => {
        setTooltip({
          x: d.x + margin.left,
          y: d.y + margin.top - 12,
          timeMs: d.timeMs,
          wasCorrect: d.wasCorrect,
          participantId: d.participantId,
        })
      })
      .on('mouseleave', () => setTooltip(null))

    // X-axis
    const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat((d) => `${(d as number) / 1000}s`)
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#78716c')

    g.selectAll('.domain, .tick line').attr('stroke', '#d6d3d1')
  }, [d3, times, propWidth, height])

  if (times.length === 0) return null

  if (!d3) {
    return (
      <div className={cn('flex items-center justify-center h-24 text-sm text-muted-foreground', className)}>
        Loading...
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <svg ref={svgRef} />
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-popover text-popover-foreground border rounded px-2 py-1 text-xs shadow-md -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <span className="font-medium">{(tooltip.timeMs / 1000).toFixed(1)}s</span>
          {' - '}
          <span className={tooltip.wasCorrect ? 'text-emerald-600' : 'text-red-500'}>
            {tooltip.wasCorrect ? 'Success' : 'Failure'}
          </span>
        </div>
      )}
    </div>
  )
}
