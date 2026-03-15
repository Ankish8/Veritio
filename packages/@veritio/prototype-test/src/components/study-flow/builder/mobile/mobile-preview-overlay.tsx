'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@veritio/ui/components/button'
import { X } from 'lucide-react'
import { StudyFlowPreview } from '../preview'

interface MobilePreviewOverlayProps {
  isOpen: boolean
  onClose: () => void
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  studyId: string
}
export function MobilePreviewOverlay({
  isOpen,
  onClose,
  studyType,
  studyId,
}: MobilePreviewOverlayProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed inset-0 z-[60] bg-background flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Study preview"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <span className="text-sm font-medium text-foreground">
              Preview
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Preview content - takes remaining space */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <StudyFlowPreview studyType={studyType} studyId={studyId} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
