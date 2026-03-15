'use client'

import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

interface ZoomControlsProps {
  zoom: number // Current zoom level (0.1 to 4)
  minZoom?: number
  maxZoom?: number
  onZoomChange: (zoom: number) => void
  className?: string
}

export function ZoomControls({
  zoom,
  minZoom = 0.1,
  maxZoom = 4,
  onZoomChange,
  className,
}: ZoomControlsProps) {
  // Calculate step for +/- buttons (10% of current zoom)
  const step = 0.2

  const handleZoomIn = () => {
    const newZoom = Math.min(maxZoom, zoom + step)
    onZoomChange(newZoom)
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(minZoom, zoom - step)
    onZoomChange(newZoom)
  }

  // Convert zoom value to slider value (0-100)
  const sliderValue = ((zoom - minZoom) / (maxZoom - minZoom)) * 100

  // Convert slider value back to zoom
  const handleSliderChange = (values: number[]) => {
    const newZoom = minZoom + (values[0] / 100) * (maxZoom - minZoom)
    onZoomChange(newZoom)
  }

  return (
    <div className={`flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg border border-stone-200 px-2 py-1.5 shadow-sm ${className || ''}`}>
      {/* Zoom out button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={handleZoomOut}
        disabled={zoom <= minZoom}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>

      {/* Slider */}
      <Slider
        value={[sliderValue]}
        onValueChange={handleSliderChange}
        min={0}
        max={100}
        step={1}
        className="w-24"
      />

      {/* Zoom in button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={handleZoomIn}
        disabled={zoom >= maxZoom}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
