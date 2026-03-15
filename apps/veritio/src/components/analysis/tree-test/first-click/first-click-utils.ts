import type { TreeNode } from '@veritio/study-types'
import type { TreeTestResponse } from '@/lib/algorithms/tree-test-analysis'
import { buildBreadcrumbPath } from '@/lib/algorithms/statistics'
import { createChildrenMap } from '@/hooks/use-node-map'
import type { ExtendedFirstClickData, FirstClickSummary } from './first-click-types'

export type { ExtendedFirstClickData, FirstClickSummary, ColumnKey, SortField, SortDirection, SortConfig } from './first-click-types'
export { sortFirstClickData } from './first-click-types'

interface AnalysisContext {
  nodeMap: Map<string, TreeNode>
  rootNodeIds: Set<string>
  correctPaths: string[][]
  responsesWithPath: TreeTestResponse[]
}

function prepareAnalysisContext(
  responses: TreeTestResponse[],
  nodes: TreeNode[],
  correctNodeIds: string[]
): AnalysisContext {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const childrenMap = createChildrenMap(nodes)
  const rootNodes = childrenMap.get(null) || []
  const rootNodeIds = new Set(rootNodes.map(n => n.id))
  const correctPaths = correctNodeIds.map(id => calculatePathToNode(nodeMap, id))
  const responsesWithPath = responses.filter(r => r.path_taken.length > 0)

  return { nodeMap, rootNodeIds, correctPaths, responsesWithPath }
}

function findFirstMeaningfulClick(
  pathTaken: string[],
  rootNodeIds: Set<string>
): string | undefined {
  return pathTaken.find(nodeId => !rootNodeIds.has(nodeId))
}

function isOnCorrectPath(nodeId: string, correctPaths: string[][]): boolean {
  return correctPaths.some(path => path.length > 0 && path[0] === nodeId)
}

/**
 * Compute extended first click data with breadcrumbs and "clicked during task" percentages.
 *
 * IMPORTANT: This function finds the first MEANINGFUL click by skipping root nodes.
 * In tree tests, participants often must click the root to expand it, so the actual
 * "first click" decision is the first non-root node they choose.
 */
export function computeExtendedFirstClickData(
  responses: TreeTestResponse[],
  nodes: TreeNode[],
  correctNodeIds: string[]
): ExtendedFirstClickData[] {
  const { nodeMap, rootNodeIds, correctPaths, responsesWithPath } =
    prepareAnalysisContext(responses, nodes, correctNodeIds)

  if (responsesWithPath.length === 0) return []

  // Count first clicks and collect time data (skipping root nodes)
  const firstClickCounts = new Map<string, number>()
  const firstClickTimes = new Map<string, number[]>()

  for (const response of responsesWithPath) {
    const click = findFirstMeaningfulClick(response.path_taken, rootNodeIds)
    if (!click) continue

    firstClickCounts.set(click, (firstClickCounts.get(click) || 0) + 1)

    if (response.time_to_first_click_ms != null) {
      const times = firstClickTimes.get(click) || []
      times.push(response.time_to_first_click_ms)
      firstClickTimes.set(click, times)
    }
  }

  const totalWithFirstClick = Array.from(firstClickCounts.values()).reduce(
    (sum, count) => sum + count, 0
  )

  // Pre-build a map of nodeId -> count of responses that clicked it during the task.
  // This avoids O(nodes * responses * pathLength) from repeated Array.includes calls.
  const clickedDuringTaskMap = new Map<string, number>()
  for (const response of responsesWithPath) {
    for (const nodeId of response.path_taken) {
      clickedDuringTaskMap.set(nodeId, (clickedDuringTaskMap.get(nodeId) || 0) + 1)
    }
  }

  const result: ExtendedFirstClickData[] = []

  for (const [nodeId, count] of firstClickCounts.entries()) {
    const node = nodeMap.get(nodeId)
    if (!node) continue

    const breadcrumbPath = buildBreadcrumbPath(nodes, nodeId)
    const clickedDuringTaskCount = clickedDuringTaskMap.get(nodeId) || 0
    const clickedDuringTaskPercentage = responsesWithPath.length > 0
      ? (clickedDuringTaskCount / responsesWithPath.length) * 100
      : 0

    const times = firstClickTimes.get(nodeId) || []
    const avgTimeToFirstClickMs = times.length > 0
      ? times.reduce((sum, t) => sum + t, 0) / times.length
      : null

    result.push({
      nodeId,
      nodeLabel: node.label,
      breadcrumbPath,
      breadcrumbPathString: breadcrumbPath.join(' > '),
      count,
      percentage: totalWithFirstClick > 0 ? (count / totalWithFirstClick) * 100 : 0,
      clickedDuringTaskCount,
      clickedDuringTaskPercentage,
      isOnCorrectPath: isOnCorrectPath(nodeId, correctPaths),
      avgTimeToFirstClickMs,
    })
  }

  return result.sort((a, b) => b.percentage - a.percentage)
}

/**
 * Compute summary statistics for first click analysis.
 */
export function computeFirstClickSummary(
  responses: TreeTestResponse[],
  nodes: TreeNode[],
  correctNodeIds: string[]
): FirstClickSummary {
  const { rootNodeIds, correctPaths, responsesWithPath } =
    prepareAnalysisContext(responses, nodes, correctNodeIds)

  // Get the first step of the correct path (what a correct first click should be)
  const correctFirstClickNodeId = correctPaths.length > 0 && correctPaths[0].length > 0
    ? correctPaths[0][0]
    : null

  const correctFirstClickPath = correctFirstClickNodeId
    ? buildBreadcrumbPath(nodes, correctFirstClickNodeId).join(' > ')
    : 'N/A'

  if (responsesWithPath.length === 0) {
    return {
      totalResponses: 0,
      correctFirstClickCount: 0,
      correctFirstClickRate: 0,
      correctFirstClickPath,
      avgTimeToFirstClickMs: null,
    }
  }

  let correctFirstClickCount = 0
  const allTimes: number[] = []

  for (const response of responsesWithPath) {
    const click = findFirstMeaningfulClick(response.path_taken, rootNodeIds)
    if (!click) continue

    if (isOnCorrectPath(click, correctPaths)) correctFirstClickCount++

    if (response.time_to_first_click_ms != null) {
      allTimes.push(response.time_to_first_click_ms)
    }
  }

  const avgTimeToFirstClickMs = allTimes.length > 0
    ? allTimes.reduce((sum, t) => sum + t, 0) / allTimes.length
    : null

  return {
    totalResponses: responsesWithPath.length,
    correctFirstClickCount,
    correctFirstClickRate: (correctFirstClickCount / responsesWithPath.length) * 100,
    correctFirstClickPath,
    avgTimeToFirstClickMs,
  }
}

/** Calculate the path from root to a given node (excluding the node itself). */
function calculatePathToNode(nodeMap: Map<string, TreeNode>, nodeId: string): string[] {
  const path: string[] = []
  let currentId: string | null = nodeId

  while (currentId) {
    const node = nodeMap.get(currentId)
    if (!node) break

    if (node.parent_id) {
      path.unshift(node.parent_id)
    }

    currentId = node.parent_id
  }

  return path
}
