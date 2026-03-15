'use client'

import { memo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Search, ArrowUp } from 'lucide-react'

export interface CategoriesActionBarProps {
  selectedCount: number
  hasSelectedStandardized: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  onStandardize: () => void
  onUnstandardize: () => void
}

export const CategoriesActionBar = memo(function CategoriesActionBar({
  selectedCount,
  hasSelectedStandardized,
  searchQuery,
  onSearchChange,
  onStandardize,
  onUnstandardize,
}: CategoriesActionBarProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={onStandardize} disabled={selectedCount < 2} size="sm">
                Standardize
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs">
                Merge 2 or more similar categories into one standardized category for cleaner analysis. Select categories using the checkboxes, then click Standardize.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          variant="outline"
          onClick={onUnstandardize}
          disabled={!hasSelectedStandardized}
          size="sm"
        >
          Unstandardize
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="gap-1"
        >
          <ArrowUp className="h-4 w-4" />
          Back to top
        </Button>
      </div>
      <div className="relative w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-8 h-9"
        />
      </div>
    </div>
  )
})
