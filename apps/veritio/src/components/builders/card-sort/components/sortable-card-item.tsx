'use client'

import { memo, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2, ImageIcon, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PresenceBadge, PresenceRing } from '@/components/yjs'
import { useValidationHighlight } from '@/hooks/use-validation-highlight'
import { useCollaborativeField } from '@veritio/yjs'
import { useCardSortSettings } from '@/stores/study-builder'
import { uploadCardImage, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZES } from '@/lib/supabase/storage'
import type { CardWithImage, CardImage } from '@veritio/study-types'

interface SortableCardItemProps {
  card: CardWithImage
  studyId: string
  isSelected?: boolean
  onSelect?: () => void
  onEdit: (card: CardWithImage) => void
  onDelete: (id: string) => void
  onImageUpdate: (cardId: string, image: CardImage | null) => void
}

export const SortableCardItem = memo(function SortableCardItem({ card, studyId, isSelected, onSelect, onEdit, onDelete, onImageUpdate }: SortableCardItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const settings = useCardSortSettings()
  const showImages = settings.showCardImages ?? true

  const { hasPresence, primaryUser, users, wrapperProps } = useCollaborativeField({
    locationId: `${studyId}:card:${card.id}`,
  })

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const { ref: highlightRef, highlightClassName } = useValidationHighlight(card.id)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return
    }

    if (file.size > MAX_FILE_SIZES.cardImage) {
      return
    }

    setIsUploading(true)
    try {
      const result = await uploadCardImage(studyId, card.id, file)
      onImageUpdate(card.id, {
        url: result.url,
        filename: result.filename,
      })
    } catch {
      // silently fail, user can retry
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div
      ref={(node) => {
        setNodeRef(node)
        ;(highlightRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      }}
      style={style}
      data-item-id={card.id}
      onClick={onSelect}
      className={`relative flex items-center gap-2 rounded-md border bg-background p-3 cursor-pointer transition-all ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      } ${
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'hover:border-muted-foreground/50'
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
      {showImages && (
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      {showImages && (
        <button
          type="button"
          onClick={handleImageClick}
          disabled={isUploading}
          className={`
            h-10 w-10 rounded border flex-shrink-0 overflow-hidden
            transition-all duration-150 ease-out
            cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1
            ${card.image?.url
              ? 'hover:ring-2 hover:ring-ring hover:ring-offset-1 hover:opacity-90'
              : 'border-dashed bg-muted/50 hover:bg-muted hover:border-muted-foreground/50'
            }
            ${isUploading ? 'opacity-50 cursor-wait' : ''}
          `}
          title={card.image?.url ? 'Click to change image' : 'Click to add image'}
        >
          {isUploading ? (
            <div className="h-full w-full flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : card.image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.image.url}
              alt={card.image.alt || card.label}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{card.label}</p>
        {(settings.showCardDescriptions ?? true) && card.description && (
          <p className="text-sm text-muted-foreground truncate">{card.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(card)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(card.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
})
