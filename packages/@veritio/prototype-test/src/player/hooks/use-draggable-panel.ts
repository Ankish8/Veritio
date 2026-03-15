'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { PanelCorner } from '../types'

interface UseDraggablePanelOptions {
  initialCorner?: PanelCorner
  onCornerChange?: (corner: PanelCorner) => void
}

interface DragState {
  isDragging: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
}
export function useDraggablePanel({
  initialCorner = 'top-left',
  onCornerChange,
}: UseDraggablePanelOptions = {}) {
  const [corner, setCorner] = useState<PanelCorner>(initialCorner)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  })
  const panelRef = useRef<HTMLDivElement | null>(null)
  const determineCorner = useCallback((x: number, y: number): PanelCorner => {
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    const isLeft = x < centerX
    const isTop = y < centerY

    if (isTop && isLeft) return 'top-left'
    if (isTop && !isLeft) return 'top-right'
    if (!isTop && isLeft) return 'bottom-left'
    return 'bottom-right'
  }, [])
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    dragStateRef.current = {
      isDragging: true,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
    }
    setIsDragging(true)
  }, [])
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragStateRef.current.isDragging) return

    const deltaX = clientX - dragStateRef.current.startX
    const deltaY = clientY - dragStateRef.current.startY

    dragStateRef.current.currentX = clientX
    dragStateRef.current.currentY = clientY

    setDragOffset({ x: deltaX, y: deltaY })
  }, [])
  const handleDragEnd = useCallback(() => {
    if (!dragStateRef.current.isDragging) return

    const { currentX, currentY } = dragStateRef.current
    const newCorner = determineCorner(currentX, currentY)

    dragStateRef.current.isDragging = false
    setIsDragging(false)
    setDragOffset({ x: 0, y: 0 })

    if (newCorner !== corner) {
      setCorner(newCorner)
      onCornerChange?.(newCorner)
    }
  }, [corner, determineCorner, onCornerChange])

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientX, e.clientY)
  }, [handleDragStart])

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleDragStart(touch.clientX, touch.clientY)
  }, [handleDragStart])

  // Global move/end handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY)
    }

    const handleMouseUp = () => {
      handleDragEnd()
    }

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      handleDragMove(touch.clientX, touch.clientY)
    }

    const handleTouchEnd = () => {
      handleDragEnd()
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove)
      window.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  // Update corner when external prop changes
  useEffect(() => {
    if (initialCorner && initialCorner !== corner && !isDragging) {
      setCorner(initialCorner)
    }
  }, [initialCorner])

  return {
    corner,
    isDragging,
    dragOffset,
    panelRef,
    setCorner: (newCorner: PanelCorner) => {
      setCorner(newCorner)
      onCornerChange?.(newCorner)
    },
    dragHandleProps: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
    },
  }
}
