'use client'

import { ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { RESULT_TYPE_CONFIG } from './paths-types'
import type { SortConfig } from './paths-types'

// Grid column widths (shared between header and rows)
export const GRID_COLUMNS = '22% 23% 55%'

// Estimated row height for virtualization
export const ROW_HEIGHT = 52

// ============================================================================
// Column Header
// ============================================================================

interface ColumnHeaderProps {
  label: string
  tooltip: string
  sortField: SortConfig['field']
  currentSort: SortConfig
  onSort: (field: SortConfig['field']) => void
}

export function ColumnHeader({ label, tooltip, sortField, currentSort, onSort }: ColumnHeaderProps) {
  const isSorted = currentSort.field === sortField

  return (
    <div
      className="px-4 py-3 cursor-pointer select-none uppercase text-xs font-semibold tracking-wide text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => onSort(sortField)}
    >
      <div className="inline-flex items-center gap-1">
        <span>{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3 w-3 text-muted-foreground/70 shrink-0" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
        {isSorted ? (
          currentSort.direction === 'asc' ? (
            <ChevronUp className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Result Badge
// ============================================================================

export function ResultBadge({ resultType }: { resultType: string }) {
  const config = RESULT_TYPE_CONFIG[resultType as keyof typeof RESULT_TYPE_CONFIG]
  if (!config) return null

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: config.dotColor }}
      />
      <span className="text-sm">{config.label}</span>
    </div>
  )
}

// ============================================================================
// Path Breadcrumb & Cell
// ============================================================================

export function PathBreadcrumb({ path }: { path: string[] }) {
  return (
    <div className="flex items-center flex-wrap gap-0.5 text-sm">
      {path.map((label, index) => (
        <span key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
          )}
          <span className="text-muted-foreground">{label}</span>
        </span>
      ))}
    </div>
  )
}

export function PathCell({ breadcrumbPath, breadcrumbString }: { breadcrumbPath: string[]; breadcrumbString: string }) {
  return (
    <div className="px-4 py-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="truncate">
            <PathBreadcrumb path={breadcrumbPath} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <p>{breadcrumbString}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

// ============================================================================
// Virtual Row Style
// ============================================================================

export function virtualRowStyle(virtualItem: { size: number; start: number }) {
  return {
    height: `${virtualItem.size}px`,
    transform: `translateY(${virtualItem.start}px)`,
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    display: 'grid',
    gridTemplateColumns: GRID_COLUMNS,
    alignItems: 'center',
  }
}

export const gridHeaderStyle = { display: 'grid', gridTemplateColumns: GRID_COLUMNS, alignItems: 'center' }

// ============================================================================
// Column Tooltips
// ============================================================================

export const columnTooltips = {
  result: 'The success status of the participants path during a given task.',
  participants: 'The count and percentage of the participants who took this path.',
  participant: 'Click to view participant details.',
  path: 'The unique paths users took when navigating the task.',
}
