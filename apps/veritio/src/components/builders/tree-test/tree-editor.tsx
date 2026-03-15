'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Upload,
  Download,
  Folder,
  Shuffle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import {
  useTreeTestNodes,
  useTreeTestExpandedNodes,
  useTreeTestSettings,
  useTreeTestActions,
} from '@/stores/study-builder'
import { TreeImportModal } from './tree-import-modal'
import { BuildWithAIButton } from '@/components/builders/shared/build-with-ai-button'
import { TreeNodeItem } from './tree-node-item'
import { VirtualizedTree } from './virtualized-tree'
import { RootNodeInput } from './tree-input-components'
import type { ChildInputState, TreeKeyboardState } from './tree-input-components'
import { useTreeKeyboardNavigation } from '@/hooks/use-tree-keyboard-navigation'
import { useChildrenMap } from '@/hooks'

// Use virtualized rendering for trees larger than this threshold
const VIRTUALIZATION_THRESHOLD = 150

interface TreeEditorProps {
  studyId: string
}

export function TreeEditor({ studyId }: TreeEditorProps) {
  // Use granular selectors for performance - each only subscribes to its slice
  const nodes = useTreeTestNodes()
  const expandedNodes = useTreeTestExpandedNodes()
  const settings = useTreeTestSettings()
  const {
    addNode,
    updateNode,
    removeNode,
    moveNode,
    toggleExpanded,
    expandAll,
    collapseAll,
    setSettings,
  } = useTreeTestActions()

  // Performance optimization: O(1) children lookups with pre-sorted results
  const childrenMap = useChildrenMap(nodes)

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const treeContainerRef = useRef<HTMLDivElement>(null)

  // Unified input state for both root and child nodes
  const [inputState, setInputState] = useState<{
    type: 'root' | 'child'
    parentId: string | null  // null for root nodes
    value: string
  } | null>(null)

  // Derived state for convenience
  const isAddingRoot = inputState?.type === 'root'
  const addingChildToId = inputState?.type === 'child' ? inputState.parentId : null

  // Get root nodes (nodes without parents) - already sorted in childrenMap
  const rootNodes = useMemo(
    () => childrenMap.get(null) || [],
    [childrenMap]
  )

  // Unified handler for adding any node (root or child)
  const handleAddNode = useCallback(() => {
    if (!inputState?.value?.trim()) return

    const siblings = inputState.parentId
      ? nodes.filter((n) => n.parent_id === inputState.parentId)
      : rootNodes

    const newNodeId = addNode({
      study_id: studyId,
      label: inputState.value.trim(),
      parent_id: inputState.parentId,
      position: siblings.length,
      path: null,
    })

    // Auto-show child input for the newly added node
    setInputState({
      type: 'child',
      parentId: newNodeId,
      value: '',
    })
  }, [inputState, nodes, rootNodes, addNode, studyId])

  // Start adding a child to a specific node
  const handleStartAddChild = useCallback((parentId: string) => {
    // Ensure parent is expanded
    if (!expandedNodes.has(parentId)) {
      toggleExpanded(parentId)
    }
    setInputState({
      type: 'child',
      parentId,
      value: '',
    })
  }, [expandedNodes, toggleExpanded])

  // Start adding a new root node
  const handleStartAddRoot = useCallback(() => {
    setInputState({
      type: 'root',
      parentId: null,
      value: '',
    })
  }, [])

  // Cancel current input
  const handleCancelInput = useCallback(() => {
    setInputState(null)
  }, [])

  // Handle input value change
  const handleInputChange = useCallback((value: string) => {
    setInputState((prev) => prev ? { ...prev, value } : prev)
  }, [])

  // Handle keyboard events for input
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputState?.value?.trim()) {
      handleAddNode()
    } else if (e.key === 'Escape') {
      handleCancelInput()
    }
  }, [inputState, handleAddNode, handleCancelInput])

  const handleSaveEdit = useCallback((id: string, label: string) => {
    updateNode(id, { label })
    setEditingNodeId(null)
  }, [updateNode])

  const handleDelete = useCallback((id: string) => {
    removeNode(id)
  }, [removeNode])

  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null)
  }, [])

  // Add sibling after the specified node
  const handleAddSibling = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    // Show input for adding sibling
    if (node.parent_id) {
      // For non-root nodes, expand parent and show child input
      if (!expandedNodes.has(node.parent_id)) {
        toggleExpanded(node.parent_id)
      }
      setInputState({
        type: 'child',
        parentId: node.parent_id,
        value: '',
      })
    } else {
      // For root nodes, show root input
      setInputState({
        type: 'root',
        parentId: null,
        value: '',
      })
    }
  }, [nodes, expandedNodes, toggleExpanded])

  // Keyboard navigation hook
  const keyboardNav = useTreeKeyboardNavigation({
    nodes,
    expandedNodes,
    editingNodeId,
    onToggleExpand: toggleExpanded,
    onStartEdit: setEditingNodeId,
    onDelete: handleDelete,
    onAddChild: handleStartAddChild,
    onAddSibling: handleAddSibling,
    onMoveNode: moveNode,
  })

  // Memoized grouped props — prevents TreeNodeItem re-renders from new object refs
  const childInputValue = inputState?.value ?? ''
  const childInput: ChildInputState = useMemo(() => ({
    addingChildToId,
    childInputValue,
    onChildInputChange: handleInputChange,
    onChildInputSubmit: handleAddNode,
    onChildInputCancel: handleCancelInput,
  }), [addingChildToId, childInputValue, handleInputChange, handleAddNode, handleCancelInput])

  const keyboardState: TreeKeyboardState = useMemo(() => ({
    focusedNodeId: keyboardNav.focusedNodeId,
    keyboardMode: keyboardNav.mode,
    onNodeClick: keyboardNav.handleNodeClick,
    onEditComplete: keyboardNav.handleEditComplete,
  }), [keyboardNav.focusedNodeId, keyboardNav.mode, keyboardNav.handleNodeClick, keyboardNav.handleEditComplete])

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Header with title and toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tree</h2>
        <div className="flex items-center gap-1">
          {nodes.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={expandAll}
                title="Expand all"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={collapseAll}
                title="Collapse all"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
            </>
          )}
          {/* Randomize tree order toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-2">
                <Checkbox
                  id="randomize-tree-toolbar"
                  checked={settings.randomizeTasks}
                  onCheckedChange={(checked) =>
                    setSettings({ randomizeTasks: checked === true })
                  }
                />
                <Label
                  htmlFor="randomize-tree-toolbar"
                  className="text-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Shuffle className="h-3.5 w-3.5 text-muted-foreground" />
                  Randomize
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Present tree items in a random order to each participant</p>
            </TooltipContent>
          </Tooltip>
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => setImportModalOpen(true)}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            Import
          </Button>
          {nodes.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                // Export handled via modal
                setImportModalOpen(true)
              }}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
          )}
          <div className="w-px h-5 bg-border mx-1" />
          <BuildWithAIButton studyType="tree_test" />
        </div>
      </div>

      {/* Tree content */}
      {nodes.length > 0 ? (
        nodes.length > VIRTUALIZATION_THRESHOLD ? (
          // Virtualized tree for large datasets (150+ nodes)
          <div
            ref={treeContainerRef}
            className="outline-none"
            tabIndex={0}
            onKeyDown={keyboardNav.handleKeyDown}
            onFocus={keyboardNav.handleTreeFocus}
            onBlur={keyboardNav.handleTreeBlur}
          >
            <VirtualizedTree
              nodes={nodes}
              studyId={studyId}
              expandedNodes={expandedNodes}
              editingNodeId={editingNodeId}
              onToggleExpand={toggleExpanded}
              onStartEdit={setEditingNodeId}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleSaveEdit}
              onDelete={handleDelete}
              onAddChild={handleStartAddChild}
              childInput={childInput}
              keyboard={keyboardState}
              height={400}
            />
            <RootNodeInput
              isAdding={isAddingRoot}
              value={inputState?.value ?? ''}
              onValueChange={handleInputChange}
              onSubmit={handleAddNode}
              onCancel={handleCancelInput}
              onStartAdd={handleStartAddRoot}
              onKeyDown={handleInputKeyDown}
              className="mt-1"
            />
          </div>
        ) : (
          // Standard recursive tree for small datasets
          <ScrollArea className="flex-1 min-h-0 pr-2">
            <div
              ref={treeContainerRef}
              className="space-y-1 outline-none p-[3px]"
              tabIndex={0}
              onKeyDown={keyboardNav.handleKeyDown}
              onFocus={keyboardNav.handleTreeFocus}
              onBlur={keyboardNav.handleTreeBlur}
            >
              {rootNodes.map((node) => (
                <TreeNodeItem
                  key={node.id}
                  node={node}
                  childrenMap={childrenMap}
                  studyId={studyId}
                  level={0}
                  expandedNodes={expandedNodes}
                  editingNodeId={editingNodeId}
                  onToggleExpand={toggleExpanded}
                  onStartEdit={setEditingNodeId}
                  onCancelEdit={handleCancelEdit}
                  onSaveEdit={handleSaveEdit}
                  onDelete={handleDelete}
                  onAddChild={handleStartAddChild}
                  childInput={childInput}
                  keyboard={keyboardState}
                />
              ))}
            </div>
            <div className="sticky bottom-0 bg-background pt-1">
              <RootNodeInput
                isAdding={isAddingRoot}
                value={inputState?.value ?? ''}
                onValueChange={handleInputChange}
                onSubmit={handleAddNode}
                onCancel={handleCancelInput}
                onStartAdd={handleStartAddRoot}
                onKeyDown={handleInputKeyDown}
              />
            </div>
          </ScrollArea>
        )
      ) : (
        /* Empty state - immediate input */
        <div className="rounded-md border p-4">
          <div className="space-y-2">
            {/* Home indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Folder className="h-4 w-4" />
              <span>Home</span>
            </div>
            {/* Immediate input for first node */}
            <div className="ml-6">
              <div className="flex items-center gap-2">
                <Input
                  value={inputState?.value ?? ''}
                  onChange={(e) => setInputState({ type: 'root', parentId: null, value: e.target.value })}
                  placeholder="Enter first category..."
                  className="h-9"
                  autoFocus
                  onKeyDown={handleInputKeyDown}
                />
                <Button
                  size="sm"
                  className="h-9"
                  onClick={handleAddNode}
                  disabled={!inputState?.value?.trim()}
                >
                  Add
                  <KeyboardShortcutHint shortcut="enter" variant="dark" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter to add your first category
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <TreeImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        studyId={studyId}
      />
    </div>
  )
}
