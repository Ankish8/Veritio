'use client'

import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  type LiveWebsiteResultType,
  ALL_RESULT_TYPES,
  RESULT_TYPE_CONFIG,
} from './paths-utils'

interface ResultFiltersDropdownProps {
  selectedTypes: Set<LiveWebsiteResultType>
  onSelectedTypesChange: (types: Set<LiveWebsiteResultType>) => void
}

export function ResultFiltersDropdown({
  selectedTypes,
  onSelectedTypesChange,
}: ResultFiltersDropdownProps) {
  const [open, setOpen] = useState(false)

  const toggleType = (type: LiveWebsiteResultType) => {
    const newSet = new Set(selectedTypes)
    if (newSet.has(type)) {
      newSet.delete(type)
    } else {
      newSet.add(type)
    }
    onSelectedTypesChange(newSet)
  }

  const allSelected = selectedTypes.size === ALL_RESULT_TYPES.length
  const noneSelected = selectedTypes.size === 0

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="min-w-[140px] justify-between gap-2"
        >
          <span className={noneSelected || allSelected ? 'text-muted-foreground' : ''}>
            Result filters
          </span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[180px] p-1">
        {ALL_RESULT_TYPES.map((type) => {
          const config = RESULT_TYPE_CONFIG[type]
          const isSelected = selectedTypes.has(type)

          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors text-left"
            >
              <div
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                  isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                )}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: config.dotColor }}
              />
              <span className="truncate">{config.label}</span>
            </button>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
