/**
 * D3 rendering functions for the Pietree visualization.
 * Handles tree layout computation, link drawing, pie-chart nodes, and tooltip interactions.
 */
import * as d3 from 'd3'
import type { PietreeNode } from './pietree-utils'
import { PIETREE_RENDER_COLORS as COLORS, generateSmoothPath } from './pietree-utils'

export type TooltipState = {
  data: {
    nodeName: string
    totalVisits: number
    correctPathCount: number
    incorrectPathCount: number
    wentBackCount: number
    nominatedCount: number
    skippedCount: number
  }
  position: { x: number; y: number }
  visible: boolean
}

export type TooltipSetter = React.Dispatch<React.SetStateAction<TooltipState>>

export const INITIAL_TOOLTIP: TooltipState = {
  data: {
    nodeName: '',
    totalVisits: 0,
    correctPathCount: 0,
    incorrectPathCount: 0,
    wentBackCount: 0,
    nominatedCount: 0,
    skippedCount: 0,
  },
  position: { x: 0, y: 0 },
  visible: false,
}

/** Calculate node radius based on visit count */
function getNodeRadius(totalVisits: number): number {
  return totalVisits === 0 ? 8 : Math.max(10, Math.min(28, 10 + totalVisits * 2))
}

/** Calculate link stroke width based on visit count */
function getLinkStrokeWidth(totalVisits: number): number {
  return Math.max(6, Math.min(16, 6 + totalVisits * 2))
}

/** Attach tooltip hover interactions to a D3 node group */
function attachTooltipHandlers(
  nodeGroup: d3.Selection<d3.BaseType, unknown, null, undefined>,
  node: PietreeNode,
  setTooltip: TooltipSetter
) {
  nodeGroup
    .on('mouseenter', function(event) {
      setTooltip({
        data: {
          nodeName: node.label,
          totalVisits: node.totalVisits,
          correctPathCount: node.correctPathCount,
          incorrectPathCount: node.incorrectPathCount,
          wentBackCount: node.wentBackCount,
          nominatedCount: node.nominatedCount,
          skippedCount: node.skippedCount,
        },
        position: { x: event.clientX, y: event.clientY },
        visible: true,
      })
    })
    .on('mousemove', function(event) {
      setTooltip(prev => ({
        ...prev,
        position: { x: event.clientX, y: event.clientY },
      }))
    })
    .on('mouseleave', function() {
      setTooltip(prev => ({ ...prev, visible: false }))
    })
}

/** Draw pie chart or solid circle for a node */
function drawNodePie(
  nodeGroup: d3.Selection<d3.BaseType, unknown, null, undefined>,
  node: PietreeNode,
  correctPathSet: Set<string>,
  _correctNodeIds: string[]
) {
  const isOnCorrectPath = correctPathSet.has(node.id)
  const baseRadius = getNodeRadius(node.totalVisits)
  const borderStroke = isOnCorrectPath ? COLORS.correctBorder : '#fff'
  const borderWidth = isOnCorrectPath ? 3 : 1

  // Pure nominated destination (only nominated, no other actions)
  const isNominatedOnly = node.nominatedCount > 0 &&
    node.correctPathCount === 0 &&
    node.incorrectPathCount === 0 &&
    node.wentBackCount === 0 &&
    node.skippedCount === 0

  if (isNominatedOnly) {
    nodeGroup.append('circle')
      .attr('r', baseRadius)
      .attr('fill', COLORS.nominated)
      .attr('stroke', borderStroke)
      .attr('stroke-width', borderWidth)
    return
  }

  // No visits at all - show dashed empty circle
  if (node.totalVisits === 0) {
    nodeGroup.append('circle')
      .attr('r', 6)
      .attr('fill', 'none')
      .attr('stroke', isOnCorrectPath ? COLORS.correctBorder : '#d6d3d1')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '2,2')
    return
  }

  // Build pie data for 5 categories
  const pieData = [
    { value: node.correctPathCount, color: COLORS.correctPath, key: 'correct' },
    { value: node.incorrectPathCount, color: COLORS.incorrectPath, key: 'incorrect' },
    { value: node.wentBackCount, color: COLORS.wentBack, key: 'back' },
    { value: node.nominatedCount, color: COLORS.nominated, key: 'nominated' },
    { value: node.skippedCount, color: COLORS.skipped, key: 'skipped' },
  ].filter(p => p.value > 0)

  // Fallback: no data somehow, show neutral circle
  if (pieData.length === 0) {
    nodeGroup.append('circle')
      .attr('r', baseRadius)
      .attr('fill', '#e7e5e4')
      .attr('stroke', borderStroke)
      .attr('stroke-width', borderWidth)
    return
  }

  // Draw pie slices
  const pie = d3.pie<{ value: number; color: string; key: string }>()
    .value(d => d.value)
    .sort(null)

  const arc = d3.arc<d3.PieArcDatum<{ value: number; color: string; key: string }>>()
    .innerRadius(0)
    .outerRadius(baseRadius)

  nodeGroup.selectAll('.slice')
    .data(pie(pieData))
    .join('path')
    .attr('class', 'slice')
    .attr('d', arc as unknown as string)
    .attr('fill', d => d.data.color)
    .attr('stroke', '#fff')
    .attr('stroke-width', 0.5)

  // Add border if on correct path
  if (isOnCorrectPath) {
    nodeGroup.append('circle')
      .attr('r', baseRadius + 2)
      .attr('fill', 'none')
      .attr('stroke', COLORS.correctBorder)
      .attr('stroke-width', 3)
  }
}

