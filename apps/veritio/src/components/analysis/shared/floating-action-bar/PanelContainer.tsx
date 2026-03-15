'use client'

import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export type PanelWidth = 'default' | 'wide' | 'extra-wide' | number

interface PanelContainerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  /** Custom header content (replaces title and close button) */
  headerContent?: ReactNode
  /** Panel width - 'default' (320px), 'wide' (480px), 'extra-wide' (560px), or custom number */
  width?: PanelWidth
  /** Hide the header entirely (use when children provide their own header) */
  hideHeader?: boolean
  children: ReactNode
}

function getWidthValue(width: PanelWidth): number {
  if (typeof width === 'number') return width
  switch (width) {
    case 'wide': return 480
    case 'extra-wide': return 560
    default: return 320
  }
}

export function PanelContainer({
  isOpen,
  onClose,
  title,
  headerContent,
  width = 'default',
  hideHeader = false,
  children,
}: PanelContainerProps) {
  const widthValue = getWidthValue(width)
  const [shouldRenderContent, setShouldRenderContent] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShouldRenderContent(true) // eslint-disable-line react-hooks/set-state-in-effect
    } else {
      const timer = setTimeout(() => setShouldRenderContent(false), 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  return (
    <div
      className={`h-full bg-background flex flex-col overflow-hidden flex-shrink-0 ${isOpen ? 'border-l border-border' : ''}`}
      style={{
        width: isOpen ? widthValue : 0,
        opacity: isOpen ? 1 : 0,
        maxWidth: widthValue,
        minWidth: 0,
        transition: 'width 0.25s ease-out, opacity 0.25s ease-out 0.05s',
      }}
    >
      {shouldRenderContent && (
        <>
          {!hideHeader && headerContent && (
            <div className="flex-shrink-0 border-b border-border">
              {headerContent}
            </div>
          )}

          {!hideHeader && !headerContent && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full">{children}</div>
        </>
      )}
    </div>
  )
}
