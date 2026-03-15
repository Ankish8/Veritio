'use client'

import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2, FolderOpen } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PresenceBadge, PresenceRing } from '@/components/yjs'
import { useValidationHighlight } from '@/hooks/use-validation-highlight'
import { useCollaborativeField } from '@veritio/yjs'
import type { Category } from '@veritio/study-types'

interface SortableCategoryItemProps {
  category: Category
  studyId: string
  showDescription?: boolean
  onEdit: (category: Category) => void
  onDelete: (id: string) => void
}

export const SortableCategoryItem = memo(function SortableCategoryItem({ category, studyId, showDescription, onEdit, onDelete }: SortableCategoryItemProps) {
  const { hasPresence, primaryUser, users, wrapperProps } = useCollaborativeField({
    locationId: `${studyId}:category:${category.id}`,
  })

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const { ref: highlightRef, highlightClassName } = useValidationHighlight(category.id)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={(node) => {
        setNodeRef(node)
        // eslint-disable-next-line react-hooks/immutability
        ;(highlightRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      }}
      style={style}
      data-item-id={category.id}
      className={`relative flex items-center gap-2 rounded-md border bg-background p-3 ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      } ${highlightClassName}`}
      {...wrapperProps}
    >
      {hasPresence && primaryUser && (
        <>
          <PresenceRing color={primaryUser.color} className="rounded-md" />
          <PresenceBadge user={primaryUser} otherCount={users.length - 1} size="sm" />
        </>
      )}
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{category.label}</p>
        {showDescription && category.description && (
          <p className="text-sm text-muted-foreground truncate">{category.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(category)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(category.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
})
