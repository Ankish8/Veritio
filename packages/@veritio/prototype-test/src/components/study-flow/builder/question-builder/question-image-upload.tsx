'use client'

import { useCallback, useState } from 'react'
import { Label } from '@veritio/ui'
import { Switch } from '@veritio/ui'
import { Button } from '@veritio/ui'
import { Input } from '@veritio/ui'
import {
  uploadQuestionImage,
  deleteQuestionImage,
  formatFileSize,
  MAX_FILE_SIZES,
  ALLOWED_IMAGE_TYPES,
} from '../../../../lib/supabase/storage'
import type { QuestionImage } from '../../../../lib/supabase/study-flow-types'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'

interface QuestionImageUploadProps {
  studyId: string
  questionId: string
  image?: QuestionImage | null
  onChange: (image: QuestionImage | null) => void
  disabled?: boolean
}

export function QuestionImageUpload({
  studyId,
  questionId,
  image,
  onChange,
  disabled,
}: QuestionImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [altText, setAltText] = useState(image?.alt || '')

  const isEnabled = !!image

  const handleToggle = useCallback(
    async (enabled: boolean) => {
      if (!enabled && image) {
        // Disable - remove image
        try {
          await deleteQuestionImage(image.url)
        } catch {
          // Ignore delete errors
        }
        onChange(null)
      }
      // If enabling, just wait for upload - don't create empty image object
    },
    [image, onChange]
  )

  const handleUpload = useCallback(
    async (file: File) => {
      if (disabled || isUploading) return

      setIsUploading(true)
      try {
        const result = await uploadQuestionImage(studyId, questionId, file)
        onChange({
          url: result.url,
          filename: result.filename,
          alt: altText || undefined,
        })
      } catch (error) {
        // Upload failed - could show toast here
      } finally {
        setIsUploading(false)
      }
    },
    [studyId, questionId, disabled, isUploading, onChange, altText]
  )

  const handleRemove = useCallback(async () => {
    if (image?.url) {
      try {
        await deleteQuestionImage(image.url)
      } catch {
        // Ignore delete errors
      }
    }
    onChange(null)
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
        e.target.value = '' // Reset input
      }
    },
    [handleUpload]
  )

  const handleAltTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newAlt = e.target.value
      setAltText(newAlt)
      if (image) {
        onChange({
          ...image,
          alt: newAlt || undefined,
        })
      }
    },
    [image, onChange]
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="question-image-toggle" className="text-sm font-medium">
            Image
          </Label>
          <p className="text-xs text-muted-foreground">
            Show an image while asking this question
          </p>
        </div>
        <Switch
          id="question-image-toggle"
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>

      {isEnabled && image ? (
        <div className="space-y-3">
          {/* Image Preview */}
          <div className="relative inline-block">
            <img
              src={image.url}
              alt={image.alt || 'Question image'}
              className="max-h-40 rounded-lg border object-contain bg-muted/30"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute -right-2 -top-2 h-6 w-6"
              onClick={handleRemove}
              disabled={disabled || isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {image.filename && (
            <p className="text-xs text-muted-foreground">{image.filename}</p>
          )}

          {/* Alt Text Input */}
          <div className="space-y-1.5">
            <Label htmlFor="image-alt" className="text-xs">
              Alt text (optional)
            </Label>
            <Input
              id="image-alt"
              value={altText}
              onChange={handleAltTextChange}
              placeholder="Describe the image for accessibility"
              className="h-8 text-sm"
              disabled={disabled}
            />
          </div>
        </div>
      ) : isEnabled || isUploading ? (
        /* Upload Area - shown when toggle is on but no image yet, or during upload */
        <div
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          } ${disabled || isUploading ? 'cursor-not-allowed opacity-60' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            if (!disabled && !isUploading) setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="mt-2 text-sm font-medium">
            {isUploading ? 'Uploading...' : 'Upload image'}
          </p>
          <p className="text-xs text-muted-foreground">
            Choose a PNG, JPG, or GIF file from your device
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Max {formatFileSize(MAX_FILE_SIZES.logo)}
          </p>
        </div>
      ) : null}
    </div>
  )
}

