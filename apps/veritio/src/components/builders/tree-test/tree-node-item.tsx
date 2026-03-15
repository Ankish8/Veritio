'use client'

import { memo, useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  FileText,
  Move,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PresenceBadge, PresenceRing } from '@/components/yjs'
import { useCollaborativeField } from '@veritio/yjs'
import type { TreeNode } from '@veritio/study-types'
import { cn } from '@/lib/utils'
import { ChildInputRow } from './tree-input-components'
import type { ChildInputState, TreeKeyboardState } from './tree-input-components'

export interface TreeNodeItemProps {
  node: TreeNode
  childrenMap: Map<string | null, TreeNode[]>
  studyId: string
  level: number
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
}

export const TreeNodeItem = memo(function TreeNodeItem({
  node,
  childrenMap,
  studyId,
  level,
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
}: TreeNodeItemProps) {
  const { addingChildToId, childInputValue, onChildInputChange, onChildInputSubmit, onChildInputCancel } = childInput
  const { focusedNodeId, keyboardMode, onNodeClick, onEditComplete } = keyboard
  const [editLabel, setEditLabel] = useState(node.label)

  // Collaborative presence
  const { hasPresence, primaryUser, users, wrapperProps } = useCollaborativeField({
    locationId: `${studyId}:tree-node:${node.id}`,
  })

  // Performance: O(1) lookup instead of O(n) filter, already sorted
  const children = childrenMap.get(node.id) || []
  const hasChildren = children.length > 0
  const isExpanded = expandedNodes.has(node.id)
  const isEditing = editingNodeId === node.id
  const isFocused = focusedNodeId === node.id
  const isMoving = isFocused && keyboardMode === 'move'

  const handleSave = (action: 'save' | 'save-sibling' | 'save-child' = 'save') => {
    if (editLabel.trim()) {
      onSaveEdit(node.id, editLabel.trim())
      onEditComplete?.(action)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        // Shift+Enter: Save and add child
        handleSave('save-child')
      } else {
        // Enter: Save and add sibling
        handleSave('save-sibling')
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditLabel(node.label) // Reset to original
      onCancelEdit()
      onEditComplete?.('cancel')
    }
  }

  const handleNodeClick = () => {
    onNodeClick?.(node.id)
  }

  return (
    <div>
      <div
        className={cn(
          'relative flex items-center gap-2 rounded-md border bg-background p-2 hover:bg-accent/50 transition-colors cursor-pointer',
          isEditing && 'bg-accent border-primary',
          isFocused && !isEditing && !isMoving && 'border-primary bg-accent/30',
          isMoving && 'bg-primary/10 border-primary border-dashed'
        )}
        style={{ marginLeft: `${level * 24}px` }}
        onClick={handleNodeClick}
        {...wrapperProps}
      >
        {/* Collaborative presence ring */}
        {hasPresence && primaryUser && (
          <PresenceRing color={primaryUser.color} className="rounded-md" />
        )}
        {/* Expand/Collapse button or leaf indicator */}
        {hasChildren ? (
          <button
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted shrink-0"
            onClick={() => onToggleExpand(node.id)}
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

        {/* Node content */}
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => handleSave('save')}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => {
              setEditLabel(node.label)
              onCancelEdit()
              onEditComplete?.('cancel')
            }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            {isMoving && (
              <Move className="h-4 w-4 text-primary shrink-0 animate-pulse" />
            )}
            <span className="flex-1 text-sm font-medium truncate">{node.label}</span>
            {/* Collaborative presence badge - inline to avoid ScrollArea clipping */}
            {hasPresence && primaryUser && (
              <PresenceBadge user={primaryUser} otherCount={users.length - 1} size="sm" position="inline" />
            )}
            {/* Actions - always visible */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onAddChild(node.id)}
                title="Add child node"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => {
                  setEditLabel(node.label)
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
                onClick={() => onDelete(node.id)}
                title="Delete node"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Children + Child Input */}
      {/* Show children area if: has children AND expanded, OR adding child to this node */}
      {((hasChildren && isExpanded) || addingChildToId === node.id) && (
        <div className="mt-1 space-y-1">
          {/* Children already sorted by position in childrenMap */}
          {children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              childrenMap={childrenMap}
              studyId={studyId}
              level={level + 1}
              expandedNodes={expandedNodes}
              editingNodeId={editingNodeId}
              onToggleExpand={onToggleExpand}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              childInput={childInput}
              keyboard={keyboard}
            />
          ))}

          {addingChildToId === node.id && (
            <ChildInputRow
              depth={level + 1}
              value={childInputValue}
              onChange={onChildInputChange}
              onSubmit={onChildInputSubmit}
              onCancel={onChildInputCancel}
            />
          )}
        </div>
      )}
    </div>
  )
})
