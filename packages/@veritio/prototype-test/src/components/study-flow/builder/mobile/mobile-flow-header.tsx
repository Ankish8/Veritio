'use client'

import { Button } from '@veritio/ui/components/button'
import { Eye } from 'lucide-react'

interface MobileFlowHeaderProps {
  title: string
  description: string
  onOpenPreview: () => void
}
export function MobileFlowHeader({
  title,
  description,
  onOpenPreview,
}: MobileFlowHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-background border-b border-border px-4 py-3 flex items-center justify-between gap-3">
      {/* Section info */}
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide truncate">
          {title}
        </h2>
        <p className="text-xs text-muted-foreground truncate">
          {description}
        </p>
      </div>

      {/* Preview button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onOpenPreview}
        className="flex-shrink-0 gap-2"
        aria-label="Open preview"
      >
        <Eye className="h-4 w-4" />
        <span className="text-sm">Preview</span>
      </Button>
    </header>
  )
}
