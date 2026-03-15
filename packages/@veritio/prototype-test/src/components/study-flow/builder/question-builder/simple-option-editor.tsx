'use client'

import { Input } from '@veritio/ui'
import { Button } from '@veritio/ui'
import { GripVertical, Trash2 } from 'lucide-react'
import { cn } from '@veritio/ui'
import type { ChoiceOption } from '../../../../lib/supabase/study-flow-types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SimpleOptionEditorProps {
  option: ChoiceOption
  index: number
  onUpdateLabel: (id: string, label: string) => void
  onDelete: (id: string) => void
  canDelete: boolean
  disabled?: boolean
}
export function SimpleOptionEditor({
  option,
  index,
  onUpdateLabel,
  onDelete,
  canDelete,
  disabled = false,
}: SimpleOptionEditorProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-background transition-colors hover:border-border',
        isDragging && 'opacity-50 shadow-lg',
        disabled && 'opacity-60'
      )}
    >
      {/* Drag Handle */}
      <button
        className={cn(
          'cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0',
          disabled && 'cursor-not-allowed'
        )}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Index Badge */}
      <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-medium shrink-0">
        {index + 1}
      </span>

      {/* Option Label Input */}
      <Input
        value={option.label}
        onChange={(e) => onUpdateLabel(option.id, e.target.value)}
        placeholder={`Option ${index + 1}`}
        className="flex-1 h-9"
        disabled={disabled}
      />

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(option.id)}
        disabled={!canDelete || disabled}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
export function StaticSimpleOptionEditor({
  option,
  index,
  onUpdateLabel,
  onDelete,
  canDelete,
  disabled = false,
}: SimpleOptionEditorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-background transition-colors hover:border-border',
        disabled && 'opacity-60'
      )}
    >
      {/* Index Badge */}
      <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-medium shrink-0">
        {index + 1}
      </span>

      {/* Option Label Input */}
      <Input
        value={option.label}
        onChange={(e) => onUpdateLabel(option.id, e.target.value)}
        placeholder={`Option ${index + 1}`}
        className="flex-1 h-9"
        disabled={disabled}
      />

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(option.id)}
        disabled={!canDelete || disabled}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
