'use client'

import { useCallback, useMemo } from 'react'
import { Label } from '@veritio/ui'
import { Input } from '@veritio/ui'
import { Button } from '@veritio/ui'
import { Textarea } from '@veritio/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { cn } from '@veritio/ui'
import type {
  ConstantSumQuestionConfig,
  ConstantSumItem,
  ConstantSumDisplayMode,
} from '../../../../../lib/supabase/study-flow-types'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDndSensors, useDragReorder } from '../hooks/use-sortable-options'
import { ToggleOptionRow } from '../toggle-option-row'

interface ConstantSumConfigProps {
  config: ConstantSumQuestionConfig
  onChange: (config: Partial<ConstantSumQuestionConfig>) => void
}

const MIN_ITEMS = 2
const MAX_ITEMS = 10

const DISPLAY_MODE_OPTIONS: { value: ConstantSumDisplayMode; label: string; description: string }[] = [
  { value: 'inputs', label: 'Number Inputs', description: 'Text fields for precise entry' },
  { value: 'sliders', label: 'Sliders', description: 'Visual sliders for quick allocation' },
]

function SortableItemRow({
  item,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  item: ConstantSumItem
  index: number
  onUpdate: (id: string, updates: Partial<ConstantSumItem>) => void
  onRemove: (id: string) => void
  canRemove: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start gap-2 rounded-lg border bg-background p-3',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="mt-2 cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Item number */}
      <span className="mt-2 w-6 text-center text-sm font-medium text-muted-foreground">
        {index + 1}
      </span>

      {/* Item inputs */}
      <div className="flex-1 space-y-2">
        <Input
          value={item.label}
          onChange={(e) => onUpdate(item.id, { label: e.target.value })}
          placeholder="Item label"
          className="h-9"
        />
        <Textarea
          value={item.description || ''}
          onChange={(e) => onUpdate(item.id, { description: e.target.value || undefined })}
          placeholder="Optional description"
          className="min-h-[60px] resize-none text-sm"
          rows={2}
        />
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="mt-1 h-8 w-8 shrink-0"
        onClick={() => onRemove(item.id)}
        disabled={!canRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function ConstantSumConfig({ config, onChange }: ConstantSumConfigProps) {
  const items = useMemo(() => config.items || [], [config.items])
  const totalPoints = config.totalPoints ?? 100
  const displayMode = config.displayMode ?? 'inputs'
  const randomOrder = config.randomOrder ?? false

  const sensors = useDndSensors()

  const handleDragEnd = useDragReorder({
    items,
    onReorder: (newItems) => onChange({ items: newItems }),
  })

  // Item management
  const addItem = useCallback(() => {
    if (items.length >= MAX_ITEMS) return
    const newItem: ConstantSumItem = {
      id: crypto.randomUUID(),
      label: '',
    }
    onChange({ items: [...items, newItem] })
  }, [items, onChange])

  const updateItem = useCallback(
    (id: string, updates: Partial<ConstantSumItem>) => {
      onChange({
        items: items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      })
    },
    [items, onChange]
  )

  const removeItem = useCallback(
    (id: string) => {
      if (items.length > MIN_ITEMS) {
        onChange({ items: items.filter((i) => i.id !== id) })
      }
    },
    [items, onChange]
  )

  const canRemove = items.length > MIN_ITEMS
  const canAdd = items.length < MAX_ITEMS

  return (
    <div className="space-y-6">
      {/* Total Points & Display Mode - Inline */}
      <div className="flex gap-6">
        <div className="space-y-2">
          <Label htmlFor="totalPoints">Total Points</Label>
          <Input
            id="totalPoints"
            type="number"
            min={10}
            max={1000}
            value={totalPoints}
            onChange={(e) => onChange({ totalPoints: Math.max(10, parseInt(e.target.value, 10) || 100) })}
            className="h-9 w-24"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayMode">Input Method</Label>
          <Select
            value={displayMode}
            onValueChange={(value) => onChange({ displayMode: value as ConstantSumDisplayMode })}
          >
            <SelectTrigger id="displayMode" className="h-9 w-40 text-left">
              <SelectValue placeholder="Select input method" />
            </SelectTrigger>
            <SelectContent>
              {DISPLAY_MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Items to Allocate */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Items ({items.length}/{MAX_ITEMS})</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Add items that participants will distribute {totalPoints} points across
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item, index) => (
                <SortableItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  onUpdate={updateItem}
                  onRemove={removeItem}
                  canRemove={canRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={!canAdd}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Display Options */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Display Options</Label>
        <ToggleOptionRow
          id="randomOrder"
          label="Randomize order"
          description="Present items in random order for each participant"
          checked={randomOrder}
          onCheckedChange={(checked) => onChange({ randomOrder: checked })}
        />
      </div>
    </div>
  )
}
