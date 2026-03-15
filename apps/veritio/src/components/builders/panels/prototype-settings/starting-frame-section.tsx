'use client'

import { useCallback, useMemo } from 'react'
import { Play } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import type { PrototypeTestFrame } from '@veritio/study-types'

// Special value to represent "no selection" (use first frame as default)
const NO_SELECTION = '_first_frame_default'

interface StartingFrameSectionProps {
  frames: PrototypeTestFrame[]
  startingFrameId: string | null
  onChange: (frameId: string | null) => void
}

export function StartingFrameSection({
  frames,
  startingFrameId,
  onChange,
}: StartingFrameSectionProps) {
  // Convert frames to options for SearchableSelect
  const frameOptions = useMemo(() => [
    { value: NO_SELECTION, label: 'First frame (default)' },
    ...frames.map(frame => ({
      value: frame.id,
      label: frame.name,
    })),
  ], [frames])

  const handleChange = useCallback((value: string) => {
    // Convert special "no selection" value back to null
    onChange(value === NO_SELECTION ? null : value)
  }, [onChange])

  return (
    <section className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Play className="h-4 w-4 text-muted-foreground" />
        <Label className="text-[13px] font-medium">Default Starting Frame</Label>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        New tasks will use this frame as their starting screen.
      </p>
      <SearchableSelect
        options={frameOptions}
        value={startingFrameId || NO_SELECTION}
        onValueChange={handleChange}
        placeholder="Select starting frame..."
        searchPlaceholder="Search frames..."
        emptyText="No frames found"
      />
    </section>
  )
}
