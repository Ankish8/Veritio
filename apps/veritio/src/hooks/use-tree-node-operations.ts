'use client'

import { useCallback } from 'react'
import type { TreeNode } from '@veritio/study-types'
import { useNodeMap, useChildrenMap } from './use-node-map'

interface UseTreeNodeOperationsProps {
  nodes: TreeNode[]
  expandedNodes: Set<string>
  onToggleExpand: (id: string) => void
  onMoveNode: (nodeId: string, newParentId: string | null, newPosition: number) => void
}

/** Provides tree node move/indent/outdent operations using O(1) map lookups. */
export function useTreeNodeOperations({
  nodes,
  expandedNodes,
  onToggleExpand,
  onMoveNode,
}: UseTreeNodeOperationsProps) {
  const nodeMap = useNodeMap(nodes)
  const childrenMap = useChildrenMap(nodes)

  const getSiblings = useCallback((nodeId: string): TreeNode[] => {
    const node = nodeMap.get(nodeId)
    if (!node) return []
    return childrenMap.get(node.parent_id) || []
  }, [nodeMap, childrenMap])

  const getPreviousSibling = useCallback((nodeId: string): TreeNode | null => {
    const siblings = getSiblings(nodeId)
    const idx = siblings.findIndex((n) => n.id === nodeId)
    return idx > 0 ? siblings[idx - 1] : null
  }, [getSiblings])

  const getNextSibling = useCallback((nodeId: string): TreeNode | null => {
    const siblings = getSiblings(nodeId)
    const idx = siblings.findIndex((n) => n.id === nodeId)
    return idx < siblings.length - 1 ? siblings[idx + 1] : null
  }, [getSiblings])

  const moveNodeUp = useCallback((nodeId: string) => {
    const node = nodeMap.get(nodeId)
    if (!node) return
    const prevSibling = getPreviousSibling(nodeId)
    if (prevSibling) onMoveNode(nodeId, node.parent_id, prevSibling.position)
  }, [nodeMap, getPreviousSibling, onMoveNode])

  const moveNodeDown = useCallback((nodeId: string) => {
    const node = nodeMap.get(nodeId)
    if (!node) return
    const nextSibling = getNextSibling(nodeId)
    if (nextSibling) onMoveNode(nodeId, node.parent_id, nextSibling.position)
  }, [nodeMap, getNextSibling, onMoveNode])

  const indentNode = useCallback((nodeId: string) => {
    const node = nodeMap.get(nodeId)
    if (!node) return
    const prevSibling = getPreviousSibling(nodeId)
    if (prevSibling) {
      const prevChildren = childrenMap.get(prevSibling.id) || []
      onMoveNode(nodeId, prevSibling.id, prevChildren.length)
      if (!expandedNodes.has(prevSibling.id)) onToggleExpand(prevSibling.id)
    }
  }, [nodeMap, childrenMap, getPreviousSibling, onMoveNode, expandedNodes, onToggleExpand])

  const outdentNode = useCallback((nodeId: string) => {
    const node = nodeMap.get(nodeId)
    if (!node || !node.parent_id) return
    const parent = nodeMap.get(node.parent_id)
    if (!parent) return
    const parentSiblings = childrenMap.get(parent.parent_id) || []
    const parentIdx = parentSiblings.findIndex((n) => n.id === parent.id)
    onMoveNode(nodeId, parent.parent_id, parentIdx + 1)
  }, [nodeMap, childrenMap, onMoveNode])

  return {
    getSiblings,
    getPreviousSibling,
    getNextSibling,
    moveNodeUp,
    moveNodeDown,
    indentNode,
    outdentNode,
  }
}
