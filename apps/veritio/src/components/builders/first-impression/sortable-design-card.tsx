'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DesignCard } from './design-card'
import type { FirstImpressionDesign } from '@veritio/study-types/study-flow-types'

interface SortableDesignCardProps {
  design: FirstImpressionDesign
  designNumber: number
  studyId: string
  onDelete: () => void
  /** Show A/B weight controls - only when 2+ designs exist */
  showWeightControls?: boolean
}

export function SortableDesignCard({
  design,
  designNumber,
  studyId,
  onDelete,
  showWeightControls = false,
}: SortableDesignCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: design.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <DesignCard
        design={design}
        designNumber={designNumber}
        studyId={studyId}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        showWeightControls={showWeightControls}
      />
    </div>
  )
}
