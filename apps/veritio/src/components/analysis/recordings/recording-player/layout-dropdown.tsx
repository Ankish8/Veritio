'use client'

import { Video, Grid, Monitor, User, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { RecordingLayout } from './recording-layout-controls'

export interface LayoutDropdownProps {
  /** Current layout mode */
  layout: RecordingLayout
  /** Callback when layout changes */
  onLayoutChange: (layout: RecordingLayout) => void
  /** Whether webcam recording is available */
  hasWebcam: boolean
}

const layouts: Array<{ value: RecordingLayout; label: string; icon: React.ReactNode }> = [
  {
    value: 'pip',
    label: 'Picture-in-Picture',
    icon: <Video className="h-4 w-4" />,
  },
  {
    value: 'side-by-side',
    label: 'Side by Side',
    icon: <Grid className="h-4 w-4" />,
  },
  {
    value: 'screen-only',
    label: 'Screen Only',
    icon: <Monitor className="h-4 w-4" />,
  },
  {
    value: 'webcam-only',
    label: 'Webcam Only',
    icon: <User className="h-4 w-4" />,
  },
]

/**
 * Header-friendly dropdown for selecting video layout.
 * Designed to sit in a toolbar/header area with consistent styling.
 */
export function LayoutDropdown({
  layout,
  onLayoutChange,
  hasWebcam,
}: LayoutDropdownProps) {
  // If no webcam, don't show controls
  if (!hasWebcam) return null

  const currentLayout = layouts.find((l) => l.value === layout)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          {currentLayout?.icon}
          <span className="hidden sm:inline">{currentLayout?.label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {layouts.map(({ value, label, icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => onLayoutChange(value)}
            className={layout === value ? 'bg-accent' : ''}
          >
            {icon}
            <span className="ml-2">{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
