'use client'

/**
 * TextVisualizationPagination
 *
 * Pagination controls for the text visualization table.
 */

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZE_OPTIONS } from '@veritio/ui'

interface TextVisualizationPaginationProps {
  pageSize: number
  showingRange: { from: number; to: number; total: number }
  hasNextPage: boolean
  hasPreviousPage: boolean
  onPageSizeChange: (size: number) => void
  onNextPage: () => void
  onPreviousPage: () => void
}

export function TextVisualizationPagination({
  pageSize,
  showingRange,
  hasNextPage,
  hasPreviousPage,
  onPageSizeChange,
  onNextPage,
  onPreviousPage,
}: TextVisualizationPaginationProps) {
  return (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="w-[80px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">answers per page</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Showing {showingRange.from} to {showingRange.to} of {showingRange.total} answers
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onPreviousPage}
          disabled={!hasPreviousPage}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onNextPage}
          disabled={!hasNextPage}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
