'use client'

import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, Check } from 'lucide-react'

import { ScrollArea } from '@/components/ui/scroll-area'
import type { TreeNode } from '@veritio/study-types'
import { cn } from '@/lib/utils'
import { useNodeMap, useChildrenMap } from '@/hooks'

interface NodeSelectorItemProps {
  node: TreeNode
  childrenMap: Map<string | null, TreeNode[]>
  selectedNodeId: string | null
  expandedNodes: Set<string>
  onToggleExpand: (id: string) => void
  onSelect: (id: string) => void
  level: number
}

function NodeSelectorItem({
  node,
  childrenMap,
  selectedNodeId,
  expandedNodes,
  onToggleExpand,
  onSelect,
  level,
}: NodeSelectorItemProps) {
  // Performance: O(1) lookup instead of O(n) filter
  const children = childrenMap.get(node.id) || []
  const hasChildren = children.length > 0
  const isExpanded = expandedNodes.has(node.id)
  const isSelected = selectedNodeId === node.id

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 rounded-md p-1.5 cursor-pointer hover:bg-accent',
          isSelected && 'bg-primary/10 hover:bg-primary/15'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        {/* Expand/Collapse button */}
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

        {/* Node label */}
        <span className="flex-1 text-sm truncate">{node.label}</span>

        {/* Selected indicator */}
        {isSelected && (
          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Children - already sorted by position in childrenMap */}
      {hasChildren && isExpanded && (
        <div>
          {children.map((child) => (
            <NodeSelectorItem
              key={child.id}
              node={child}
              childrenMap={childrenMap}
              selectedNodeId={selectedNodeId}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface NodeSelectorProps {
  nodes: TreeNode[]
  selectedNodeId: string | null
  onSelect: (nodeId: string) => void
}

export function NodeSelector({ nodes, selectedNodeId, onSelect }: NodeSelectorProps) {
  // Performance: O(1) lookups instead of O(n) filter/find
  const nodeMap = useNodeMap(nodes)
  const childrenMap = useChildrenMap(nodes)

  // Start with all parent nodes of selected node expanded
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const expanded = new Set<string>()
    if (selectedNodeId) {
      // Expand all ancestors using O(1) map lookups
      let currentId: string | null = selectedNodeId
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
    // Also expand root nodes by default
    const rootNodes = childrenMap.get(null) || []
    rootNodes.forEach((n) => expanded.add(n.id))
    return expanded
  })

  // Performance: Use childrenMap instead of filter + sort
  const rootNodes = useMemo(
    () => childrenMap.get(null) || [],
    [childrenMap]
  )

  const handleToggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <ScrollArea className="h-[300px] rounded-md border">
      <div className="p-1">
        {rootNodes.map((node) => (
          <NodeSelectorItem
            key={node.id}
            node={node}
            childrenMap={childrenMap}
            selectedNodeId={selectedNodeId}
            expandedNodes={expandedNodes}
            onToggleExpand={handleToggleExpand}
            onSelect={onSelect}
            level={0}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
