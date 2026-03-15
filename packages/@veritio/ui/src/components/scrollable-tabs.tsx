'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type VariantProps } from 'class-variance-authority'
import { Tabs as TabsPrimitive } from 'radix-ui'

import { cn } from '../utils/cn'
import { tabsListVariants } from './tabs'

interface ScrollableTabsListProps
  extends React.ComponentProps<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {
  showIndicators?: boolean
}
export function ScrollableTabsList({
  className,
  variant = 'default',
  showIndicators = true,
  children,
  ...props
}: ScrollableTabsListProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const rafRef = React.useRef<number | null>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  // Optimized scroll check using requestAnimationFrame to batch layout reads
  // This prevents forced reflows by ensuring we only read layout properties
  // once per frame, rather than on every scroll event
  const checkScroll = React.useCallback(() => {
    // Cancel any pending animation frame to avoid stacking
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      const container = containerRef.current
      if (!container) return

      // Batch read all layout properties in a single frame
      const { scrollLeft, scrollWidth, clientWidth } = container

      // Only update state if values actually changed to avoid unnecessary re-renders
      setCanScrollLeft(prev => {
        const newValue = scrollLeft > 1
        return prev !== newValue ? newValue : prev
      })
      setCanScrollRight(prev => {
        const newValue = scrollLeft < scrollWidth - clientWidth - 1
        return prev !== newValue ? newValue : prev
      })

      rafRef.current = null
    })
  }, [])

  React.useEffect(() => {
    // Initial check after mount
    checkScroll()
    const container = containerRef.current
    if (!container) return

    // Use ResizeObserver to detect content changes
    const resizeObserver = new ResizeObserver(checkScroll)
    resizeObserver.observe(container)

    container.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)

    return () => {
      // Clean up pending animation frame on unmount
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      resizeObserver.disconnect()
      container.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [checkScroll])

  const scroll = React.useCallback((direction: 'left' | 'right') => {
    const container = containerRef.current
    if (!container) return

    const scrollAmount = container.clientWidth * 0.6
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }, [])

  return (
    <div className="relative">
      {/* Left scroll indicator with button */}
      {showIndicators && canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className={cn(
            'absolute left-0 top-0 bottom-0 z-10 flex items-center',
            'bg-gradient-to-r from-background via-background/90 to-transparent',
            'px-1 cursor-pointer lg:hidden',
            'hover:from-background hover:via-background/95',
            'transition-colors'
          )}
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className={cn(
          'overflow-x-auto scrollbar-hide scroll-smooth',
          // Add padding when indicators are visible to prevent content overlap
          showIndicators && canScrollLeft && 'pl-6 lg:pl-0',
          showIndicators && canScrollRight && 'pr-6 lg:pr-0'
        )}
      >
        <TabsPrimitive.List
          data-slot="tabs-list"
          data-variant={variant}
          className={cn(
            tabsListVariants({ variant }),
            'w-max min-w-full',
            className
          )}
          {...props}
        >
          {children}
        </TabsPrimitive.List>
      </div>

      {/* Right scroll indicator with button */}
      {showIndicators && canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className={cn(
            'absolute right-0 top-0 bottom-0 z-10 flex items-center',
            'bg-gradient-to-l from-background via-background/90 to-transparent',
            'px-1 cursor-pointer lg:hidden',
            'hover:from-background hover:via-background/95',
            'transition-colors'
          )}
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}
