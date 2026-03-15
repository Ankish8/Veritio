'use client'

import { useState } from 'react'
import { Grid, Monitor, User, Video, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type RecordingLayout = 'pip' | 'side-by-side' | 'screen-only' | 'webcam-only'

export interface RecordingLayoutControlsProps {
  /** Current layout mode */
  layout: RecordingLayout
  /** Callback when layout changes */
  onLayoutChange: (layout: RecordingLayout) => void
  /** Whether webcam recording is available */
  hasWebcam: boolean
  /** Optional className */
  className?: string
}

/**
 * Compact layout controls for dual-video playback (Google Meet/Zoom style).
 * Features collapsible design to save space.
 */
export function RecordingLayoutControls({
  layout,
  onLayoutChange,
  hasWebcam,
  className,
}: RecordingLayoutControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // If no webcam, don't show controls
  if (!hasWebcam) return null

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

  const currentLayout = layouts.find(l => l.value === layout)

  return (
    <div className={cn('flex flex-col items-end gap-1', className)}>
      {/* Collapsed: Show current layout only */}
      {!isExpanded && (
        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-white/10">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            title={currentLayout?.label}
          >
            {currentLayout?.icon}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsExpanded(true)}
            title="Show layout options"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Expanded: Show all layout options */}
      {isExpanded && (
        <div className="flex flex-col gap-1 bg-black/60 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-white/10">
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-xs text-white/70 font-medium">Layout</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:bg-white/20"
              onClick={() => setIsExpanded(false)}
              title="Hide layout options"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            {layouts.map(({ value, label, icon }) => (
              <Button
                key={value}
                variant={layout === value ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onLayoutChange(value)}
                className={cn(
                  'justify-start gap-2 h-8 text-xs',
                  layout === value
                    ? 'bg-white/20 text-white hover:bg-white/30'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
                title={label}
              >
                {icon}
                <span>{label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
