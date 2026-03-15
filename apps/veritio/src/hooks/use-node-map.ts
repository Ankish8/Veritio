import { useMemo } from 'react'
import type { TreeNode } from '@veritio/study-types'

/**
 * Utility for creating node map in non-hook contexts
 * (e.g., utility functions, Web Workers)
 */
export function createNodeMap(nodes: TreeNode[]): Map<string, TreeNode> {
  const map = new Map<string, TreeNode>()
  for (const node of nodes) {
    map.set(node.id, node)
  }
  return map
}

/**
 * Utility for creating children map in non-hook contexts.
 * Pre-sorted by position for immediate use in rendering.
 */
export function createChildrenMap(
  nodes: TreeNode[]
): Map<string | null, TreeNode[]> {
  const map = new Map<string | null, TreeNode[]>()

  for (const node of nodes) {
    const parentId = node.parent_id
    if (!map.has(parentId)) {
      map.set(parentId, [])
    }
    map.get(parentId)!.push(node)
  }

  for (const children of map.values()) {
    children.sort((a, b) => a.position - b.position)
  }

  return map
}

/**
 * Hook: O(1) node lookups by ID.
 * Delegates to createNodeMap with memoization.
 */
export function useNodeMap(nodes: TreeNode[]): Map<string, TreeNode> {
  return useMemo(() => createNodeMap(nodes), [nodes])
}

/**
 * Hook: O(1) children lookups by parent ID, pre-sorted by position.
 * Delegates to createChildrenMap with memoization.
 */
export function useChildrenMap(nodes: TreeNode[]): Map<string | null, TreeNode[]> {
  return useMemo(() => createChildrenMap(nodes), [nodes])
}
