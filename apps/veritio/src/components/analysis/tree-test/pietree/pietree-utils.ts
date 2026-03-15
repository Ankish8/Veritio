/**
 * Utility functions for Pietree visualization
 * Handles data transformation and path calculations
 */
import type { TreeNode } from '@veritio/study-types'
import type { TreeTestResponse } from '@/lib/algorithms/tree-test-analysis'

/**
 * Enhanced Pietree node with 5-category metrics
 */
export interface PietreeNode {
  id: string
  label: string
  parent_id: string | null
  totalVisits: number
  correctPathCount: number    // Clicked toward correct destination
  incorrectPathCount: number  // Clicked away from correct destination
  wentBackCount: number       // Returned to this node after leaving
  nominatedCount: number      // Selected as final answer
  skippedCount: number        // Skipped task while here
  children?: PietreeNode[]
}

// Colors for the 5 categories
export const PIETREE_RENDER_COLORS = {
  correctPath: '#22c55e',    // green-500
  incorrectPath: '#ef4444',  // red-500
  wentBack: '#0ea5e9',       // sky-500 (blue)
  nominated: '#eab308',      // yellow-500
  skipped: '#a8a29e',        // stone-400 (gray)
  // Lines
  correctLine: '#22c55e',    // green-500
  incorrectLine: '#d6d3d1',  // stone-300
  // Borders
  correctBorder: '#22c55e',  // green-500
}

/**
 * Get set of all nodes on the correct path (from root to any correct destination).
 */
export function getCorrectPathSet(
  nodes: TreeNode[],
  correctNodeIds: string[]
): Set<string> {
  const correctPath = new Set<string>()

  for (const correctId of correctNodeIds) {
    let currentId: string | null = correctId
    while (currentId) {
      correctPath.add(currentId)
      const node = nodes.find(n => n.id === currentId)
      currentId = node?.parent_id || null
    }
  }

  return correctPath
}

/**
 * Build hierarchical pietree data from flat nodes and responses.
 * Calculates 5-category metrics for each node.
 */
export function buildPietreeData(
  nodes: TreeNode[],
  responses: TreeTestResponse[],
  correctNodeIds: string[]
): PietreeNode | null {
  if (nodes.length === 0) return null

  // Find root node (no parent)
  const rootNode = nodes.find(n => !n.parent_id)
  if (!rootNode) return null

  // Get correct path set
  const correctPathSet = getCorrectPathSet(nodes, correctNodeIds)

  // Initialize counts for all nodes
  const nodeCounts = new Map<string, {
    totalVisits: number
    correctPathCount: number
    incorrectPathCount: number
    wentBackCount: number
    nominatedCount: number
    skippedCount: number
  }>()

  // Initialize all nodes with zero counts
  for (const node of nodes) {
    nodeCounts.set(node.id, {
      totalVisits: 0,
      correctPathCount: 0,
      incorrectPathCount: 0,
      wentBackCount: 0,
      nominatedCount: 0,
      skippedCount: 0,
    })
  }

  // Process each response
  for (const response of responses) {
    const pathTaken = response.path_taken || []
    const visitedInThisPath = new Set<string>()

    // Process each step in the path
    for (let i = 0; i < pathTaken.length; i++) {
      const currentNodeId = pathTaken[i]
      const nextNodeId = pathTaken[i + 1]
      const counts = nodeCounts.get(currentNodeId)

      if (!counts) continue

      // Count visit
      counts.totalVisits++

      // Check if this is a return visit (went back)
      if (visitedInThisPath.has(currentNodeId)) {
        counts.wentBackCount++
      }

      visitedInThisPath.add(currentNodeId)

      // If there's a next node, determine if it's on correct path
      if (nextNodeId) {
        if (correctPathSet.has(nextNodeId)) {
          counts.correctPathCount++
        } else {
          counts.incorrectPathCount++
        }
      }
    }

    // Handle nominated destination
    if (response.selected_node_id) {
      const selectedCounts = nodeCounts.get(response.selected_node_id)
      if (selectedCounts) {
        selectedCounts.nominatedCount++
        // If this node wasn't in the path, add it to visits
        if (!pathTaken.includes(response.selected_node_id)) {
          selectedCounts.totalVisits++
        }
      }
    }

    // Handle skipped task - attribute to last node in path
    if (response.is_skipped && pathTaken.length > 0) {
      const lastNodeId = pathTaken[pathTaken.length - 1]
      const lastCounts = nodeCounts.get(lastNodeId)
      if (lastCounts) {
        lastCounts.skippedCount++
      }
    }
  }

  // Build tree recursively
  function buildNode(node: TreeNode): PietreeNode {
    const counts = nodeCounts.get(node.id) || {
      totalVisits: 0,
      correctPathCount: 0,
      incorrectPathCount: 0,
      wentBackCount: 0,
      nominatedCount: 0,
      skippedCount: 0,
    }

    const children = nodes
      .filter(n => n.parent_id === node.id)
      .sort((a, b) => a.position - b.position)
      .map(buildNode)

    return {
      id: node.id,
      label: node.label,
      parent_id: node.parent_id,
      totalVisits: counts.totalVisits,
      correctPathCount: counts.correctPathCount,
      incorrectPathCount: counts.incorrectPathCount,
      wentBackCount: counts.wentBackCount,
      nominatedCount: counts.nominatedCount,
      skippedCount: counts.skippedCount,
      children: children.length > 0 ? children : undefined,
    }
  }

  return buildNode(rootNode)
}

/**
 * Generate smooth organic bezier curve path between two points.
 * Uses a horizontal midpoint for control points to create flowing S-curves.
 */
export function generateSmoothPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): string {
  const midX = (sourceX + targetX) / 2
  return `M${sourceX},${sourceY} C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`
}
