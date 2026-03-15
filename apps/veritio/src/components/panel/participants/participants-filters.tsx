/**
 * Participants Filters
 *
 * Sophisticated filter controls with smooth animations.
 */

'use client'

import { Search, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PanelParticipantFilters } from '@/lib/supabase/panel-types'
import { PARTICIPANT_STATUS, PARTICIPANT_SOURCE } from '@/lib/supabase/panel-types'

interface ParticipantsFiltersProps {
  filters: PanelParticipantFilters
  onFiltersChange: (filters: PanelParticipantFilters) => void
  segments?: Array<{ id: string; name: string; participant_count: number }>
  className?: string
}

export function ParticipantsFilters({
  filters,
  onFiltersChange,
  segments = [],
  className,
}: ParticipantsFiltersProps) {
  const activeFilterCount = [
    filters.status,
    filters.source,
    filters.segment_id,
    filters.search,
  ].filter(Boolean).length

  const handleClearFilters = () => {
    onFiltersChange({})
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email or name..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
          className="pl-10 h-11 bg-background/60 backdrop-blur-sm border-border/60"
        />
      </div>

      {/* Filter controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>

        {/* Status filter */}
        <Select
          value={typeof filters.status === 'string' ? filters.status : 'all'}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, status: value === 'all' ? undefined : (value as any) })
          }
        >
          <SelectTrigger className="w-[140px] h-9 bg-background/60 backdrop-blur-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PARTICIPANT_STATUS.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source filter */}
        <Select
          value={typeof filters.source === 'string' ? filters.source : 'all'}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, source: value === 'all' ? undefined : (value as any) })
          }
        >
          <SelectTrigger className="w-[140px] h-9 bg-background/60 backdrop-blur-sm">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {PARTICIPANT_SOURCE.map((source) => (
              <SelectItem key={source} value={source}>
                {source.charAt(0).toUpperCase() + source.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Segment filter */}
        {segments.length > 0 && (
          <Select
            value={filters.segment_id || 'all'}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, segment_id: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger className="w-[180px] h-9 bg-background/60 backdrop-blur-sm">
              <SelectValue placeholder="Segment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Participants</SelectItem>
              {segments.map((segment) => (
                <SelectItem key={segment.id} value={segment.id}>
                  {segment.name}
                  <span className="text-xs text-muted-foreground ml-2">
                    ({segment.participant_count})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Active filters indicator */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 font-medium"
            >
              {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
