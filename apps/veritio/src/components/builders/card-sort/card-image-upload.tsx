'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  uploadCardImage,
  deleteCardImage,
  formatFileSize,
  MAX_FILE_SIZES,
  ALLOWED_IMAGE_TYPES,
} from '@/lib/supabase/storage'
import type { CardImage } from '@veritio/study-types'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'

interface CardImageUploadProps {
  studyId: string
  cardId: string
  image?: CardImage | null
  onChange: (image: CardImage | null) => void
  disabled?: boolean
  compact?: boolean
}

export function CardImageUpload({
  studyId,
  cardId,
  image,
  onChange,
  disabled,
  compact = false,
}: CardImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [altText, setAltText] = useState(image?.alt || '')
  const isDisabled = disabled || isUploading

  const handleUpload = useCallback(
    async (file: File) => {
      if (disabled || isUploading) return

      setIsUploading(true)
      try {
        const result = await uploadCardImage(studyId, cardId, file)
        onChange({
          url: result.url,
          filename: result.filename,
          alt: altText || undefined,
        })
      } catch {
      } finally {
        setIsUploading(false)
      }
    },
    [studyId, cardId, disabled, isUploading, onChange, altText]
  )

  const handleRemove = useCallback(async () => {
    if (image?.url) {
      try {
        await deleteCardImage(image.url)
      } catch {}
    }
    onChange(null)
    setAltText('')
  }, [image, onChange])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (disabled || isUploading) return

      const file = e.dataTransfer.files[0]
      if (file && ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
        await handleUpload(file)
      }
    },
    [disabled, isUploading, handleUpload]
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        await handleUpload(file)
        e.target.value = ''
      }
    },
    [handleUpload]
  )

  const handleAltTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newAlt = e.target.value
      setAltText(newAlt)
      if (image) {
        onChange({ ...image, alt: newAlt || undefined })
      }
    },
    [image, onChange]
  )

  if (compact) {
    if (image?.url) {
      return (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.alt || 'Card image'}
            className="h-12 w-12 rounded border object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -right-1.5 -top-1.5 h-5 w-5"
            onClick={handleRemove}
            disabled={isDisabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )
    }

    return (
      <div className="relative">
        <input
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          onChange={handleFileSelect}
          disabled={isDisabled}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          disabled={isDisabled}
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImageIcon className="h-3.5 w-3.5" />
          )}
          {isUploading ? 'Uploading...' : 'Add Image'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Card Image (optional)</Label>

      {image?.url ? (
        <div className="space-y-3">
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.alt || 'Card image'}
              className="max-h-32 rounded-lg border object-contain bg-muted/30"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute -right-2 -top-2 h-6 w-6"
              onClick={handleRemove}
              disabled={isDisabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {image.filename && (
            <p className="text-xs text-muted-foreground">{image.filename}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="card-image-alt" className="text-xs">
              Alt text (optional)
            </Label>
            <Input
              id="card-image-alt"
              value={altText}
              onChange={handleAltTextChange}
              placeholder="Describe the image for accessibility"
              className="h-8 text-sm"
              disabled={disabled}
            />
          </div>
        </div>
      ) : (
        <div
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            if (!isDisabled) setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            onChange={handleFileSelect}
            disabled={isDisabled}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
          <p className="mt-2 text-sm font-medium">
            {isUploading ? 'Uploading...' : 'Upload image'}
          </p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, or GIF up to {formatFileSize(MAX_FILE_SIZES.cardImage)}
          </p>
        </div>
      )}
    </div>
  )
}
