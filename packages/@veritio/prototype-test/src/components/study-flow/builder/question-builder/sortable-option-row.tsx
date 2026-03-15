'use client'

import { Input } from '@veritio/ui'
import { Button } from '@veritio/ui'
import { GripVertical, Trash2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ChoiceOption } from '../../../../lib/supabase/study-flow-types'

interface SortableOptionRowProps {
  option: ChoiceOption
  onUpdate: (id: string, label: string) => void
  onRemove: (id: string) => void
  canRemove: boolean
  placeholder?: string
  disabled?: boolean
  index?: number
}
export function SortableOptionRow({
  option,
  onUpdate,
  onRemove,
  canRemove,
  placeholder = 'Option label',
  disabled = false,
  index,
}: SortableOptionRowProps) {
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
      className={`flex items-center gap-2 ${isDragging ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {index !== undefined && (
        <span className="w-6 text-center text-sm text-muted-foreground">{index + 1}</span>
      )}
      <Input
        value={option.label}
        onChange={(e) => onUpdate(option.id, e.target.value)}
        placeholder={placeholder}
        className="flex-1"
        disabled={disabled}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onRemove(option.id)}
        disabled={!canRemove || disabled}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
