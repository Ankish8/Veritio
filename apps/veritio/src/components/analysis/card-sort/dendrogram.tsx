'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Loader2, HelpCircle } from 'lucide-react'
import type { DendrogramNode, LinkageMethod } from '@/lib/algorithms/hierarchical-clustering'
import { cutDendrogram } from '@/lib/algorithms/hierarchical-clustering'

// Dynamic import for d3 to reduce initial bundle size (~200KB)
type D3Module = typeof import('d3')
let d3Promise: Promise<D3Module> | null = null

function loadD3(): Promise<D3Module> {
  if (!d3Promise) {
    d3Promise = import('d3')
  }
  return d3Promise
}

interface DendrogramVisualizationProps {
  data: DendrogramNode
  suggestedClusters?: number
  /** Clustering method used: 'average' (UPGMA/AAM) or 'ward' (BMM) */
  method?: LinkageMethod
}

export function DendrogramVisualization({ data, suggestedClusters = 3, method }: DendrogramVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [cutHeight, setCutHeight] = useState<number>(50)
  const [clusters, setClusters] = useState<string[][]>([])
  const [d3Module, setD3Module] = useState<D3Module | null>(null)

  useEffect(() => {
    loadD3().then(setD3Module)
  }, [])

  // Calculate clusters when cut height changes
  useEffect(() => {
    const newClusters = cutDendrogram(data, cutHeight)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClusters(newClusters)
  }, [data, cutHeight])

  // Draw dendrogram
  useEffect(() => {
    if (!svgRef.current || !data.cards || data.cards.length === 0 || !d3Module) return

    const svg = d3Module.select(svgRef.current)
    svg.selectAll('*').remove()

    const containerWidth = containerRef.current?.clientWidth || 800
    const margin = { top: 20, right: 120, bottom: 20, left: 20 }
    const width = containerWidth - margin.left - margin.right
    const height = Math.max(400, data.cards.length * 24)

    svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Create cluster layout
    const root = d3Module.hierarchy(data)
    const cluster = d3Module.cluster<DendrogramNode>().size([height, width - 100])
    cluster(root)

    // Get max height for scaling
    const maxHeight = d3Module.max(root.descendants(), (d) => d.data.height) || 100

    // Scale x based on height values
    const xScale = d3Module.scaleLinear().domain([0, maxHeight]).range([0, width - 100])

    // Assign x positions based on height
    root.each((d) => {
      d.y = xScale(d.data.height)
    })

    // Draw links (elbow style)
    g.selectAll('.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#a8a29e')
      .attr('stroke-width', 1.5)
      .attr('d', (d) => {
        return `M${d.source.y},${d.source.x}
                H${d.target.y}
                V${d.target.x}`
      })

    // Draw cut line
    const cutX = xScale(cutHeight)
    g.append('line')
      .attr('class', 'cut-line')
      .attr('x1', cutX)
      .attr('y1', 0)
      .attr('x2', cutX)
      .attr('y2', height)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')

    // Assign colors to clusters
    const colorScale = d3Module.scaleOrdinal(d3Module.schemeTableau10)
    const nodeColors = new Map<string, string>()

    clusters.forEach((cluster, idx) => {
      const color = colorScale(idx.toString())
      cluster.forEach((card) => {
        nodeColors.set(card, color)
      })
    })

    // Draw nodes
    const nodes = g
      .selectAll('.node')
      .data(root.descendants().filter((d) => !d.children))
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.y},${d.x})`)

    nodes
      .append('circle')
      .attr('r', 4)
      .attr('fill', (d) => nodeColors.get(d.data.label || '') || '#78716c')

    nodes
      .append('text')
      .attr('x', 8)
      .attr('dy', '0.35em')
      .attr('font-size', '12px')
      .attr('fill', '#44403c')
      .text((d) => d.data.label || '')

    // Height axis
    const xAxis = d3Module.axisTop(xScale).ticks(5)

    g.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0, -5)`)
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', '10px')

    g.append('text')
      .attr('x', width / 2)
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#78716c')
      .text('Distance (100 - similarity)')

  }, [data, cutHeight, clusters, d3Module])

  if (!data.cards || data.cards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dendrogram</CardTitle>
          <CardDescription>
            No data available to display dendrogram.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!d3Module) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dendrogram</CardTitle>
          <CardDescription>
            Loading visualization...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Method display info
  const methodInfo = method === 'ward'
    ? {
        label: 'BMM',
        fullName: 'Best Merge Method (Ward\'s)',
        description: 'Optimized for small sample sizes (<30 participants). Minimizes within-cluster variance for more balanced groupings.',
      }
    : {
        label: 'AAM',
        fullName: 'Actual Agreement Method (UPGMA)',
        description: 'Standard method for larger datasets (30+ participants). Uses average linkage based on actual participant agreement.',
      }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Dendrogram</CardTitle>
          {method && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="flex items-center gap-1 cursor-help">
                    {methodInfo.label}
                    <HelpCircle className="h-3 w-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">{methodInfo.fullName}</p>
                  <p className="text-xs mt-1">{methodInfo.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <CardDescription>
          Hierarchical clustering showing how cards group together.
          Adjust the cut line to see different cluster groupings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Label className="text-sm whitespace-nowrap">Cut Height:</Label>
          <Slider
            value={[cutHeight]}
            onValueChange={(v) => setCutHeight(v[0])}
            min={0}
            max={100}
            step={5}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground w-12">{cutHeight}</span>
        </div>

        <div className="text-sm text-muted-foreground">
          Current clusters: <span className="font-medium text-foreground">{clusters.length}</span>
          {suggestedClusters && (
            <span className="ml-2">
              (suggested: {suggestedClusters})
            </span>
          )}
        </div>

        <div ref={containerRef} className="overflow-x-auto" data-pdf-chart="dendrogram">
          <svg ref={svgRef} />
        </div>

        {clusters.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Cluster Contents:</h4>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {clusters.map((cluster, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border p-3 text-sm"
                  style={{
                    borderLeftColor: d3Module?.schemeTableau10[idx % 10] ?? '#78716c',
                    borderLeftWidth: 4,
                  }}
                >
                  <div className="font-medium mb-1">Cluster {idx + 1}</div>
                  <div className="text-muted-foreground">
                    {cluster.slice(0, 5).join(', ')}
                    {cluster.length > 5 && ` +${cluster.length - 5} more`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
