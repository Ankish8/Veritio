'use client'

/**
 * Column Customization Dropdown
 *
 * Meta Ads-style dropdown for selecting which columns to show in the
 * First Impression participants table. Groups columns by tier with
 * section headers and a reset option.
 */

import { useState } from 'react'
import { ChevronDown, Check, RotateCcw, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  type FirstImpressionColumnId,
  type ColumnTier,
  COLUMN_TIER_LABELS,
  getColumnsByTier,
} from './column-definitions'
import { cn } from '@/lib/utils'

interface ColumnCustomizationDropdownProps {
  visibleColumns: Set<FirstImpressionColumnId>
  onToggleColumn: (columnId: FirstImpressionColumnId) => void
  onResetToDefaults: () => void
  isDefaultVisibility: boolean
}

/**
 * Dropdown for customizing visible columns.
 * Follows the ResultFiltersDropdown pattern with tier grouping.
 */
export function ColumnCustomizationDropdown({
  visibleColumns,
  onToggleColumn,
  onResetToDefaults,
  isDefaultVisibility,
}: ColumnCustomizationDropdownProps) {
  const [open, setOpen] = useState(false)
  const columnsByTier = getColumnsByTier()
  const tiers: ColumnTier[] = ['essential', 'quality', 'advanced']

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="min-w-[110px] justify-between gap-2"
        >
          <Settings2 className="h-4 w-4" />
          <span>Columns</span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px] p-1">
        {tiers.map((tier, tierIndex) => (
          <div key={tier}>
            {tierIndex > 0 && <DropdownMenuSeparator className="my-1" />}

            {/* Tier header */}
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {COLUMN_TIER_LABELS[tier]}
            </div>

            {/* Column items */}
            {columnsByTier[tier].map((column) => {
              const isSelected = visibleColumns.has(column.id)
              const isParticipant = column.id === 'participant'

              return (
                <button
                  key={column.id}
                  type="button"
                  onClick={() => !isParticipant && onToggleColumn(column.id)}
                  disabled={isParticipant}
                  className={cn(
                    'flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded transition-colors text-left',
                    isParticipant
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-muted cursor-pointer'
                  )}
                >
                  {/* Checkbox indicator */}
                  <div
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>

                  {/* Column name */}
                  <span className="truncate flex-1">{column.header}</span>

                  {/* Lock indicator for participant column */}
                  {isParticipant && (
                    <span className="text-xs text-muted-foreground">Always on</span>
                  )}
                </button>
              )
            })}
          </div>
        ))}

        {/* Reset to defaults */}
        <DropdownMenuSeparator className="my-1" />
        <button
          type="button"
          onClick={() => {
            onResetToDefaults()
            setOpen(false)
          }}
          disabled={isDefaultVisibility}
          className={cn(
            'flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded transition-colors text-left',
            isDefaultVisibility
              ? 'opacity-50 cursor-not-allowed text-muted-foreground'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset to defaults</span>
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
