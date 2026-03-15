'use client'

import { useMemo } from 'react'
import type { TreeNode } from '@veritio/study-types'
import { useChildrenMap } from './use-node-map'

/** Computes a flattened list of visible tree nodes respecting expand/collapse state. */
export function useTreeVisibleNodes(
  nodes: TreeNode[],
  expandedNodes: Set<string>
): TreeNode[] {
  const childrenMap = useChildrenMap(nodes)

  return useMemo(() => {
    const result: TreeNode[] = []

    const addNodeAndChildren = (parentId: string | null) => {
      const children = childrenMap.get(parentId) || []
      for (const node of children) {
        result.push(node)
        if (expandedNodes.has(node.id)) {
          addNodeAndChildren(node.id)
        }
      }
    }

    addNodeAndChildren(null)
    return result
  }, [childrenMap, expandedNodes])
}
