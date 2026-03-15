'use client'

import { useMemo, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { TaskMetrics } from '@/lib/algorithms/tree-test-analysis'
import type { TreeNode } from '@veritio/study-types'
import { validateTaskMetrics } from '@/lib/utils/data-validation'
import { Button } from '@/components/ui/button'

const ROW_DISPLAY_LIMIT = 50

/** Uses pre-computed taskMetrics, NOT raw responses. */

interface DestinationsOverviewProps {
  taskMetrics: TaskMetrics[]
  nodes: TreeNode[]
}

interface NodeDisplayData {
  nodeId: string
  label: string
  depth: number
  // Per-task data: taskId -> { count, percentage, isCorrect }
  taskData: Map<string, { count: number; percentage: number; isCorrect: boolean }>
}

/**
 * Get cell background color based on correctness and percentage
 * Uses subtle, muted colors for a cleaner look
 */
function getCellColor(isCorrect: boolean, percentage: number, count: number): string {
  if (count === 0) return 'bg-transparent'

  if (isCorrect) {
    return 'bg-emerald-400/70'
  }

  // Incorrect - vary intensity by percentage (subtle rose tones)
  if (percentage > 20) {
    return 'bg-rose-300/80'
  } else if (percentage >= 10) {
    return 'bg-rose-200/70'
  } else {
    return 'bg-rose-100/60'
  }
}

/**
 * Build node display data from pre-computed metrics
 */
function buildNodeDisplayData(
  nodes: TreeNode[],
  taskMetrics: TaskMetrics[]
): NodeDisplayData[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  // Pre-compute all depths in a single pass with memoization
  const depthCache = new Map<string, number>()
  function getDepth(nodeId: string): number {
    if (depthCache.has(nodeId)) return depthCache.get(nodeId)!
    const node = nodeMap.get(nodeId)
    const depth = (!node || !node.parent_id) ? 0 : 1 + getDepth(node.parent_id)
    depthCache.set(nodeId, depth)
    return depth
  }

  const nodeDataMap = new Map<string, NodeDisplayData>()

  // Process each task's destination counts
  for (const taskMetric of taskMetrics) {
    for (const destination of taskMetric.destinationCounts) {
      const node = nodeMap.get(destination.nodeId)
      if (!node) continue

      let nodeData = nodeDataMap.get(destination.nodeId)
      if (!nodeData) {
        nodeData = {
          nodeId: destination.nodeId,
          label: node.label,
          depth: getDepth(destination.nodeId),
          taskData: new Map(),
        }
        nodeDataMap.set(destination.nodeId, nodeData)
      }

      nodeData.taskData.set(taskMetric.taskId, {
        count: destination.count,
        percentage: destination.percentage,
        isCorrect: destination.isCorrect,
      })
    }

    // Also add correct answer nodes even if they have 0 responses
    for (const correctNodeId of taskMetric.correctNodeIds) {
      const node = nodeMap.get(correctNodeId)
      if (!node) continue

      let nodeData = nodeDataMap.get(correctNodeId)
      if (!nodeData) {
        nodeData = {
          nodeId: correctNodeId,
          label: node.label,
          depth: getDepth(correctNodeId),
          taskData: new Map(),
        }
        nodeDataMap.set(correctNodeId, nodeData)
      }

      // If this task doesn't have data for this node, add it with 0 count
      if (!nodeData.taskData.has(taskMetric.taskId)) {
        nodeData.taskData.set(taskMetric.taskId, {
          count: 0,
          percentage: 0,
          isCorrect: true,
        })
      }
    }
  }

  // Convert to array and sort by node position
  const sortedNodes = [...nodes].sort((a, b) => a.position - b.position)
  const result: NodeDisplayData[] = []

  for (const node of sortedNodes) {
    const nodeData = nodeDataMap.get(node.id)
    if (nodeData) {
      result.push(nodeData)
    }
  }

  return result
}

export function DestinationsOverview({ taskMetrics, nodes }: DestinationsOverviewProps) {
  // Validate that required pre-computed data is available (dev mode only)
  validateTaskMetrics(taskMetrics, ['destinationCounts'], 'DestinationsOverview')

  const [showAllRows, setShowAllRows] = useState(false)

  const nodeDisplayData = useMemo(() =>
    buildNodeDisplayData(nodes, taskMetrics),
    [nodes, taskMetrics]
  )

  if (taskMetrics.length === 0 || nodeDisplayData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No destination data available yet.
      </div>
    )
  }

  const visibleNodes = showAllRows ? nodeDisplayData : nodeDisplayData.slice(0, ROW_DISPLAY_LIMIT)
  const taskColMinWidth = Math.max(40, Math.min(80, 400 / taskMetrics.length))

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-emerald-400/70 rounded-sm" />
            <span className="text-muted-foreground">Correct</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-rose-100/60 rounded-sm border border-rose-200/50" />
            <span className="text-muted-foreground">Incorrect &lt;10%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-rose-200/70 rounded-sm" />
            <span className="text-muted-foreground">Incorrect 10-20%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-rose-300/80 rounded-sm" />
            <span className="text-muted-foreground">Incorrect &gt;20%</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground/60 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">Shows where participants ended up for each task. Hover over cells to see details.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {taskMetrics.length > 8 && (
            <p className="text-xs text-muted-foreground mb-1">Scroll horizontally to see all tasks</p>
          )}
          <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground" style={{ width: '50%', minWidth: '200px' }}>
                  Destination
                </th>
                {taskMetrics.map((_, index) => (
                  <th
                    key={index}
                    className="text-center py-2 px-1 font-medium text-muted-foreground"
                    style={{ width: `${50 / taskMetrics.length}%`, minWidth: `${taskColMinWidth}px` }}
                  >
                    Task {index + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleNodes.map((node) => (
                <tr key={node.nodeId} className="border-b border-border/50">
                  <td className="py-1.5 pr-4">
                    <span
                      className="text-foreground"
                      style={{ paddingLeft: `${node.depth * 16}px` }}
                    >
                      {node.label}
                    </span>
                  </td>
                  {taskMetrics.map((taskMetric) => {
                    const data = node.taskData.get(taskMetric.taskId)
                    if (!data) return <td key={taskMetric.taskId} className="p-1" />

                    const bgColor = getCellColor(data.isCorrect, data.percentage, data.count)
                    const showCount = data.count > 0

                    return (
                      <td key={taskMetric.taskId} className="p-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`h-8 rounded-sm flex items-center justify-center ${bgColor} ${
                                data.count === 0 && !data.isCorrect ? '' : 'cursor-help'
                              }`}
                            >
                              {showCount && (
                                <span className={`text-xs font-medium ${data.isCorrect ? 'text-emerald-900' : 'text-rose-900/80'}`}>
                                  {data.count}
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          {(data.count > 0 || data.isCorrect) && (
                            <TooltipContent>
                              <div className="text-sm">
                                <div className="font-medium">{node.label}</div>
                                <div className="text-muted-foreground">
                                  {data.count} participant{data.count !== 1 ? 's' : ''} ({data.percentage}%)
                                </div>
                                {data.isCorrect && (
                                  <div className="text-green-600 text-xs mt-1">Correct answer</div>
                                )}
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {nodeDisplayData.length > ROW_DISPLAY_LIMIT && (
          <div className="text-center pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAllRows(!showAllRows)}>
              {showAllRows ? 'Show less' : `Show all ${nodeDisplayData.length} destinations`}
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
