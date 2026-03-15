'use client'

import { useMemo, useRef, memo, useState, useEffect, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Move,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TreeNode } from '@veritio/study-types'
import { cn } from '@/lib/utils'
import { useChildrenMap } from '@/hooks'
import { ChildInputRow } from './tree-input-components'
import type { ChildInputState, TreeKeyboardState } from './tree-input-components'
import type { TreeKeyboardMode } from '@/hooks/use-tree-keyboard-navigation'

// ============================================================================
// Types
// ============================================================================

interface FlattenedNode {
  node: TreeNode
  depth: number
  isExpanded: boolean
  hasChildren: boolean
  isLastChild: boolean
}

export interface VirtualizedTreeProps {
  nodes: TreeNode[]
  studyId: string
  expandedNodes: Set<string>
  editingNodeId: string | null
  onToggleExpand: (id: string) => void
  onStartEdit: (id: string) => void
  onCancelEdit: () => void
  onSaveEdit: (id: string, label: string) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
  childInput: ChildInputState
  keyboard: TreeKeyboardState
  height?: number
}

// ============================================================================
// Flatten Tree Helper
// ============================================================================

function flattenVisibleNodes(
  childrenMap: Map<string | null, TreeNode[]>,
  expandedNodes: Set<string>,
  _addingChildToId: string | null  
): FlattenedNode[] {
  const result: FlattenedNode[] = []

  function traverse(parentId: string | null, depth: number) {
    const children = childrenMap.get(parentId) || []

    children.forEach((node, index) => {
      const nodeChildren = childrenMap.get(node.id) || []
      const hasChildren = nodeChildren.length > 0
      const isExpanded = expandedNodes.has(node.id)
      const isLastChild = index === children.length - 1

      result.push({
        node,
        depth,
        isExpanded,
        hasChildren,
        isLastChild,
      })

      if (isExpanded && hasChildren) {
        traverse(node.id, depth + 1)
      }
    })
  }

  traverse(null, 0)
  return result
}

// ============================================================================
// Virtual Row Component
// ============================================================================

interface VirtualRowProps {
  flatNode: FlattenedNode
  editingNodeId: string | null
  editLabel: string
  onEditLabelChange: (value: string) => void
  onToggleExpand: (id: string) => void
  onStartEdit: (id: string) => void
  onCancelEdit: () => void
  onSaveEdit: (id: string, action?: 'save' | 'save-sibling' | 'save-child') => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
  focusedNodeId?: string | null
  keyboardMode?: TreeKeyboardMode
  onNodeClick?: (nodeId: string) => void
}

const VirtualRow = memo(function VirtualRow({
  flatNode,
  editingNodeId,
  editLabel,
  onEditLabelChange,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onAddChild,
  focusedNodeId,
  keyboardMode,
  onNodeClick,
}: VirtualRowProps) {
  const { node, depth, isExpanded, hasChildren } = flatNode
  const isEditing = editingNodeId === node.id
  const isFocused = focusedNodeId === node.id
  const isMoving = isFocused && keyboardMode === 'move'

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        onSaveEdit(node.id, 'save-child')
      } else {
        onSaveEdit(node.id, 'save-sibling')
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancelEdit()
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border bg-background p-2 hover:bg-accent/50 transition-colors cursor-pointer',
        isEditing && 'bg-accent border-primary',
        isFocused && !isEditing && !isMoving && 'border-primary bg-accent/30',
        isMoving && 'bg-primary/10 border-primary border-dashed'
      )}
      style={{ marginLeft: `${depth * 24}px` }}
      onClick={() => onNodeClick?.(node.id)}
    >
      {hasChildren ? (
        <button
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand(node.id)
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ) : (
        <div className="h-7 w-7 flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={editLabel}
            onChange={(e) => onEditLabelChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9"
            autoFocus
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onSaveEdit(node.id, 'save')
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          {isMoving && (
            <Move className="h-4 w-4 text-primary shrink-0 animate-pulse" />
          )}
          <span className="flex-1 text-sm font-medium truncate">{node.label}</span>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                onAddChild(node.id)
              }}
              title="Add child node"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                onStartEdit(node.id)
              }}
              title="Edit node"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(node.id)
              }}
              title="Delete node"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
})

// ============================================================================
// Main Component
// ============================================================================

export function VirtualizedTree({
  nodes,
  expandedNodes,
  editingNodeId,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onAddChild,
  childInput,
  keyboard,
  height = 400,
}: VirtualizedTreeProps) {
  const { addingChildToId, childInputValue, onChildInputChange, onChildInputSubmit, onChildInputCancel } = childInput
  const { focusedNodeId, keyboardMode, onNodeClick, onEditComplete } = keyboard
  const parentRef = useRef<HTMLDivElement>(null)

  const childrenMap = useChildrenMap(nodes)

  const flatNodes = useMemo(
    () => flattenVisibleNodes(childrenMap, expandedNodes, addingChildToId),
    [childrenMap, expandedNodes, addingChildToId]
  )

  const [editLabel, setEditLabel] = useState('')

  useEffect(() => {
    if (editingNodeId) {
      const editingNode = nodes.find(n => n.id === editingNodeId)
      setEditLabel(editingNode?.label || '')
    }
  }, [editingNodeId, nodes])

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: flatNodes.length + (addingChildToId ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 5,
  })

  const addingChildIndex = useMemo(() => {
    if (!addingChildToId) return -1
    let lastIndex = flatNodes.findIndex(f => f.node.id === addingChildToId)
    if (lastIndex === -1) return flatNodes.length

    const addingNodeDepth = flatNodes[lastIndex].depth
    for (let i = lastIndex + 1; i < flatNodes.length; i++) {
      if (flatNodes[i].depth <= addingNodeDepth) break
      lastIndex = i
    }
    return lastIndex + 1
  }, [flatNodes, addingChildToId])

  const handleSaveEdit = useCallback((id: string, action: 'save' | 'save-sibling' | 'save-child' = 'save') => {
    onSaveEdit(id, editLabel)
    onEditComplete?.(action)
  }, [onSaveEdit, editLabel, onEditComplete])

  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ height }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const isInputRow = addingChildToId && virtualItem.index === addingChildIndex
          const flatNodeIndex = addingChildToId && virtualItem.index > addingChildIndex
            ? virtualItem.index - 1
            : virtualItem.index

          if (isInputRow) {
            const parentNode = flatNodes.find(f => f.node.id === addingChildToId)
            const inputDepth = parentNode ? parentNode.depth + 1 : 0

            return (
              <div
                key="child-input"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <ChildInputRow
                  depth={inputDepth}
                  value={childInputValue}
                  onChange={onChildInputChange}
                  onSubmit={onChildInputSubmit}
                  onCancel={onChildInputCancel}
                />
              </div>
            )
          }

          const flatNode = flatNodes[flatNodeIndex]
          if (!flatNode) return null

          return (
            <div
              key={flatNode.node.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <VirtualRow
                flatNode={flatNode}
                editingNodeId={editingNodeId}
                editLabel={editLabel}
                onEditLabelChange={setEditLabel}
                onToggleExpand={onToggleExpand}
                onStartEdit={onStartEdit}
                onCancelEdit={onCancelEdit}
                onSaveEdit={handleSaveEdit}
                onDelete={onDelete}
                onAddChild={onAddChild}
                focusedNodeId={focusedNodeId}
                keyboardMode={keyboardMode}
                onNodeClick={onNodeClick}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
