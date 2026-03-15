'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion'
import { ChevronUp, ChevronRight, Check } from 'lucide-react'
import { cn } from '@veritio/ui'
import { ScrollArea } from '@veritio/ui/components/scroll-area'
import type { ActiveFlowSection } from '@veritio/prototype-test/stores'

interface SectionItem {
  id: ActiveFlowSection
  title: string
  description: string
  isEnabled: boolean
}

interface MobileFlowBottomSheetProps {
  sections: SectionItem[]
  activeSection: ActiveFlowSection
  currentSectionIndex: number
  onSelectSection: (sectionId: ActiveFlowSection) => void
}

// Sheet height constants
const COLLAPSED_HEIGHT = 80
const HALF_HEIGHT_RATIO = 0.5
const EXPANDED_HEIGHT_RATIO = 0.85

type SheetState = 'collapsed' | 'half' | 'expanded'
export function MobileFlowBottomSheet({
  sections,
  activeSection,
  currentSectionIndex,
  onSelectSection,
}: MobileFlowBottomSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>('collapsed')
  const containerRef = useRef<HTMLDivElement>(null)
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800)

  // Update window height on resize
  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate snap points based on window height
  const getSnapPoint = (state: SheetState): number => {
    switch (state) {
      case 'collapsed':
        return windowHeight - COLLAPSED_HEIGHT
      case 'half':
        return windowHeight * (1 - HALF_HEIGHT_RATIO)
      case 'expanded':
        return windowHeight * (1 - EXPANDED_HEIGHT_RATIO)
    }
  }

  // Motion value for y position (distance from top)
  const y = useMotionValue(getSnapPoint('collapsed'))

  // Transform y position to sheet height for visual feedback
  const sheetHeight = useTransform(y, (value) => windowHeight - value)

  // Animate to a snap point
  const animateToState = (state: SheetState) => {
    setSheetState(state)
    animate(y, getSnapPoint(state), {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    })
  }

  // Handle drag end - determine which snap point to go to
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const velocity = info.velocity.y
    const currentY = y.get()

    // Velocity-based snapping (fast swipe)
    if (Math.abs(velocity) > 500) {
      if (velocity > 0) {
        // Swiping down
        animateToState('collapsed')
      } else {
        // Swiping up
        animateToState('expanded')
      }
      return
    }

    // Position-based snapping
    const collapsedY = getSnapPoint('collapsed')
    const halfY = getSnapPoint('half')
    const expandedY = getSnapPoint('expanded')

    // Find closest snap point
    const distances = [
      { state: 'collapsed' as const, distance: Math.abs(currentY - collapsedY) },
      { state: 'half' as const, distance: Math.abs(currentY - halfY) },
      { state: 'expanded' as const, distance: Math.abs(currentY - expandedY) },
    ]

    const closest = distances.reduce((a, b) => (a.distance < b.distance ? a : b))
    animateToState(closest.state)
  }

  // Handle section selection
  const handleSelectSection = (sectionId: ActiveFlowSection) => {
    onSelectSection(sectionId)
    // Auto-collapse after selection
    animateToState('collapsed')
  }

  // Toggle between collapsed and expanded on tap
  const handleToggle = () => {
    if (sheetState === 'collapsed') {
      animateToState('half')
    } else {
      animateToState('collapsed')
    }
  }

  const activeItem = sections.find((s) => s.id === activeSection)

  return (
    <>
      {/* Backdrop when expanded */}
      {sheetState !== 'collapsed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black"
          onClick={() => animateToState('collapsed')}
        />
      )}

      {/* Bottom sheet */}
      <motion.div
        ref={containerRef}
        className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl shadow-2xl border-t border-border"
        style={{ y, height: sheetHeight }}
        drag="y"
        dragConstraints={{
          top: getSnapPoint('expanded'),
          bottom: getSnapPoint('collapsed'),
        }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        {/* Drag handle area */}
        <div
          className="flex flex-col items-center pt-2 pb-3 cursor-grab active:cursor-grabbing"
          onClick={handleToggle}
          role="button"
          tabIndex={0}
          aria-label={sheetState === 'collapsed' ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={sheetState !== 'collapsed'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleToggle()
            }
          }}
        >
          {/* Visual drag indicator */}
          <div className="w-10 h-1 bg-border rounded-full mb-3" />

          {/* Collapsed state content */}
          <div className="w-full px-4 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Status indicator */}
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />

              {/* Section info */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">
                  {activeItem?.title || 'Select a section'}
                </span>
              </div>

              {/* Progress indicator */}
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {currentSectionIndex + 1} of {sections.length}
              </span>
            </div>

            {/* Expand indicator */}
            <ChevronUp
              className={cn(
                'h-5 w-5 text-muted-foreground transition-transform ml-2',
                sheetState !== 'collapsed' && 'rotate-180'
              )}
            />
          </div>
        </div>

        {/* Expanded content - section list */}
        <ScrollArea className="flex-1 h-[calc(100%-80px)]">
          <div className="px-2 pb-8">
            <p className="px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Study Flow
            </p>

            <ul role="listbox" aria-label="Study flow sections" className="space-y-1">
              {sections.map((section, index) => {
                const isActive = activeSection === section.id
                const isCompleted = index < currentSectionIndex
                const isDisabled = !section.isEnabled

                return (
                  <li key={section.id}>
                    <button
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-3.5 min-h-[56px] rounded-lg',
                        'text-left transition-colors',
                        isActive && 'bg-primary/10',
                        !isActive && !isDisabled && 'hover:bg-muted/50 active:bg-muted',
                        isDisabled && 'opacity-50'
                      )}
                      onClick={() => !isDisabled && handleSelectSection(section.id)}
                      disabled={isDisabled}
                      role="option"
                      aria-selected={isActive}
                      aria-disabled={isDisabled}
                    >
                      {/* Status indicator */}
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center',
                          isCompleted && 'bg-green-500',
                          isActive && !isCompleted && 'bg-primary',
                          !isActive && !isCompleted && 'border-2 border-border'
                        )}
                      >
                        {isCompleted && <Check className="h-3 w-3 text-white" />}
                      </div>

                      {/* Section info */}
                      <div className="flex-1 min-w-0">
                        <span
                          className={cn(
                            'text-sm font-medium block truncate',
                            isActive && 'text-primary'
                          )}
                        >
                          {section.title}
                        </span>
                        <span className="text-xs text-muted-foreground truncate block">
                          {section.description}
                        </span>
                      </div>

                      {/* Chevron */}
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </ScrollArea>
      </motion.div>
    </>
  )
}
