'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ImageIcon, Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import {
  ALLOWED_BACKGROUND_IMAGE_TYPES,
  MAX_FILE_SIZES,
  decodeBackgroundImage,
  uploadStudyBackground,
} from '@/lib/supabase/storage'
import type {
  StudyBackgroundLayout,
  StudyBackgroundMode,
  StudyBackgroundPosition,
  StudyContentSurface,
} from '@/components/builders/shared/types'
import { cn } from '@/lib/utils'

interface BackgroundSectionProps {
  studyId: string
  isReadOnly?: boolean
}

const MODES: Array<{ value: StudyBackgroundMode; label: string }> = [
  { value: 'theme', label: 'Theme' },
  { value: 'color', label: 'Color' },
  { value: 'image', label: 'Image' },
]
const LAYOUTS: Array<{ value: StudyBackgroundLayout; label: string }> = [
  { value: 'fill', label: 'Fill' },
  { value: 'fit', label: 'Fit' },
  { value: 'tile', label: 'Tile' },
]
const POSITIONS: StudyBackgroundPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]
const SURFACES: Array<{ value: StudyContentSurface; label: string; description: string }> = [
  { value: 'solid', label: 'Solid', description: 'Maximum readability' },
  { value: 'glass', label: 'Glass', description: 'Image shows through softly' },
]

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The background image could not be uploaded.'
}

