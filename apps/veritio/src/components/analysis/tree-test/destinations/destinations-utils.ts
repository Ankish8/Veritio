import type { TreeTestResponse } from '@/lib/algorithms/tree-test-analysis'
import type { TreeNode } from '@veritio/study-types'
import { buildBreadcrumbPath } from '@/lib/algorithms/statistics'

/**
 * Destination data for displaying in the table.
 * Groups responses by their final selected node (destination).
 */
export interface DestinationData {
  nodeId: string
  nodeLabel: string
  breadcrumbPath: string[]     // ["Home", "Category", "Item"]
  breadcrumbString: string     // "Home > Category > Item"
  participantCount: number
  percentage: number
  isCorrect: boolean
  participantIds: string[]
}

/**
 * Sort configuration for destination tables
 */
export interface DestinationSortConfig {
  field: 'destination' | 'participants'
  direction: 'asc' | 'desc'
}

/**
 * Compute destination data from responses.
 * Groups responses by selected_node_id and calculates counts/percentages.
 *
 * @param responses - Task responses to analyze
 * @param nodes - Tree nodes for building breadcrumb paths
 * @param correctNodeIds - Array of correct node IDs for the task
 * @param totalResponses - Total number of responses (for percentage calculation)
 * @returns Object with correct and incorrect destination arrays
 */
export function computeDestinationData(
  responses: TreeTestResponse[],
  nodes: TreeNode[],
  correctNodeIds: string[],
  totalResponses: number
): { correct: DestinationData[]; incorrect: DestinationData[] } {
  // Create node map for efficient lookup
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  // Group responses by destination (selected_node_id)
  const destinationGroups = new Map<string, string[]>()

  for (const response of responses) {
    const nodeId = response.selected_node_id
    if (!nodeId) continue

    const group = destinationGroups.get(nodeId)
    if (group) {
      group.push(response.participant_id)
    } else {
      destinationGroups.set(nodeId, [response.participant_id])
    }
  }

  // Convert to DestinationData arrays
  const correctDestinations: DestinationData[] = []
  const incorrectDestinations: DestinationData[] = []

  // Also include correct destinations that weren't selected (0 participants)
  const selectedNodeIds = new Set(destinationGroups.keys())
  for (const correctNodeId of correctNodeIds) {
    if (!selectedNodeIds.has(correctNodeId)) {
      // Add correct destination with 0 participants
      const node = nodeMap.get(correctNodeId)
      if (node) {
        const breadcrumbPath = buildBreadcrumbPath(nodes, correctNodeId)
        correctDestinations.push({
          nodeId: correctNodeId,
          nodeLabel: node.label,
          breadcrumbPath,
          breadcrumbString: breadcrumbPath.join(' > '),
          participantCount: 0,
          percentage: 0,
          isCorrect: true,
          participantIds: [],
        })
      }
    }
  }

  for (const [nodeId, participantIds] of destinationGroups) {
    const node = nodeMap.get(nodeId)
    if (!node) continue

    const isCorrect = correctNodeIds.includes(nodeId)
    const breadcrumbPath = buildBreadcrumbPath(nodes, nodeId)

    const destinationData: DestinationData = {
      nodeId,
      nodeLabel: node.label,
      breadcrumbPath,
      breadcrumbString: breadcrumbPath.join(' > '),
      participantCount: participantIds.length,
      percentage: totalResponses > 0
        ? Math.round((participantIds.length / totalResponses) * 100)
        : 0,
      isCorrect,
      participantIds,
    }

    if (isCorrect) {
      correctDestinations.push(destinationData)
    } else {
      incorrectDestinations.push(destinationData)
    }
  }

  // Sort by participant count descending by default
  correctDestinations.sort((a, b) => b.participantCount - a.participantCount)
  incorrectDestinations.sort((a, b) => b.participantCount - a.participantCount)

  return { correct: correctDestinations, incorrect: incorrectDestinations }
}

/** Sort destination data based on sort configuration. */
export function sortDestinations(
  destinations: DestinationData[],
  sortConfig: DestinationSortConfig
): DestinationData[] {
  const multiplier = sortConfig.direction === 'asc' ? 1 : -1

  return [...destinations].sort((a, b) => {
    const comparison = sortConfig.field === 'destination'
      ? a.breadcrumbString.localeCompare(b.breadcrumbString)
      : a.participantCount - b.participantCount
    return multiplier * comparison
  })
}

/**
 * Get total participant count for correct/incorrect sections.
 */
export function getTotalParticipantCount(destinations: DestinationData[]): number {
  return destinations.reduce((sum, d) => sum + d.participantCount, 0)
}
