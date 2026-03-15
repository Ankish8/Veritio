'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChevronRight, ChevronDown, Folder } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { TreeNode } from '@veritio/study-types'
import { cn } from '@/lib/utils'
import { useNodeMap, useChildrenMap } from '@/hooks'

/**
 * Check if a node is a leaf node (has no children)
 * Performance: O(1) lookup with childrenMap instead of O(n) Array.some
 */
function isLeafNode(nodeId: string, childrenMap: Map<string | null, TreeNode[]>): boolean {
  return !childrenMap.has(nodeId) || childrenMap.get(nodeId)!.length === 0
}

interface MultiNodeSelectorItemProps {
  node: TreeNode
  childrenMap: Map<string | null, TreeNode[]>
  selectedNodeIds: string[]
  expandedNodes: Set<string>
  onToggleExpand: (id: string) => void
  onToggleSelect: (id: string) => void
  level: number
}

function MultiNodeSelectorItem({
  node,
  childrenMap,
  selectedNodeIds,
  expandedNodes,
  onToggleExpand,
  onToggleSelect,
  level,
}: MultiNodeSelectorItemProps) {
  // Performance: O(1) lookup instead of O(n) filter
  const children = childrenMap.get(node.id) || []
  const hasChildren = children.length > 0
  const isLeaf = !hasChildren
  const isExpanded = expandedNodes.has(node.id)
  const isSelected = selectedNodeIds.includes(node.id)

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 rounded-md p-1.5',
          isLeaf ? 'cursor-pointer hover:bg-accent' : 'cursor-default'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => isLeaf && onToggleSelect(node.id)}
      >
        {/* Expand/Collapse button for parent nodes */}
        <button
          className={cn(
            'h-5 w-5 flex items-center justify-center rounded hover:bg-muted',
            !hasChildren && 'invisible'
          )}
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand(node.id)
          }}
        >
          {hasChildren &&
            (isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            ))}
        </button>

        {/* Checkbox for leaf nodes only */}
        {isLeaf ? (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(node.id)}
            onClick={(e) => e.stopPropagation()}
            className="mr-1"
          />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground mr-1" />
        )}

        {/* Node label */}
        <span
          className={cn(
            'flex-1 text-sm truncate',
            !isLeaf && 'text-muted-foreground'
          )}
        >
          {node.label}
        </span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {/* Children already sorted by position in childrenMap */}
          {children.map((child) => (
            <MultiNodeSelectorItem
              key={child.id}
              node={child}
              childrenMap={childrenMap}
              selectedNodeIds={selectedNodeIds}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              onToggleSelect={onToggleSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface MultiNodeSelectorProps {
  nodes: TreeNode[]
  selectedNodeIds: string[]
  onSelectionChange: (nodeIds: string[]) => void
}

export function MultiNodeSelector({
  nodes,
  selectedNodeIds,
  onSelectionChange,
}: MultiNodeSelectorProps) {
  // Performance optimizations: O(1) lookups
  const nodeMap = useNodeMap(nodes)
  const childrenMap = useChildrenMap(nodes)

  // Start with root nodes expanded
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const expanded = new Set<string>()
    // Expand root nodes by default
    const rootNodes = childrenMap.get(null) || []
    rootNodes.forEach((n) => expanded.add(n.id))
    return expanded
  })

  // Expand ancestors of selected nodes when selectedNodeIds changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedNodes((prev) => {
      const expanded = new Set(prev)

      // Expand ancestors of all selected nodes (O(1) lookups)
      for (const selectedId of selectedNodeIds) {
        let currentId: string | null = selectedId
        while (currentId) {
          const node = nodeMap.get(currentId)
          if (node?.parent_id) {
            expanded.add(node.parent_id)
            currentId = node.parent_id
          } else {
            break
          }
        }
      }

      return expanded
    })
  }, [selectedNodeIds, nodeMap])

  // Performance: Use childrenMap instead of filter
  const rootNodes = useMemo(
    () => childrenMap.get(null) || [],
    [childrenMap]
  )

  // Count leaf nodes for stats (O(n) instead of O(n²))
  const leafNodeCount = useMemo(
    () => nodes.filter((n) => isLeafNode(n.id, childrenMap)).length,
    [nodes, childrenMap]
  )

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleToggleSelect = useCallback((nodeId: string) => {
    // Only allow selecting leaf nodes
    if (!isLeafNode(nodeId, childrenMap)) return

    const newSelection = selectedNodeIds.includes(nodeId)
      ? selectedNodeIds.filter((id) => id !== nodeId)
      : [...selectedNodeIds, nodeId]

    onSelectionChange(newSelection)
  }, [childrenMap, selectedNodeIds, onSelectionChange])

  const handleDeselectAll = useCallback(() => {
    onSelectionChange([])
  }, [onSelectionChange])

  return (
    <div className="space-y-3">
      {/* Header with selection count and deselect button */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {selectedNodeIds.length} of {leafNodeCount} leaf nodes selected
        </span>
        {selectedNodeIds.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleDeselectAll}
          >
            Deselect all
          </Button>
        )}
      </div>

      {/* Tree view */}
      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-1">
          {rootNodes.map((node) => (
            <MultiNodeSelectorItem
              key={node.id}
              node={node}
              childrenMap={childrenMap}
              selectedNodeIds={selectedNodeIds}
              expandedNodes={expandedNodes}
              onToggleExpand={handleToggleExpand}
              onToggleSelect={handleToggleSelect}
              level={0}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        Only leaf nodes (endpoints without children) can be selected as correct answers.
      </p>
    </div>
  )
}
