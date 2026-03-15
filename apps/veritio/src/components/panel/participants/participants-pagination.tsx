'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAGE_SIZE_OPTIONS } from '@veritio/ui'
import { cn } from '@/lib/utils'

interface ParticipantsPaginationProps {
  page: number
  limit: number
  total: number
  hasMore: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  className?: string
}

export function ParticipantsPagination({
  page,
  limit,
  total,
  hasMore,
  onPageChange,
  onPageSizeChange,
  className,
}: ParticipantsPaginationProps) {
  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, total)
  const hasPrevious = page > 1

  return (
    <div className={cn('flex items-center justify-between border-t pt-4', className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show</span>
        <Select
          value={String(limit)}
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
        <span className="text-sm text-muted-foreground">per page</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Showing {startIndex} to {endIndex} of {total} participants
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasMore}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
