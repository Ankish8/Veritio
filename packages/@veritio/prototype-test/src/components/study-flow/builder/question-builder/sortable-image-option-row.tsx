/**
 * @fileoverview Sortable Image Option Row Component
 *
 * A drag-and-drop option row for image choice questions in the survey builder.
 * Combines image upload functionality with sortable list behavior.
 *
 * @usage
 * ```tsx
 * <SortableImageOptionRow
 *   option={{ id: 'opt1', label: 'Design A', imageUrl: '...', imageFilename: 'design.png' }}
 *   onUpdate={(id, updates) => handleUpdate(id, updates)}
 *   onRemove={(id) => handleRemove(id)}
 *   onUploadImage={(id, file) => handleUpload(id, file)}
 *   onDeleteImage={(id) => handleDelete(id)}
 *   canRemove={options.length > 2}
 * />
 * ```
 *
 * @features
 * - Drag handle for reordering via dnd-kit
 * - Compact image upload with preview (12x12 thumbnail)
 * - Label input (used for alt text generation)
 * - Visual warning when image is missing
 * - File validation (type, size)
 * - Delete button with minimum options guard
 *
 * @props
 * - option: ImageChoiceOption - The option data
 * - onUpdate: (id, updates) => void - Update option properties
 * - onRemove: (id) => void - Remove option from list
 * - onUploadImage: (id, file) => Promise<void> - Upload image for option
 * - onDeleteImage: (id) => Promise<void> - Delete option's image
 * - canRemove: boolean - Whether deletion is allowed
 * - disabled?: boolean - Disable all interactions
 */
'use client'

import { useState, useCallback } from 'react'
import { Input } from '@veritio/ui'
import { Button } from '@veritio/ui'
import { GripVertical, Trash2, Upload, X, Loader2, ImageIcon, AlertCircle } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ImageChoiceOption } from '../../../../lib/supabase/study-flow-types'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZES,
  formatFileSize,
} from '@veritio/prototype-test/lib/supabase/storage'
import { cn } from '@veritio/ui'

interface SortableImageOptionRowProps {
  option: ImageChoiceOption
  onUpdate: (id: string, updates: Partial<ImageChoiceOption>) => void
  onRemove: (id: string) => void
  onUploadImage: (id: string, file: File) => Promise<unknown>
  onDeleteImage: (id: string) => Promise<void>
  canRemove: boolean
  disabled?: boolean
}
export function SortableImageOptionRow({
  option,
  onUpdate,
  onRemove,
  onUploadImage,
  onDeleteImage,
  canRemove,
  disabled = false,
}: SortableImageOptionRowProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

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

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Validate file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
        setUploadError('Invalid file type. Use PNG, JPG, GIF, or WebP.')
        return
      }

      // Validate file size (2MB for option images)
      if (file.size > MAX_FILE_SIZES.cardImage) {
        setUploadError(`File too large. Max ${formatFileSize(MAX_FILE_SIZES.cardImage)}.`)
        return
      }

      setIsUploading(true)
      setUploadError(null)

      try {
        await onUploadImage(option.id, file)
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setIsUploading(false)
        e.target.value = '' // Reset input
      }
    },
    [option.id, onUploadImage]
  )

  const handleRemoveImage = useCallback(async () => {
    setIsUploading(true)
    try {
      await onDeleteImage(option.id)
    } finally {
      setIsUploading(false)
    }
  }, [option.id, onDeleteImage])

  const hasImage = !!option.imageUrl
  const showWarning = !hasImage && !isUploading

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg border bg-background',
        isDragging && 'opacity-50 shadow-lg',
        showWarning && 'border-amber-300 bg-amber-50/50'
      )}
    >
      {/* Drag Handle */}
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Image Upload/Preview */}
      <div className="relative shrink-0">
        {hasImage ? (
          <div className="relative">
            <img
              src={option.imageUrl!}
              alt={option.label || 'Option image'}
              className="h-12 w-12 rounded border object-cover bg-muted"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute -right-1.5 -top-1.5 h-5 w-5"
              onClick={handleRemoveImage}
              disabled={disabled || isUploading}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(',')}
              onChange={handleFileSelect}
              disabled={disabled || isUploading}
              className="absolute inset-0 cursor-pointer opacity-0 z-10"
            />
            <div
              className={cn(
                'h-12 w-12 flex items-center justify-center rounded border-2 border-dashed transition-colors',
                isUploading
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/30 hover:border-muted-foreground/50 bg-muted/30'
              )}
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Label Input */}
      <div className="flex-1 min-w-0">
        <Input
          value={option.label}
          onChange={(e) => onUpdate(option.id, { label: e.target.value })}
          placeholder="Label (used for alt text)"
          className={cn(
            'h-9',
            showWarning && 'border-amber-300 focus-visible:ring-amber-400'
          )}
          disabled={disabled}
        />
        {uploadError && (
          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {uploadError}
          </p>
        )}
      </div>

      {/* Warning indicator for missing image */}
      {showWarning && (
        <div className="shrink-0" title="Image required">
          <AlertCircle className="h-4 w-4 text-amber-500" />
        </div>
      )}

      {/* Delete Button */}
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
