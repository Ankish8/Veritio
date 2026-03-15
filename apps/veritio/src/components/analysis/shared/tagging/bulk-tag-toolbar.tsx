'use client'


import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { X, Plus, Minus, CheckSquare } from 'lucide-react'
import type { ResponseTagWithCount } from '@/types/response-tags'

interface BulkTagToolbarProps {
  selectedCount: number
  availableTags: ResponseTagWithCount[]
  onBulkAssign: (tagId: string) => Promise<void>
  onBulkRemove: (tagId: string) => Promise<void>
  onClearSelection: () => void
  onSelectAll: () => void
  totalCount: number
}

export function BulkTagToolbar({
  selectedCount,
  availableTags,
  onBulkAssign,
  onBulkRemove,
  onClearSelection,
  onSelectAll,
  totalCount,
}: BulkTagToolbarProps) {
  const [loading, setLoading] = useState(false)

  const handleBulkAssign = useCallback(async (tagId: string) => {
    setLoading(true)
    try {
      await onBulkAssign(tagId)
    } finally {
      setLoading(false)
    }
  }, [onBulkAssign])

  const handleBulkRemove = useCallback(async (tagId: string) => {
    setLoading(true)
    try {
      await onBulkRemove(tagId)
    } finally {
      setLoading(false)
    }
  }, [onBulkRemove])

  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 px-4 py-2 bg-background border rounded-lg shadow-lg">
        {/* Selection Info */}
        <div className="flex items-center gap-2 pr-3 border-r">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
          {selectedCount < totalCount && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={onSelectAll}
            >
              Select all {totalCount}
            </Button>
          )}
        </div>

        {/* Add Tag Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={loading || availableTags.length === 0}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Tag
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Add tag to selected</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableTags.map((tag) => (
              <DropdownMenuItem
                key={tag.id}
                onClick={() => handleBulkAssign(tag.id)}
                className="flex items-center gap-2"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Remove Tag Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={loading || availableTags.length === 0}
            >
              <Minus className="h-3.5 w-3.5" />
              Remove Tag
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Remove tag from selected</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableTags.map((tag) => (
              <DropdownMenuItem
                key={tag.id}
                onClick={() => handleBulkRemove(tag.id)}
                className="flex items-center gap-2"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Selection */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
