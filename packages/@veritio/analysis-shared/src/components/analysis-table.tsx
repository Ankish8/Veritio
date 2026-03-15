'use client'

import { type ReactNode, type CSSProperties, type ReactElement, memo, useCallback } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import { ChevronUp, ChevronDown, ChevronsUpDown, HelpCircle } from 'lucide-react'
import { cn } from '@veritio/ui'


export interface AnalysisTableColumn<TSortKey extends string = string> {
  key: TSortKey
  label: string
  width: string
  sortable?: boolean
  tooltip?: string
  align?: 'left' | 'center' | 'right'
}

export interface AnalysisTableProps<T, TSortKey extends string = string> {
  columns: AnalysisTableColumn<TSortKey>[]
  data: T[]
  renderRow: (item: T, index: number) => ReactNode
  sortColumn?: TSortKey | null
  sortDirection?: 'asc' | 'desc' | null
  onSort?: (column: TSortKey) => void
  height?: string
  minWidth?: string
  emptyMessage?: string
  headerPrefix?: ReactNode
  className?: string
  showRowBorders?: boolean
}


interface AnalysisTableHeaderCellProps<TSortKey extends string> {
  column: AnalysisTableColumn<TSortKey>
  sortColumn?: TSortKey | null
  sortDirection?: 'asc' | 'desc' | null
  onSort?: (column: TSortKey) => void
}

const AnalysisTableHeaderCell = memo(function AnalysisTableHeaderCell<TSortKey extends string>({
  column,
  sortColumn,
  sortDirection,
  onSort,
}: AnalysisTableHeaderCellProps<TSortKey>) {
  const isSorted = sortColumn === column.key
  const canSort = column.sortable && onSort

  const handleClick = useCallback(() => {
    if (canSort) {
      onSort(column.key)
    }
  }, [canSort, onSort, column.key])

  const alignClass = {
    left: 'justify-start text-left',
    center: 'justify-center text-center',
    right: 'justify-end text-right',
  }[column.align || 'left']

  return (
    <div
      className={cn(
        'px-4 py-3 uppercase text-xs font-semibold tracking-wide text-muted-foreground',
        canSort && 'cursor-pointer hover:text-foreground transition-colors',
        alignClass
      )}
      onClick={handleClick}
    >
      <div className={cn('inline-flex items-center gap-1', alignClass)}>
        <span>{column.label}</span>
        {column.tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-muted-foreground/70 shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">{column.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {canSort && (
          isSorted ? (
            sortDirection === 'asc' ? (
              <ChevronUp className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            )
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
          )
        )}
      </div>
    </div>
  )
}) as <TSortKey extends string>(props: AnalysisTableHeaderCellProps<TSortKey>) => ReactElement

export interface AnalysisTableRowProps {
  children: ReactNode
  gridColumns?: string
  clickable?: boolean
  onClick?: () => void
  selected?: boolean
  muted?: boolean
  className?: string
  style?: CSSProperties
}

export const AnalysisTableRow = memo(function AnalysisTableRow({
  children,
  gridColumns,
  clickable,
  onClick,
  selected,
  muted,
  className,
  style,
}: AnalysisTableRowProps) {
  return (
    <div
      className={cn(
        'border-b transition-colors',
        clickable && 'cursor-pointer',
        !muted && 'hover:bg-muted/50',
        selected && 'bg-muted',
        muted && 'opacity-60 bg-muted/30',
        className
      )}
      style={{
        display: 'grid',
        gridTemplateColumns: gridColumns,
        alignItems: 'center',
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  )
})

export interface AnalysisTableCellProps {
  children: ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
}

export const AnalysisTableCell = memo(function AnalysisTableCell({
  children,
  align = 'left',
  className,
}: AnalysisTableCellProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align]

  return (
    <div className={cn('px-4 py-3 text-sm text-foreground', alignClass, className)}>
      {children}
    </div>
  )
})

function AnalysisTableInner<T, TSortKey extends string = string>({
  columns,
  data,
  renderRow,
  sortColumn,
  sortDirection,
  onSort,
  height = 'auto',
  minWidth = '600px',
  emptyMessage = 'No data to display.',
  headerPrefix,
  className,
  showRowBorders: _showRowBorders = true,
}: AnalysisTableProps<T, TSortKey>) {
  // Build grid template columns string
  const gridColumns = columns.map(col => col.width).join(' ')
  const gridColumnsWithPrefix = headerPrefix
    ? `auto ${gridColumns}`
    : gridColumns

  return (
    <div className={cn('flex flex-col', className)} style={{ height }}>
      {/* Header */}
      <div className="shrink-0 overflow-y-hidden" style={{ scrollbarGutter: 'stable' }}>
        <div
          className="border-b"
          style={{
            display: 'grid',
            gridTemplateColumns: gridColumnsWithPrefix,
            alignItems: 'center',
            minWidth,
          }}
        >
          {headerPrefix}
          {columns.map((column) => (
            <AnalysisTableHeaderCell
              key={column.key}
              column={column}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      <div
        className="flex-1 min-h-0 overflow-auto"
        style={{ scrollbarGutter: 'stable' }}
      >
        {data.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div style={{ minWidth }}>
            {data.map((item, index) => renderRow(item, index))}
          </div>
        )}
      </div>
    </div>
  )
}

export const AnalysisTable = memo(AnalysisTableInner) as typeof AnalysisTableInner

export function buildGridColumns<TSortKey extends string>(
  columns: AnalysisTableColumn<TSortKey>[],
  prefix?: string
): string {
  const colWidths = columns.map(col => col.width).join(' ')
  return prefix ? `${prefix} ${colWidths}` : colWidths
}
