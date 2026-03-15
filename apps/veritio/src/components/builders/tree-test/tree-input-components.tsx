'use client'

import { memo } from 'react'
import { Folder, FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import type { TreeKeyboardMode } from '@/hooks/use-tree-keyboard-navigation'

// ============================================================================
// Grouped Prop Types
// ============================================================================

export interface ChildInputState {
  addingChildToId: string | null
  childInputValue: string
  onChildInputChange: (value: string) => void
  onChildInputSubmit: () => void
  onChildInputCancel: () => void
}

export interface TreeKeyboardState {
  focusedNodeId?: string | null
  keyboardMode?: TreeKeyboardMode
  onNodeClick?: (nodeId: string) => void
  onEditComplete?: (action: 'save' | 'save-sibling' | 'save-child' | 'cancel') => void
}

// ============================================================================
// Root Node Input
// ============================================================================

interface RootNodeInputProps {
  isAdding: boolean
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  onStartAdd: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  className?: string
}

export const RootNodeInput = memo(function RootNodeInput({
  isAdding,
  value,
  onValueChange,
  onSubmit,
  onCancel,
  onStartAdd,
  onKeyDown,
  className,
}: RootNodeInputProps) {
  if (isAdding) {
    return (
      <div className={`flex items-center gap-2 rounded-md border border-dashed bg-muted/50 p-2 ${className ?? ''}`}>
        <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Enter root node name"
          className="h-9"
          autoFocus
          onKeyDown={onKeyDown}
        />
        <Button
          size="sm"
          className="h-9"
          onClick={onSubmit}
          disabled={!value.trim()}
        >
          Add
          <KeyboardShortcutHint shortcut="enter" variant="dark" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-9"
          onClick={onCancel}
        >
          Cancel
          <EscapeHint />
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      className={`w-full h-9 justify-start border-dashed text-muted-foreground hover:text-foreground hover:border-solid ${className ?? ''}`}
      onClick={onStartAdd}
    >
      <Plus className="mr-2 h-4 w-4" />
      Add root node
    </Button>
  )
})

// ============================================================================
// Child Input Row
// ============================================================================

export interface ChildInputRowProps {
  depth: number
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export const ChildInputRow = memo(function ChildInputRow({
  depth,
  value,
  onChange,
  onSubmit,
  onCancel,
}: ChildInputRowProps) {
  return (
    <div
      className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-dashed"
      style={{ marginLeft: `${depth * 24}px` }}
    >
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter node name"
        className="h-9"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit()
          if (e.key === 'Escape') onCancel()
        }}
      />
      <Button
        size="sm"
        className="h-9"
        onClick={onSubmit}
        disabled={!value.trim()}
      >
        Add
        <KeyboardShortcutHint shortcut="enter" variant="dark" />
      </Button>
      <Button size="sm" variant="ghost" className="h-9" onClick={onCancel}>
        Cancel
        <EscapeHint />
      </Button>
    </div>
  )
})
