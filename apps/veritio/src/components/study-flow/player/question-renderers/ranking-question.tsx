'use client'

import { useMemo, useEffect, useRef } from 'react'
import { GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import type {
  RankingQuestionConfig,
  RankingResponseValue,
  ResponseValue,
} from '@veritio/study-types/study-flow-types'

interface RankingRendererProps {
  config: RankingQuestionConfig
  value: ResponseValue | undefined
  onChange: (value: RankingResponseValue) => void
}

function SortableItem({
  id,
  label,
  rank,
}: {
  id: string
  label: string
  rank: number
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-background p-3',
        isDragging ? 'opacity-50 shadow-lg' : ''
      )}
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
        {rank}
      </span>
      <span className="flex-1">{label}</span>
    </div>
  )
}

export function RankingRenderer({ config, value, onChange }: RankingRendererProps) {
  const rankingConfig = config as RankingQuestionConfig
  const hasInitialized = useRef(false)

  // Wrap in useMemo to stabilize references
  const rankingItems = useMemo(() => rankingConfig.items ?? [], [rankingConfig.items])
  const currentValue = useMemo(() => (value as RankingResponseValue) || [], [value])

  // Compute ordered items without side effects
  const orderedItems = useMemo(() => {
    if (currentValue.length > 0) {
      // Return items in the order specified by currentValue
      return currentValue
        .map((id) => rankingItems.find((item) => item.id === id))
        .filter(Boolean)
    }

    // Initial order - randomize if configured
    const items = [...rankingItems]
    if (rankingConfig.randomOrder) {
      items.sort(() => Math.random() - 0.5) // eslint-disable-line react-hooks/purity
    }
    return items
  }, [currentValue, rankingItems, rankingConfig.randomOrder])

  // Initialize value in useEffect (after render) to avoid setState during render
  useEffect(() => {
    if (currentValue.length === 0 && rankingItems.length > 0 && !hasInitialized.current) {
      hasInitialized.current = true
      const items = [...rankingItems]
      if (rankingConfig.randomOrder) {
        items.sort(() => Math.random() - 0.5)
      }
      onChange(items.map((item) => item.id))
    }
  }, [currentValue.length, rankingItems, rankingConfig.randomOrder, onChange])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = currentValue.indexOf(active.id as string)
      const newIndex = currentValue.indexOf(over.id as string)

      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove(currentValue, oldIndex, newIndex))
      }
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Drag and drop to rank items in order of preference (1 = most preferred)
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={currentValue}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {orderedItems.map((item, index) => (
              item && (
                <SortableItem
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  rank={index + 1}
                />
              )
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
