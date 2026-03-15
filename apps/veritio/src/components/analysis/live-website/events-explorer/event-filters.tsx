'use client'

import { useMemo, memo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Filter, Search } from 'lucide-react'
import {
  resolveParticipantDisplay,
  extractDemographicsFromMetadata,
} from '@/lib/utils/participant-display'
import { createParticipantNumberMap, sortParticipantsByDate } from '@/lib/utils/participant-utils'
import type { LiveWebsiteTask } from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'
import type { Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'

const EVENT_TYPES = [
  { value: 'click', label: 'Click' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'rage_click', label: 'Rage Click' },
  { value: 'scroll', label: 'Scroll' },
  { value: 'form_change', label: 'Form Change' },
] as const

export interface EventFilters {
  eventTypes: Set<string>
  taskId: string
  pageUrlFilter: string
}

interface EventFiltersBarProps {
  filters: EventFilters
  onFiltersChange: (filters: EventFilters) => void
  tasks: LiveWebsiteTask[]
  participants: Participant[]
  displaySettings?: ParticipantDisplaySettings | null
  selectedParticipantId: string
  onSelectedParticipantChange?: (id: string) => void
}

function EventFiltersBarBase({
  filters,
  onFiltersChange,
  tasks,
  participants,
  displaySettings,
  selectedParticipantId,
  onSelectedParticipantChange,
}: EventFiltersBarProps) {
  const participantNumberMap = useMemo(() => createParticipantNumberMap(participants), [participants])

  const sortedParticipants = useMemo(() => sortParticipantsByDate(participants), [participants])

  const participantOptions = useMemo(() =>
    sortedParticipants.map(p => {
      const num = participantNumberMap.get(p.id) || 0
      const demographics = extractDemographicsFromMetadata(p.metadata)
      const display = resolveParticipantDisplay(displaySettings ?? null, { index: num, demographics })
      return { value: p.id, label: display.primary + (display.secondary ? ` (${display.secondary})` : '') }
    }),
  [sortedParticipants, participantNumberMap, displaySettings])

  const toggleEventType = (type: string) => {
    const next = new Set(filters.eventTypes)
    if (next.has(type)) {
      next.delete(type)
    } else {
      next.add(type)
    }
    onFiltersChange({ ...filters, eventTypes: next })
  }

  const activeCount = filters.eventTypes.size
  const allSelected = activeCount === EVENT_TYPES.length

  return (
    <div className="flex items-center gap-2">
      {/* Task Filter — most important, goes first */}
      <Select
        value={filters.taskId}
        onValueChange={v => onFiltersChange({ ...filters, taskId: v })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All tasks" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All tasks</SelectItem>
          {tasks.map((task, i) => (
            <SelectItem key={task.id} value={task.id}>
              {i + 1}. {task.title || `Task ${i + 1}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Participant Filter — searchable */}
      <SearchableSelect
        value={selectedParticipantId}
        onValueChange={v => onSelectedParticipantChange?.(v)}
        options={participantOptions}
        placeholder="Select participant..."
        searchPlaceholder="Search participants..."
        className="w-52"
      />

      {/* Event Types Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="default" className="gap-2 shrink-0 h-11">
            <Filter className="h-3.5 w-3.5" />
            Events
            {!allSelected && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium">
                {activeCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3" align="start">
          <div className="space-y-2.5">
            {EVENT_TYPES.map(et => (
              <div key={et.value} className="flex items-center gap-2">
                <Checkbox
                  id={`event-type-${et.value}`}
                  checked={filters.eventTypes.has(et.value)}
                  onCheckedChange={() => toggleEventType(et.value)}
                />
                <Label htmlFor={`event-type-${et.value}`} className="text-sm cursor-pointer">
                  {et.label}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Page URL Filter — inline input matching select height */}
      <div className="relative w-56 shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter by URL..."
          value={filters.pageUrlFilter}
          onChange={e => onFiltersChange({ ...filters, pageUrlFilter: e.target.value })}
          className="h-11 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  )
}

export const EventFiltersBar = memo(EventFiltersBarBase)
