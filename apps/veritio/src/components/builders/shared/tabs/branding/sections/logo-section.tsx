'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2 } from 'lucide-react'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import { ALLOWED_IMAGE_TYPES } from '@/lib/supabase/storage'
import { LOGO_SIZE_MIN, LOGO_SIZE_MAX, LOGO_SIZE_DEFAULT } from '@/components/builders/shared/types'
import { useLogoHandlers } from '../hooks'
import { cn } from '@/lib/utils'

interface LogoSectionProps {
  studyId: string
  isReadOnly?: boolean
}

export function LogoSection({ studyId, isReadOnly }: LogoSectionProps) {
  const { meta, setLogoSize } = useStudyMetaStore()
  const [localLogoSize, setLocalLogoSize] = useState(meta.branding.logoSize || LOGO_SIZE_DEFAULT)

  const {
    logoUploading,
    logoDragOver,
    handleLogoRemove,
    handleLogoDrop,
    handleLogoFileSelect,
    handleDragOver,
    handleDragLeave,
  } = useLogoHandlers({ studyId, isReadOnly })

  // Sync local logo size when store value changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalLogoSize(meta.branding.logoSize || LOGO_SIZE_DEFAULT)
  }, [meta.branding.logoSize])

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Logo</Label>
      <p className="text-xs text-muted-foreground">
        Appears in the study header. Recommended: 200×50px
      </p>

      {meta.branding.logo ? (
        <div className="flex items-center gap-4">
          <div className="p-2 bg-muted/50 rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meta.branding.logo.url}
              alt="Logo"
              className="max-h-10 max-w-[140px] object-contain"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogoRemove}
            disabled={isReadOnly || logoUploading}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'relative flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 transition-colors',
            logoDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/50',
            (isReadOnly || logoUploading) && 'cursor-not-allowed opacity-60'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleLogoDrop}
        >
          <input
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            onChange={handleLogoFileSelect}
            disabled={isReadOnly || logoUploading}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          {logoUploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {logoUploading ? 'Uploading...' : 'Upload logo'}
          </span>
        </div>
      )}

      {/* Logo Size Slider */}
      {meta.branding.logo && (
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground w-12">Size</Label>
          <input
            type="range"
            min={LOGO_SIZE_MIN}
            max={LOGO_SIZE_MAX}
            step={2}
            value={localLogoSize}
            onChange={(e) => setLocalLogoSize(Number(e.target.value))}
            onPointerUp={(e) => setLogoSize(Number((e.target as HTMLInputElement).value))}
            onKeyUp={(e) => setLogoSize(Number((e.target as HTMLInputElement).value))}
            disabled={isReadOnly}
            className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-foreground"
          />
          <span className="text-xs text-muted-foreground font-mono w-10 text-right">
            {localLogoSize}px
          </span>
        </div>
      )}
    </div>
  )
}
