'use client'

import { memo } from 'react'
import { TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ChevronUp, ChevronDown, ChevronsUpDown, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SortDirection } from '@veritio/ui'

export type CategorySortColumn = 'category' | 'contains' | 'frequency' | 'avgPos' | 'createdBy' | 'agreement'

export interface CategoriesTableHeaderProps {
  allSelected: boolean
  onSelectAll: (checked: boolean) => void
  sortColumn: CategorySortColumn | null
  sortDirection: SortDirection | null
  onSort: (column: CategorySortColumn) => void
  showExpandToggle: boolean
  allExpanded: boolean
  onToggleExpandAll: () => void
}

interface SortableHeaderCellProps {
  column: CategorySortColumn
  label: string
  tooltip: string
  currentSort: CategorySortColumn | null
  direction: SortDirection | null
  onSort: (column: CategorySortColumn) => void
  className?: string
  style?: React.CSSProperties
}

const SortableHeaderCell = memo(function SortableHeaderCell({
  column,
  label,
  tooltip,
  currentSort,
  direction,
  onSort,
  className,
  style,
}: SortableHeaderCellProps) {
  const isSorted = currentSort === column

  return (
    <TableHead
      className={cn('cursor-pointer hover:bg-muted/50 select-none whitespace-nowrap', className)}
      style={style}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3 w-3 text-muted-foreground/70" />
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {isSorted ? (
          direction === 'asc' ? (
            <ChevronUp className="h-3.5 w-3.5 ml-1" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 ml-1" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />
        )}
      </div>
    </TableHead>
  )
})

export const CategoriesTableHeader = memo(function CategoriesTableHeader({
  allSelected,
  onSelectAll,
  sortColumn,
  sortDirection,
  onSort,
  showExpandToggle,
  allExpanded,
  onToggleExpandAll,
}: CategoriesTableHeaderProps) {
  return (
    <TableHeader className="bg-muted/30">
      <TableRow className="hover:bg-transparent border-b-2">
        <TableHead style={{ width: '3%' }}>
          <Checkbox checked={allSelected} onCheckedChange={onSelectAll} />
        </TableHead>
        <SortableHeaderCell
          column="category"
          label="Category"
          tooltip="Category name (standardized or original)"
          currentSort={sortColumn}
          direction={sortDirection}
          onSort={onSort}
          style={{ width: '14%' }}
        />
        <SortableHeaderCell
          column="contains"
          label="Contains"
          tooltip="Number of different cards in category"
          currentSort={sortColumn}
          direction={sortDirection}
          onSort={onSort}
          style={{ width: '10%' }}
        />
        <TableHead style={{ width: '24%' }}>
          <div className="flex items-center gap-1">
            <span>Cards</span>
            {showExpandToggle && (
              <button
                className="text-xs text-primary hover:underline ml-1"
                onClick={onToggleExpandAll}
              >
                {allExpanded ? 'Show less' : 'Show all'}
              </button>
            )}
          </div>
        </TableHead>
        <SortableHeaderCell
          column="frequency"
          label="Freq"
          tooltip="Participants who sorted into category"
          currentSort={sortColumn}
          direction={sortDirection}
          onSort={onSort}
          className="text-right"
          style={{ width: '7%' }}
        />
        <SortableHeaderCell
          column="avgPos"
          label="Avg pos"
          tooltip="Average position (1.0 = first)"
          currentSort={sortColumn}
          direction={sortDirection}
          onSort={onSort}
          className="text-right"
          style={{ width: '8%' }}
        />
        <SortableHeaderCell
          column="createdBy"
          label="Created by"
          tooltip="Participants who created category"
          currentSort={sortColumn}
          direction={sortDirection}
          onSort={onSort}
          style={{ width: '14%' }}
        />
        <SortableHeaderCell
          column="agreement"
          label="Agreement"
          tooltip="Category similarity score"
          currentSort={sortColumn}
          direction={sortDirection}
          onSort={onSort}
          style={{ width: '15%' }}
        />
        <TableHead style={{ width: '5%' }}>Edit</TableHead>
      </TableRow>
    </TableHeader>
  )
})
