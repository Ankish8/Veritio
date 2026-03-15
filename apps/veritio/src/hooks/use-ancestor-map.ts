import { useMemo } from 'react'
import type { TreeNode } from '@veritio/study-types'

/**
 * Creates a map of node ID to array of ancestor IDs
 * Ancestors are ordered from immediate parent to root
 * Reduces ancestor traversal from O(depth × n) to O(1)
 */
export function useAncestorMap(
  nodes: TreeNode[],
  nodeMap: Map<string, TreeNode>
): Map<string, string[]> {
  return useMemo(() => {
    const ancestorMap = new Map<string, string[]>()

    for (const node of nodes) {
      const ancestors: string[] = []
      let currentId = node.parent_id

      while (currentId) {
        ancestors.push(currentId)
        currentId = nodeMap.get(currentId)?.parent_id ?? null
      }

      ancestorMap.set(node.id, ancestors)
    }

    return ancestorMap
  }, [nodes, nodeMap])
}

/**
 * Creates a Set of all ancestor IDs for a given node
 * Useful for quick O(1) "is ancestor" checks
 */
export function useAncestorSet(
  nodeId: string | undefined,
  ancestorMap: Map<string, string[]>
): Set<string> {
  return useMemo(() => {
    if (!nodeId) return new Set()
    return new Set(ancestorMap.get(nodeId) || [])
  }, [nodeId, ancestorMap])
}

/**
 * Utility for creating ancestor map in non-hook contexts
 */
export function createAncestorMap(
  nodes: TreeNode[],
  nodeMap: Map<string, TreeNode>
): Map<string, string[]> {
  const ancestorMap = new Map<string, string[]>()

  for (const node of nodes) {
    const ancestors: string[] = []
    let currentId = node.parent_id

    while (currentId) {
      ancestors.push(currentId)
      currentId = nodeMap.get(currentId)?.parent_id ?? null
    }

    ancestorMap.set(node.id, ancestors)
  }

  return ancestorMap
}

/**
 * Checks if potentialAncestorId is an ancestor of nodeId
 * O(1) lookup when using ancestor map
 */
export function isAncestor(
  nodeId: string,
  potentialAncestorId: string,
  ancestorMap: Map<string, string[]>
): boolean {
  return ancestorMap.get(nodeId)?.includes(potentialAncestorId) ?? false
}

/**
 * Gets the depth of a node (distance from root)
 * O(1) lookup when using ancestor map
 */
export function getNodeDepth(
  nodeId: string,
  ancestorMap: Map<string, string[]>
): number {
  return ancestorMap.get(nodeId)?.length ?? 0
}
