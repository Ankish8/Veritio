'use client'

import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@veritio/ui/components/button'
import { X } from 'lucide-react'

export type PanelWidth = 'default' | 'wide' | 'extra-wide' | number

interface PanelContainerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  headerContent?: ReactNode
  width?: PanelWidth
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: widthValue, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{
            // Synchronized timing prevents content from showing before container expands
            width: { type: 'tween', duration: 0.25, ease: 'easeOut' },
            opacity: { duration: 0.25, ease: 'easeOut', delay: 0.05 },
          }}
          className="h-full bg-background border-l border-border flex flex-col overflow-hidden flex-shrink-0"
          style={{ maxWidth: widthValue, minWidth: 0, willChange: 'width, opacity' }}
        >
          {/* Header - hidden, custom, or default */}
          {!hideHeader && (
            headerContent ? (
              <div className="flex-shrink-0 border-b border-border">
                {headerContent}
              </div>
            ) : (
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
            )
          )}

          {/* Panel Content - overflow-x-hidden prevents content bleeding during animation */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