/** Draw horizontal tree layout with smooth organic curves */
export function drawHorizontalTree(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  root: d3.HierarchyNode<PietreeNode>,
  innerWidth: number,
  innerHeight: number,
  correctPathSet: Set<string>,
  correctNodeIds: string[],
  setTooltip: TooltipSetter,
  nodeSpacing: number
) {
  const leafCount = root.leaves().length
  const totalNodes = root.descendants().length
  const dynamicHeight = Math.max(innerHeight, leafCount * nodeSpacing, totalNodes * 35)

  const treeLayout = d3.tree<PietreeNode>()
    .size([dynamicHeight, innerWidth - 180])
    .separation((a, b) => a.parent === b.parent ? 2 : 3)

  treeLayout(root)

  g.selectAll('.link')
    .data(root.links())
    .join('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', d => correctPathSet.has(d.target.data.id) ? COLORS.correctLine : COLORS.incorrectLine)
    .attr('stroke-width', d => getLinkStrokeWidth(d.target.data.totalVisits))
    .attr('stroke-opacity', 0.8)
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round')
    .attr('d', d => generateSmoothPath(d.source.y!, d.source.x!, d.target.y!, d.target.x!))

  const nodeGroups = g.selectAll('.node')
    .data(root.descendants())
    .join('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.y},${d.x})`)
    .style('cursor', 'pointer')

  nodeGroups.each(function(d) {
    const nodeGroup = d3.select(this)
    drawNodePie(nodeGroup, d.data, correctPathSet, correctNodeIds)
    attachTooltipHandlers(nodeGroup, d.data, setTooltip)
  })

  nodeGroups.append('text')
    .attr('dy', '0.35em')
    .attr('x', d => getNodeRadius(d.data.totalVisits) + 8)
    .attr('text-anchor', 'start')
    .attr('font-size', '12px')
    .attr('fill', '#44403c')
    .attr('font-weight', '500')
    .text(d => {
      const label = d.data.label
      return label.length > 20 ? label.slice(0, 17) + '...' : label
    })
}

/** Draw radial tree layout with smooth curves */
export function drawRadialTree(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  root: d3.HierarchyNode<PietreeNode>,
  innerWidth: number,
  innerHeight: number,
  correctPathSet: Set<string>,
  correctNodeIds: string[],
  setTooltip: TooltipSetter
) {
  const radius = Math.min(innerWidth, innerHeight) / 2 - 60

  const treeLayout = d3.tree<PietreeNode>()
    .size([2 * Math.PI, radius])
    .separation((a, b) => (a.parent === b.parent ? 1.2 : 2) / a.depth)

  treeLayout(root)

  const radialG = g.attr('transform', `translate(${innerWidth / 2},${innerHeight / 2})`)
  const radialLink = d3.linkRadial<d3.HierarchyLink<PietreeNode>, d3.HierarchyPointNode<PietreeNode>>()
    .angle(d => d.x!).radius(d => d.y!)

  radialG.selectAll('.link')
    .data(root.links())
    .join('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', d => correctPathSet.has(d.target.data.id) ? COLORS.correctLine : COLORS.incorrectLine)
    .attr('stroke-width', d => getLinkStrokeWidth(d.target.data.totalVisits))
    .attr('stroke-opacity', 0.8)
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round')
    .attr('d', radialLink as unknown as (d: d3.HierarchyLink<PietreeNode>) => string)

  const nodeGroups = radialG.selectAll('.node')
    .data(root.descendants())
    .join('g')
    .attr('class', 'node')
    .attr('transform', d => `rotate(${(d.x! * 180 / Math.PI - 90)}) translate(${d.y},0)`)
    .style('cursor', 'pointer')

  nodeGroups.each(function(d) {
    const nodeGroup = d3.select(this)
    drawNodePie(nodeGroup, d.data, correctPathSet, correctNodeIds)
    attachTooltipHandlers(nodeGroup, d.data, setTooltip)
  })

  radialG.selectAll('.node-label')
    .data(root.descendants())
    .join('text')
    .attr('class', 'node-label')
    .attr('transform', d => {
      const angle = d.x! - Math.PI / 2
      return `translate(${Math.cos(angle) * d.y!},${Math.sin(angle) * d.y!})`
    })
    .attr('dy', '0.35em')
    .attr('dx', d => {
      const nodeRadius = getNodeRadius(d.data.totalVisits)
      const isLeftSide = d.x! > Math.PI / 2 && d.x! < 3 * Math.PI / 2
      return isLeftSide ? -(nodeRadius + 6) : (nodeRadius + 6)
    })
    .attr('text-anchor', d => {
      const isLeftSide = d.x! > Math.PI / 2 && d.x! < 3 * Math.PI / 2
      return isLeftSide ? 'end' : 'start'
    })
    .attr('font-size', '11px')
    .attr('fill', '#44403c')
    .attr('font-weight', '500')
    .text(d => {
      const label = d.data.label
      return label.length > 18 ? label.slice(0, 15) + '...' : label
    })
}
