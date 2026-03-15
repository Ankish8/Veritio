import { sankey, sankeyLeft } from 'd3-sankey'
import type { SankeyNode, SankeyLink } from 'd3-sankey'
import type { FlowNode, FlowLink, FlowDiagramConfig } from './types'

// D3 Sankey types
export interface SankeyNodeExtended extends SankeyNode<FlowNode, FlowLink> {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface SankeyLinkExtended extends Omit<FlowLink, 'source' | 'target'> {
  source: SankeyNodeExtended
  target: SankeyNodeExtended
  width: number
  y0: number
  y1: number
  index?: number
}

// Zoom transform state
export interface ZoomTransform {
  x: number
  y: number
  k: number
}

/**
 * Remove cycle-causing edges from a directed graph using DFS.
 * High-value links are traversed first so they become tree edges;
 * lower-value links that close cycles are removed.
 */
export function breakGraphCycles<T extends { source: string; target: string; value: number }>(
  links: T[]
): T[] {
  if (links.length === 0) return links

  // Build adjacency list, sorted by value descending per source.
  // DFS traverses high-value links first → they become tree edges.
  // Lower-value links that close cycles become removable back edges.
  const adj = new Map<string, { target: string; value: number }[]>()
  for (const link of links) {
    if (!adj.has(link.source)) adj.set(link.source, [])
    adj.get(link.source)!.push({ target: link.target, value: link.value })
  }
  for (const neighbors of adj.values()) {
    neighbors.sort((a, b) => b.value - a.value)
  }

  const visited = new Set<string>()
  const inStack = new Set<string>()
  const backEdges = new Set<string>()

  function dfs(node: string): void {
    if (visited.has(node)) return
    visited.add(node)
    inStack.add(node)

    for (const { target } of adj.get(node) || []) {
      if (inStack.has(target)) {
        // Back edge → this link closes a cycle, mark for removal
        backEdges.add(`${node}→${target}`)
      } else if (!visited.has(target)) {
        dfs(target)
      }
    }

    inStack.delete(node)
  }

  // Collect all nodes
  const allNodes = new Set<string>()
  for (const link of links) {
    allNodes.add(link.source)
    allNodes.add(link.target)
  }

  // Run DFS from each unvisited node
  for (const node of allNodes) {
    if (!visited.has(node)) {
      dfs(node)
    }
  }

  return links.filter((l) => !backEdges.has(`${l.source}→${l.target}`))
}

export interface SankeyLayoutResult {
  sankeyNodes: SankeyNodeExtended[]
  sankeyLinks: SankeyLinkExtended[]
  backtrackLinks: FlowLink[]
  svgWidth: number
  svgHeight: number
}

/**
 * Compute the Sankey layout for flow diagram data.
 * Separates forward and backtrack links, breaks cycles, and runs d3-sankey.
 */
export function computeSankeyLayout(
  nodes: FlowNode[],
  links: FlowLink[],
  dimensions: { width: number; height: number },
  config: FlowDiagramConfig
): SankeyLayoutResult {
  if (nodes.length === 0) {
    return { sankeyNodes: [], sankeyLinks: [], backtrackLinks: [], svgWidth: dimensions.width, svgHeight: dimensions.height }
  }

  // Create node ID set for link validation
  const nodeIdSet = new Set(nodes.map((n) => n.id))

  // Separate forward and backtrack links
  const forwardLinks: FlowLink[] = []
  const btLinks: FlowLink[] = []
  for (const l of links) {
    if (!nodeIdSet.has(l.source) || !nodeIdSet.has(l.target)) continue
    if (l.source === l.target) continue
    if (l.isBacktrack) {
      btLinks.push(l)
    } else {
      forwardLinks.push({ ...l, value: Math.max(l.value, 1) })
    }
  }

  // Break any remaining cycles in forward links (cross-session contradictions)
  const acyclicLinks = breakGraphCycles(forwardLinks)

  // Only include connected nodes (from forward links — backtracks reference same nodes)
  const connectedNodeIds = new Set<string>()
  for (const l of acyclicLinks) {
    connectedNodeIds.add(l.source)
    connectedNodeIds.add(l.target)
  }
  // Also include nodes referenced by backtrack links
  for (const l of btLinks) {
    connectedNodeIds.add(l.source)
    connectedNodeIds.add(l.target)
  }
  const connectedNodes = nodes.filter((n) => connectedNodeIds.has(n.id))

  // Guard: if no nodes survived filtering (e.g. single-frame study, all self-loops,
  // or all links reference missing nodes), return empty layout to avoid d3-sankey
  // crashing on max([], ...) → NaN → new Array(NaN).
  if (connectedNodes.length === 0) {
    return { sankeyNodes: [], sankeyLinks: [], backtrackLinks: btLinks, svgWidth: dimensions.width, svgHeight: dimensions.height }
  }

  const sankeyData = {
    nodes: connectedNodes.map((n) => ({ ...n })),
    links: acyclicLinks,
  }

  // Compute appropriate extent based on data complexity
  // Add extra space when backtracks exist (curved arrows arc below)
  const btPadding = btLinks.length > 0 ? 80 : 0
  const minHeightForNodes = connectedNodes.length * (config.nodeMinHeight + config.nodePadding) + 80 + btPadding
  const extentHeight = Math.max(Math.min(dimensions.height, 800), minHeightForNodes)
  const extentWidth = dimensions.width - 120

  // Create Sankey generator
  const sankeyGenerator = sankey<FlowNode, FlowLink>()
    .nodeWidth(config.nodeWidth)
    .nodePadding(config.nodePadding)
    .extent([
      [40, 30],
      [extentWidth - 40, extentHeight - 30],
    ])
    .nodeId((d) => d.id)
    .nodeAlign(sankeyLeft)

  // Compute layout
  const result = sankeyGenerator(sankeyData as any)

  return {
    sankeyNodes: result.nodes as SankeyNodeExtended[],
    sankeyLinks: result.links as SankeyLinkExtended[],
    backtrackLinks: btLinks,
    svgWidth: extentWidth,
    svgHeight: extentHeight,
  }
}
