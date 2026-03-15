'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Trash2, GripVertical } from 'lucide-react'
import type { FirstClickImage, FirstClickAOI } from '@veritio/study-types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AOICanvasProps {
  image: FirstClickImage
  aois: FirstClickAOI[]
  onAOIsChange: (aois: FirstClickAOI[]) => void
}

interface Point {
  x: number
  y: number
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

function rectFromPoints(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  }
}

function toPercentStyle(rect: Rect) {
  return {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.width * 100}%`,
    height: `${rect.height * 100}%`,
  }
}

export function AOICanvas({ image, aois, onAOIsChange }: AOICanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<Point | null>(null)
  const [drawCurrent, setDrawCurrent] = useState<Point | null>(null)
  const [selectedAOI, setSelectedAOI] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')

  // Drag state for moving AOIs
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<Point | null>(null)

  // Convert screen coordinates to normalized 0-1 coordinates
  const screenToNormalized = useCallback((screenX: number, screenY: number): Point => {
    if (!imageRef.current) return { x: 0, y: 0 }

    const rect = imageRef.current.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (screenX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (screenY - rect.top) / rect.height)),
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left click

    const point = screenToNormalized(e.clientX, e.clientY)

    // Check if clicking on existing AOI
    const clickedAOI = aois.find(aoi =>
      point.x >= aoi.x &&
      point.x <= aoi.x + aoi.width &&
      point.y >= aoi.y &&
      point.y <= aoi.y + aoi.height
    )

    if (clickedAOI) {
      setSelectedAOI(clickedAOI.id)
      // Don't start drawing if we clicked an AOI
    } else {
      // Start drawing new rectangle
      setIsDrawing(true)
      setDrawStart(point)
      setDrawCurrent(point)
      setSelectedAOI(null)
      setEditingName(null)
    }
  }, [aois, screenToNormalized])

  // Start dragging an AOI
  const handleAOIDragStart = useCallback((e: React.MouseEvent, aoi: FirstClickAOI) => {
    e.stopPropagation()
    e.preventDefault()
    const point = screenToNormalized(e.clientX, e.clientY)
    setIsDragging(true)
    setSelectedAOI(aoi.id)
    setDragOffset({ x: point.x - aoi.x, y: point.y - aoi.y })
  }, [screenToNormalized])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const point = screenToNormalized(e.clientX, e.clientY)

    // Handle dragging AOI
    if (isDragging && selectedAOI && dragOffset) {
      const aoi = aois.find(a => a.id === selectedAOI)
      if (aoi) {
        const newX = Math.max(0, Math.min(1 - aoi.width, point.x - dragOffset.x))
        const newY = Math.max(0, Math.min(1 - aoi.height, point.y - dragOffset.y))
        onAOIsChange(aois.map(a =>
          a.id === selectedAOI ? { ...a, x: newX, y: newY } : a
        ))
      }
      return
    }

    // Handle drawing
    if (!isDrawing || !drawStart) return
    setDrawCurrent(point)
  }, [isDrawing, drawStart, isDragging, selectedAOI, dragOffset, aois, screenToNormalized, onAOIsChange])

  const handleMouseUp = useCallback(() => {
    // End dragging
    if (isDragging) {
      setIsDragging(false)
      setDragOffset(null)
      return
    }

    if (!isDrawing || !drawStart || !drawCurrent) {
      setIsDrawing(false)
      return
    }

    const rect = rectFromPoints(drawStart, drawCurrent)

    // Only create AOI if rectangle has meaningful size
    if (rect.width > 0.01 && rect.height > 0.01) {
      const newAOI: FirstClickAOI = {
        id: crypto.randomUUID(),
        image_id: image.id,
        task_id: image.task_id,
        study_id: image.study_id,
        name: `Area ${aois.length + 1}`,
        ...rect,
        position: aois.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      onAOIsChange([...aois, newAOI])
      setSelectedAOI(newAOI.id)
      setEditingName(newAOI.id)
      setNameInput(newAOI.name)
    }

    setIsDrawing(false)
    setDrawStart(null)
    setDrawCurrent(null)
  }, [isDrawing, isDragging, drawStart, drawCurrent, aois, image, onAOIsChange])

  const handleDeleteSelected = useCallback(() => {
    if (selectedAOI) {
      onAOIsChange(aois.filter(a => a.id !== selectedAOI))
      setSelectedAOI(null)
      setEditingName(null)
    }
  }, [selectedAOI, aois, onAOIsChange])

  const handleDeleteAOI = useCallback((aoiId: string) => {
    onAOIsChange(aois.filter(a => a.id !== aoiId))
    if (selectedAOI === aoiId) {
      setSelectedAOI(null)
    }
    setEditingName(null)
  }, [aois, selectedAOI, onAOIsChange])

  const handleClearAll = useCallback(() => {
    onAOIsChange([])
    setSelectedAOI(null)
  }, [onAOIsChange])

  const handleNameSave = useCallback(() => {
    if (editingName && nameInput.trim()) {
      onAOIsChange(aois.map(aoi =>
        aoi.id === editingName ? { ...aoi, name: nameInput.trim() } : aoi
      ))
    }
    setEditingName(null)
    setNameInput('')
  }, [editingName, nameInput, aois, onAOIsChange])

  // Delete key handler - listens when component is mounted
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAOI && !editingName) {
        e.preventDefault()
        handleDeleteSelected()
      } else if (e.key === 'Escape') {
        if (editingName) {
          setEditingName(null)
          setNameInput('')
        } else {
          setSelectedAOI(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedAOI, editingName, handleDeleteSelected])

  const drawingRect = isDrawing && drawStart && drawCurrent
    ? rectFromPoints(drawStart, drawCurrent)
    : null

  return (
    <div className="relative h-full flex flex-col items-center justify-center bg-muted/30 p-8 overflow-hidden">
      {/* Floating Controls */}
      {(aois.length > 0 || selectedAOI) && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {aois.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              Clear all
            </Button>
          )}
          {selectedAOI && (
            <Button variant="outline" size="sm" onClick={handleDeleteSelected}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      )}

      {/* Canvas Container - scales image to fit available space */}
      <div
        ref={containerRef}
        className="relative cursor-crosshair max-w-full max-h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={image.image_url}
          alt={image.original_filename || 'Task image'}
          className="max-w-full max-h-[calc(90vh-200px)] w-auto h-auto object-contain select-none"
          draggable={false}
        />

        {/* Existing AOIs */}
        {aois.map(aoi => {
          const isSelected = selectedAOI === aoi.id
          const isEditing = editingName === aoi.id

          return (
            <div
              key={aoi.id}
              className={cn(
                'absolute border-2 transition-colors',
                isSelected ? 'border-primary bg-primary/10' : 'border-yellow-500 bg-yellow-500/10',
                isDragging && isSelected ? 'cursor-grabbing' : 'cursor-pointer'
              )}
              style={toPercentStyle(aoi)}
              onClick={(e) => {
                e.stopPropagation()
                if (!isDragging) {
                  setSelectedAOI(aoi.id)
                }
              }}
            >
              {/* Tooltip - shown when selected or editing */}
              {(isSelected || isEditing) && (
                <div
                  className="absolute -top-14 left-1/2 -translate-x-1/2 z-20"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-background rounded-lg shadow-lg border px-2 py-1.5 flex items-center gap-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      className="p-1 cursor-grab hover:bg-muted rounded active:cursor-grabbing"
                      onMouseDown={(e) => handleAOIDragStart(e, aoi)}
                      title="Drag to move"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </button>

                    {isEditing ? (
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onBlur={handleNameSave}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleNameSave()
                          if (e.key === 'Escape') {
                            setEditingName(null)
                            setNameInput('')
                          }
                        }}
                        className="h-7 text-sm px-2 py-1 w-32 bg-muted/50 border rounded focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Area name"
                      />
                    ) : (
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          setEditingName(aoi.id)
                          setNameInput(aoi.name)
                        }}
                        className="text-sm font-medium px-2 py-1 hover:bg-muted rounded transition-colors cursor-pointer underline decoration-dashed underline-offset-2 decoration-muted-foreground/30"
                        title="Click to rename"
                      >
                        {aoi.name}
                      </button>
                    )}

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleDeleteAOI(aoi.id)
                      }}
                      className="p-1 hover:bg-red-50 hover:text-red-600 rounded transition-colors cursor-pointer"
                      title="Delete area"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Arrow pointing down */}
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-2">
                    <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white" />
                    <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[9px] border-t-gray-200 -z-10" />
                  </div>
                </div>
              )}

              {/* Small label when not selected */}
              {!isSelected && !isEditing && (
                <div className="absolute -top-6 left-0">
                  <span className="bg-yellow-500 text-yellow-950 text-xs px-2 py-0.5 rounded font-medium">
                    {aoi.name}
                  </span>
                </div>
              )}
            </div>
          )
        })}

        {/* Drawing Rectangle */}
        {drawingRect && (
          <div
            className="absolute border-2 border-dashed border-primary bg-primary/5 pointer-events-none"
            style={toPercentStyle(drawingRect)}
          />
        )}
      </div>

      {/* Instructions Footer */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-background/90 backdrop-blur-sm border rounded-lg shadow-sm text-xs text-muted-foreground whitespace-nowrap">
        <p><strong>Click and drag</strong> to draw · <strong>Click area</strong> to select · <strong>Drag handle</strong> to move · <strong>Delete key</strong> or trash icon to remove</p>
      </div>
    </div>
  )
}
