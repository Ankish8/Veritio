'use client'

import { useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { FirstImpressionDesign } from '@veritio/study-types/study-flow-types'
import { SortableDesignCard } from './sortable-design-card'

interface DesignListProps {
  studyId: string
  designs: FirstImpressionDesign[]
  onReorder: (designs: FirstImpressionDesign[]) => void
  onDelete: (designId: string) => void
  /** Show A/B weight controls - only when 2+ designs exist */
  showWeightControls?: boolean
}

export function DesignList({ studyId, designs, onReorder, onDelete, showWeightControls = false }: DesignListProps) {
  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Extract design IDs for SortableContext
  const designIds = useMemo(() => designs.map((d) => d.id), [designs])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = designs.findIndex((d) => d.id === active.id)
      const newIndex = designs.findIndex((d) => d.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(designs, oldIndex, newIndex)
        onReorder(reordered)
      }
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={designIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {designs.map((design, index) => (
            <SortableDesignCard
              key={design.id}
              design={design}
              designNumber={index + 1}
              studyId={studyId}
              onDelete={() => onDelete(design.id)}
              showWeightControls={showWeightControls}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
