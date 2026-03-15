'use client'

import { Search, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { StudyStatus } from './study-status-badge'
import type { StudyType } from './studies-table'

interface StudiesTableToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: StudyStatus | 'all'
  onStatusFilterChange: (status: StudyStatus | 'all') => void
  typeFilter: StudyType | 'all'
  onTypeFilterChange: (type: StudyType | 'all') => void
  selectedCount: number
  onBulkDelete: () => void
  isDeleting: boolean
}

export function StudiesTableToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  selectedCount,
  onBulkDelete,
  isDeleting,
}: StudiesTableToolbarProps) {
  const hasActiveFilters =
    searchQuery !== '' || statusFilter !== 'all' || typeFilter !== 'all'

  const handleClearFilters = () => {
    onSearchChange('')
    onStatusFilterChange('all')
    onTypeFilterChange('all')
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
          <input
            type="search"
            placeholder="Search studies..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex h-11 w-full rounded-xl border-2 border-transparent pl-10 pr-4 py-2 text-sm bg-muted text-foreground placeholder:text-muted-foreground hover:bg-muted/80 focus:bg-muted/80 transition-all duration-200 outline-none"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onValueChange={(value) => onStatusFilterChange(value as StudyStatus | 'all')}
        >
          <SelectTrigger className="w-full sm:w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select
          value={typeFilter}
          onValueChange={(value) => onTypeFilterChange(value as StudyType | 'all')}
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="card_sort">Card Sort</SelectItem>
            <SelectItem value="tree_test">Tree Test</SelectItem>
            <SelectItem value="survey">Survey</SelectItem>
            <SelectItem value="prototype_test">Figma Prototype Test</SelectItem>
            <SelectItem value="first_click">First Click</SelectItem>
            <SelectItem value="first_impression">First Impression</SelectItem>
            <SelectItem value="live_website_test">Web App Test</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedCount} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={onBulkDelete}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      )}
    </div>
  )
}
