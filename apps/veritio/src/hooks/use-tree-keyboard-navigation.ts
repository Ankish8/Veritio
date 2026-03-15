'use client'

import { useCallback, useMemo, useState } from 'react'
import type { TreeNode } from '@veritio/study-types'
import { useNodeMap } from './use-node-map'
import { useTreeVisibleNodes } from './use-tree-visible-nodes'
import { useTreeNodeOperations } from './use-tree-node-operations'

export type TreeKeyboardMode = 'navigate' | 'edit' | 'move' | null

interface NodePosition {
  parentId: string | null
  position: number
}

interface UseTreeKeyboardNavigationProps {
  nodes: TreeNode[]
  expandedNodes: Set<string>
  editingNodeId: string | null
  onToggleExpand: (id: string) => void
  onStartEdit: (id: string) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
  onAddSibling: (nodeId: string) => void
  onMoveNode: (nodeId: string, newParentId: string | null, newPosition: number) => void
}

export function useTreeKeyboardNavigation({
  nodes,
  expandedNodes,
  editingNodeId,
  onToggleExpand,
  onStartEdit,
  onDelete,
  onAddChild,
  onAddSibling,
  onMoveNode,
}: UseTreeKeyboardNavigationProps) {
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [mode, setMode] = useState<TreeKeyboardMode>(null)
  const [savedPosition, setSavedPosition] = useState<NodePosition | null>(null)

  const nodeMap = useNodeMap(nodes)
  const visibleNodes = useTreeVisibleNodes(nodes, expandedNodes)
  const nodeOps = useTreeNodeOperations({ nodes, expandedNodes, onToggleExpand, onMoveNode })

  // O(1) index lookup for visible nodes (avoids repeated findIndex)
  const visibleIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    for (let i = 0; i < visibleNodes.length; i++) {
      map.set(visibleNodes[i].id, i)
    }
    return map
  }, [visibleNodes])

  // Navigation
  const navigateUp = useCallback(() => {
    if (!focusedNodeId) {
      if (visibleNodes.length > 0) setFocusedNodeId(visibleNodes[visibleNodes.length - 1].id)
      return
    }
    const idx = visibleIndexMap.get(focusedNodeId) ?? -1
    if (idx > 0) setFocusedNodeId(visibleNodes[idx - 1].id)
  }, [focusedNodeId, visibleNodes, visibleIndexMap])

  const navigateDown = useCallback(() => {
    if (!focusedNodeId) {
      if (visibleNodes.length > 0) setFocusedNodeId(visibleNodes[0].id)
      return
    }
    const idx = visibleIndexMap.get(focusedNodeId) ?? -1
    if (idx >= 0 && idx < visibleNodes.length - 1) setFocusedNodeId(visibleNodes[idx + 1].id)
  }, [focusedNodeId, visibleNodes, visibleIndexMap])

  const expandNode = useCallback(() => {
    if (focusedNodeId && !expandedNodes.has(focusedNodeId)) onToggleExpand(focusedNodeId)
  }, [focusedNodeId, expandedNodes, onToggleExpand])

  const collapseNode = useCallback(() => {
    if (focusedNodeId && expandedNodes.has(focusedNodeId)) onToggleExpand(focusedNodeId)
  }, [focusedNodeId, expandedNodes, onToggleExpand])

  // Move mode
  const startMoveMode = useCallback(() => {
    if (!focusedNodeId) return
    const node = nodeMap.get(focusedNodeId)
    if (!node) return
    setSavedPosition({ parentId: node.parent_id, position: node.position })
    setMode('move')
  }, [focusedNodeId, nodeMap])

  const exitMoveMode = useCallback((cancel: boolean = false) => {
    if (cancel && savedPosition && focusedNodeId) {
      onMoveNode(focusedNodeId, savedPosition.parentId, savedPosition.position)
    }
    setSavedPosition(null)
    setMode('navigate')
  }, [savedPosition, focusedNodeId, onMoveNode])

  // Edit mode
  const startEditMode = useCallback(() => {
    if (focusedNodeId) {
      setMode('edit')
      onStartEdit(focusedNodeId)
    }
  }, [focusedNodeId, onStartEdit])

  // Delete with focus transfer to nearest visible neighbor
  const deleteFocusedNode = useCallback(() => {
    if (!focusedNodeId) return
    const idx = visibleIndexMap.get(focusedNodeId) ?? -1
    let nextId: string | null = null
    if (idx >= 0 && idx < visibleNodes.length - 1) nextId = visibleNodes[idx + 1].id
    else if (idx > 0) nextId = visibleNodes[idx - 1].id
    onDelete(focusedNodeId)
    setFocusedNodeId(nextId)
  }, [focusedNodeId, visibleNodes, visibleIndexMap, onDelete])

  // Keyboard handler — move-mode and navigate-mode action maps
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

    // In edit mode, only intercept Tab for indent/outdent
    if (mode === 'edit' && isInput) {
      if (e.key === 'Tab' && focusedNodeId) {
        e.preventDefault()
        if (e.shiftKey) nodeOps.outdentNode(focusedNodeId)
        else nodeOps.indentNode(focusedNodeId)
      }
      return
    }

    if (isInput && mode !== 'move') return

    if (mode === 'move' && focusedNodeId) {
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); nodeOps.moveNodeUp(focusedNodeId); break
        case 'ArrowDown': e.preventDefault(); nodeOps.moveNodeDown(focusedNodeId); break
        case 'ArrowLeft': e.preventDefault(); nodeOps.outdentNode(focusedNodeId); break
        case 'ArrowRight': e.preventDefault(); nodeOps.indentNode(focusedNodeId); break
        case 'Enter': e.preventDefault(); exitMoveMode(false); break
        case 'Escape': e.preventDefault(); exitMoveMode(true); break
      }
    } else {
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); navigateUp(); break
        case 'ArrowDown': e.preventDefault(); navigateDown(); break
        case 'ArrowLeft': e.preventDefault(); collapseNode(); break
        case 'ArrowRight': e.preventDefault(); expandNode(); break
        case ' ': e.preventDefault(); startMoveMode(); break
        case 'Enter': e.preventDefault(); startEditMode(); break
        case 'Delete': case 'Backspace':
          if (!isInput) { e.preventDefault(); deleteFocusedNode() }
          break
        case 'Escape':
          e.preventDefault(); setFocusedNodeId(null); setMode(null)
          break
      }
    }
  }, [mode, focusedNodeId, nodeOps, navigateUp, navigateDown, expandNode, collapseNode, startMoveMode, startEditMode, exitMoveMode, deleteFocusedNode])

  const handleNodeClick = useCallback((nodeId: string) => {
    setFocusedNodeId(nodeId)
    if (mode === null) setMode('navigate')
  }, [mode])

  const handleTreeFocus = useCallback(() => {
    if (mode !== null) return
    setMode('navigate')
    if (!focusedNodeId && visibleNodes.length > 0) setFocusedNodeId(visibleNodes[0].id)
  }, [mode, focusedNodeId, visibleNodes])

  const handleTreeBlur = useCallback((e: React.FocusEvent) => {
    const related = e.relatedTarget as HTMLElement | null
    if ((!related || !e.currentTarget.contains(related)) && mode !== 'edit') setMode(null)
  }, [mode])

  const handleEditComplete = useCallback((action: 'save' | 'save-sibling' | 'save-child' | 'cancel') => {
    setMode('navigate')
    if (action === 'save-sibling' && focusedNodeId) onAddSibling(focusedNodeId)
    else if (action === 'save-child' && focusedNodeId) onAddChild(focusedNodeId)
  }, [focusedNodeId, onAddSibling, onAddChild])

  const syncedMode = useMemo(() => (mode === 'edit' && !editingNodeId) ? 'navigate' : mode, [mode, editingNodeId])

  return {
    focusedNodeId, mode: syncedMode, visibleNodes, setFocusedNodeId, setMode,
    handleKeyDown, handleNodeClick, handleTreeFocus, handleTreeBlur, handleEditComplete,
  }
}
