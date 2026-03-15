'use client'

import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  type ResultType,
  ALL_RESULT_TYPES,
  RESULT_TYPE_CONFIG,
} from './paths-utils'

interface ResultFiltersDropdownProps {
  selectedTypes: Set<ResultType>
  onSelectedTypesChange: (types: Set<ResultType>) => void
}

/**
 * Multi-select dropdown for filtering paths by result type.
 * Shows checkboxes for each of the 6 result types with colored dots.
 */
export function ResultFiltersDropdown({
  selectedTypes,
  onSelectedTypesChange,
}: ResultFiltersDropdownProps) {
  const [open, setOpen] = useState(false)

  const toggleType = (type: ResultType) => {
    const newSet = new Set(selectedTypes)
    if (newSet.has(type)) {
      newSet.delete(type)
    } else {
      newSet.add(type)
    }
    onSelectedTypesChange(newSet)
  }

  const _allSelected = selectedTypes.size === ALL_RESULT_TYPES.length
  const noneSelected = selectedTypes.size === 0

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="min-w-[140px] justify-between gap-2"
        >
          <span className={noneSelected ? 'text-muted-foreground' : ''}>
            Result filters
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
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
              {/* Checkbox */}
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  isSelected
                    ? 'bg-primary border-primary'
                    : 'border-muted-foreground/30'
                }`}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>

              {/* Colored dot */}
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: config.dotColor }}
              />

              {/* Label */}
              <span className="truncate">{config.label}</span>
            </button>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
