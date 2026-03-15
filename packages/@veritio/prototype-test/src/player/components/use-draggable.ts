'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Position {
  x: number
  y: number
}

interface UseDraggableOptions {
  enabled: boolean
  /** Initial position (if not set, will be null until first drag) */
  initialPosition?: Position | null
}

interface UseDraggableReturn {
  position: Position | null
  isDragging: boolean
  handleMouseDown: (e: React.MouseEvent) => void
  handleTouchStart: (e: React.TouchEvent) => void
}

export function useDraggable({ enabled, initialPosition = null }: UseDraggableOptions): UseDraggableReturn {
  const [position, setPosition] = useState<Position | null>(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef<Position>({ x: 0, y: 0 })
  const elementRect = useRef<DOMRect | null>(null)

  // Reset position when disabled
  useEffect(() => {
    if (!enabled) {
      setPosition(null)
      setIsDragging(false)
    }
  }, [enabled])

  const startDrag = useCallback(
    (clientX: number, clientY: number, target: HTMLElement) => {
      if (!enabled) return

      // Find the draggable container (the pointer-events-auto wrapper)
      const container = target.closest('[data-draggable]') as HTMLElement | null
      if (!container) return

      const rect = container.getBoundingClientRect()
      elementRect.current = rect

      dragOffset.current = {
        x: clientX - rect.left,
        y: clientY - rect.top,
      }

      setIsDragging(true)
    },
    [enabled],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't drag from buttons or interactive elements
      const target = e.target as HTMLElement
      if (target.closest('button, a, input, select, textarea')) return
      e.preventDefault()
      startDrag(e.clientX, e.clientY, target)
    },
    [startDrag],
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button, a, input, select, textarea')) return
      const touch = e.touches[0]
      startDrag(touch.clientX, touch.clientY, target)
    },
    [startDrag],
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      const newX = e.clientX - dragOffset.current.x
      const newY = e.clientY - dragOffset.current.y
      // Clamp to viewport
      const maxX = window.innerWidth - (elementRect.current?.width ?? 200)
      const maxY = window.innerHeight - (elementRect.current?.height ?? 60)
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      })
    }

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      const newX = touch.clientX - dragOffset.current.x
      const newY = touch.clientY - dragOffset.current.y
      const maxX = window.innerWidth - (elementRect.current?.width ?? 200)
      const maxY = window.innerHeight - (elementRect.current?.height ?? 60)
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      })
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging])

  return { position, isDragging, handleMouseDown, handleTouchStart }
}
