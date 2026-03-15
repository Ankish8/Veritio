'use client'

import { useRef, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface TooltipPopoverProps {
  position: { x: number; y: number }
  children: React.ReactNode
}

/**
 * Viewport-aware tooltip popover that portals to document.body.
 * Flips horizontally/vertically when overflowing viewport edges.
 */
export function TooltipPopover({ position, children }: TooltipPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [adjusted, setAdjusted] = useState({ x: position.x + 16, y: position.y + 16 })

  // useLayoutEffect runs before paint → no visible flash at wrong position
  useLayoutEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 12

    let x = position.x + 16
    let y = position.y + 16

    // Flip horizontally if overflowing right
    if (x + rect.width > vw - pad) {
      x = position.x - rect.width - 16
    }
    // Flip vertically if overflowing bottom
    if (y + rect.height > vh - pad) {
      y = Math.max(pad, position.y - rect.height - 16)
    }

    setAdjusted({ x, y })
  }, [position])

  // Portal to document.body so position:fixed isn't broken by
  // CSS containing blocks from parent transforms (e.g. Radix TabsContent animation)
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 pointer-events-none"
      style={{ left: adjusted.x, top: adjusted.y }}
    >
      <div className="bg-popover border rounded-lg shadow-lg pointer-events-auto">
        {children}
      </div>
    </div>,
    document.body
  )
}