export function BackgroundSection({
  studyId,
  isReadOnly,
}: BackgroundSectionProps) {
  const {
    meta,
    saveStatus,
    updateStudyBackground,
    removeStudyBackgroundImage,
  } = useStudyMetaStore()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const background = meta.branding.background
  const mode = background?.mode || 'theme'
  const color = /^#[0-9A-Fa-f]{6}$/.test(background?.color || '')
    ? background!.color!
    : '#F8FAFC'
  const [hexInput, setHexInput] = useState(color)
  const disabled = !!isReadOnly || isUploading

  useEffect(() => {
    setHexInput(color)
  }, [color])

  const setMode = (nextMode: StudyBackgroundMode) => {
    setUploadError(null)
    updateStudyBackground({
      mode: nextMode,
      ...(nextMode === 'color' && !background?.color ? { color: '#F8FAFC' } : {}),
      ...(nextMode === 'image' && !background?.image
        ? {
            layout: 'fill',
            position: 'center',
            overlayOpacity: 20,
          }
        : {}),
      contentSurface:
        nextMode === 'image'
          ? mode === 'image'
            ? (background?.contentSurface ?? 'glass')
            : 'glass'
          : 'solid',
    })
  }

  const handleUpload = useCallback(async (file: File) => {
    setUploadError(null)
    if (!ALLOWED_BACKGROUND_IMAGE_TYPES.includes(
      file.type as (typeof ALLOWED_BACKGROUND_IMAGE_TYPES)[number],
    )) {
      setUploadError('Choose a PNG, JPEG, or WebP image.')
      return
    }
    if (file.size > MAX_FILE_SIZES.background) {
      setUploadError('Background images must be 5 MB or smaller.')
      return
    }

    setIsUploading(true)
    try {
      const dimensions = await decodeBackgroundImage(file)
      const result = await uploadStudyBackground(studyId, file)
      const current = useStudyMetaStore.getState().meta.branding.background
      updateStudyBackground({
        mode: 'image',
        image: {
          url: result.url,
          path: result.path,
          filename: result.filename,
          size: result.size,
          mimeType: result.mimeType as 'image/png' | 'image/jpeg' | 'image/webp',
          ...dimensions,
        },
        layout: current?.image ? current.layout : 'fill',
        position: current?.image ? current.position : 'center',
        overlayOpacity: current?.image ? current.overlayOpacity : 20,
        contentSurface: current?.image ? current.contentSurface : 'glass',
      })
    } catch (error) {
      setUploadError(errorMessage(error))
    } finally {
      setIsUploading(false)
    }
  }, [studyId, updateStudyBackground])

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) await handleUpload(file)
    event.target.value = ''
  }

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const file = event.dataTransfer.files[0]
    if (file) await handleUpload(file)
  }

  return (
    <section className="space-y-4" aria-labelledby={`${inputId}-title`}>
      <div>
        <Label id={`${inputId}-title`} className="text-sm font-medium">
          Page background
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Applies to hosted participant pages without changing test canvases.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Background type">
        {MODES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            disabled={disabled}
            aria-pressed={mode === option.value}
            className={cn(
              'rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              mode === option.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === 'color' && (
        <div className="space-y-2">
          <Label htmlFor={`${inputId}-color`} className="text-xs">
            Background color
          </Label>
          <div className="flex items-center gap-2">
            <input
              id={`${inputId}-color`}
              type="color"
              value={color}
              onChange={(event) => {
                const value = event.target.value.toUpperCase()
                setHexInput(value)
                updateStudyBackground({ color: value })
              }}
              disabled={disabled}
              className="h-8 w-8 cursor-pointer rounded-md border bg-transparent p-0.5 disabled:cursor-not-allowed"
            />
            <Input
              value={hexInput}
              onChange={(event) => {
                const value = event.target.value.toUpperCase()
                if (/^#[0-9A-F]{0,6}$/.test(value)) {
                  setHexInput(value)
                  if (/^#[0-9A-F]{6}$/.test(value)) {
                    updateStudyBackground({ color: value })
                  }
                }
              }}
              onBlur={() => {
                if (!/^#[0-9A-F]{6}$/.test(hexInput)) {
                  setHexInput(color)
                }
              }}
              disabled={disabled}
              aria-label="Background hex color"
              className="h-8 w-28 font-mono text-xs uppercase"
            />
          </div>
        </div>
      )}

      {mode === 'image' && (
        <>
          <div
            className={cn(
              'relative overflow-hidden rounded-lg border border-dashed transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30',
              disabled && 'opacity-60',
            )}
            onDragOver={(event) => {
              event.preventDefault()
              if (!disabled) setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {background?.image ? (
              <div className="space-y-3 p-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- newly uploaded public study asset */}
                  <img
                    src={background.image.url}
                    alt=""
                    className="h-14 w-20 rounded-md border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{background.image.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {background.image.width && background.image.height
                        ? `${background.image.width} × ${background.image.height} · `
                        : ''}
                      {(background.image.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                    disabled={disabled}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUploadError(null)
                      removeStudyBackgroundImage()
                    }}
                    disabled={disabled}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <label
                htmlFor={`${inputId}-file`}
                className={cn(
                  'flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 p-4 text-center',
                  disabled && 'cursor-not-allowed',
                )}
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-xs font-medium">
                  {isUploading ? 'Checking and uploading…' : 'Drop an image or choose a file'}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  PNG, JPEG, or WebP · 5 MB max
                </span>
              </label>
            )}
            <input
              ref={inputRef}
              id={`${inputId}-file`}
              type="file"
              accept={ALLOWED_BACKGROUND_IMAGE_TYPES.join(',')}
              onChange={handleFileInput}
              disabled={disabled}
              aria-label={background?.image ? 'Replace background image' : 'Upload background image'}
              className="sr-only"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Image layout</Label>
            <div className="grid grid-cols-3 gap-1">
              {LAYOUTS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={background?.layout === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateStudyBackground({ layout: option.value })}
                  disabled={disabled}
                  aria-pressed={background?.layout === option.value}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Image position</Label>
            <div className="grid w-24 grid-cols-3 gap-1" role="group" aria-label="Image position">
              {POSITIONS.map((position) => (
                <button
                  key={position}
                  type="button"
                  onClick={() => updateStudyBackground({ position })}
                  disabled={disabled}
                  aria-label={position.replace('-', ' ')}
                  aria-pressed={(background?.position || 'center') === position}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    (background?.position || 'center') === position
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${inputId}-fallback`} className="text-xs">
                Fallback color
              </Label>
              <span className="text-[11px] text-muted-foreground">{color}</span>
            </div>
            <input
              id={`${inputId}-fallback`}
              type="color"
              value={color}
              onChange={(event) => {
                const value = event.target.value.toUpperCase()
                setHexInput(value)
                updateStudyBackground({ color: value })
              }}
              disabled={disabled}
              className="h-7 w-full cursor-pointer rounded-md border bg-transparent p-0.5 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${inputId}-overlay`} className="text-xs">
                Dark overlay
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {background?.overlayOpacity ?? 20}%
              </span>
            </div>
            <Slider
              id={`${inputId}-overlay`}
              min={0}
              max={60}
              step={5}
              value={[background?.overlayOpacity ?? 20]}
              onValueChange={([overlayOpacity]) => updateStudyBackground({ overlayOpacity })}
              disabled={disabled}
              thumbAriaLabel="Background overlay opacity"
            />
          </div>
        </>
      )}

      {mode === 'image' && (
        <div className="space-y-2">
          <Label className="text-xs">Content surface</Label>
          <div className="grid grid-cols-2 gap-2">
            {SURFACES.map((surface) => {
              const selected = (background?.contentSurface || 'glass') === surface.value
              return (
                <button
                  key={surface.value}
                  type="button"
                  onClick={() => updateStudyBackground({ contentSurface: surface.value })}
                  disabled={disabled}
                  aria-pressed={selected}
                  className={cn(
                    'rounded-lg border p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
                    disabled && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <span className="block text-xs font-medium">{surface.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{surface.description}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div aria-live="polite" className="min-h-4 text-xs">
        {uploadError ? (
          <p className="text-destructive">{uploadError}</p>
        ) : saveStatus === 'error' ? (
          <p className="text-destructive">
            Background changes were not saved. Check your connection and retry.
          </p>
        ) : isUploading ? (
          <p className="text-muted-foreground">Validating and uploading image…</p>
        ) : null}
      </div>
    </section>
  )
}
