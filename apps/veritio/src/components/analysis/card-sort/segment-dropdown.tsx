'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, List, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SegmentOption {
  id: string
  name: string
}

interface CardSortSegmentDropdownProps {
  activeSegmentId: string | null
  activeSegmentName?: string
  segments: SegmentOption[]
  onApplySegment: (segmentId: string) => void
  onClearSegment: () => void
  onCreateSegment: () => void
  onViewAllSegments: () => void
}

export function CardSortSegmentDropdown({
  activeSegmentId,
  activeSegmentName,
  segments,
  onApplySegment,
  onClearSegment,
  onCreateSegment,
  onViewAllSegments,
}: CardSortSegmentDropdownProps) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-[180px] justify-between">
          <span className="truncate">
            {activeSegmentName ?? 'All included participants'}
          </span>
          {open
            ? <ChevronUp className="ml-2 h-4 w-4 shrink-0" />
            : <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          }
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem onClick={onClearSegment} className="flex items-center gap-2">
          {!activeSegmentId ? <Check className="h-4 w-4" /> : <span className="w-4" />}
          All included participants
        </DropdownMenuItem>
        {segments.map((segment) => (
          <DropdownMenuItem
            key={segment.id}
            onClick={() => onApplySegment(segment.id)}
            className="flex items-center gap-2"
          >
            {activeSegmentId === segment.id ? <Check className="h-4 w-4" /> : <span className="w-4" />}
            {segment.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setOpen(false)
            onCreateSegment()
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create segment
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setOpen(false)
            onViewAllSegments()
          }}
          className="flex items-center gap-2"
        >
          <List className="h-4 w-4" />
          View all segments
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
