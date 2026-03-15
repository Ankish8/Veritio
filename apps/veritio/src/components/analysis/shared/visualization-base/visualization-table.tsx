'use client'

import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * Column definition for visualization tables
 */
export interface VisualizationColumn<T> {
  /** Unique key for the column */
  key: string
  /** Header text */
  header: string
  /** Width class (Tailwind) */
  width?: string
  /** Text alignment */
  align?: 'left' | 'center' | 'right'
  /** Render function for cell content */
  render: (row: T, index: number) => React.ReactNode
}

export interface VisualizationTableProps<T> {
  /** Data rows to render */
  data: T[]
  /** Column definitions */
  columns: VisualizationColumn<T>[]
  /** Unique key extractor for rows */
  getRowKey: (row: T, index: number) => string
  /** Minimum table width (default: 400px) */
  minWidth?: string
  /** Empty state message */
  emptyMessage?: string
  /** Additional content after table */
  footer?: React.ReactNode
}

/**
 * Responsive table wrapper for visualization components.
 * Provides consistent styling and responsive behavior.
 */
export function VisualizationTable<T>({
  data,
  columns,
  getRowKey,
  minWidth = '400px',
  emptyMessage = 'No data available',
  footer,
}: VisualizationTableProps<T>) {
  const alignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'right':
        return 'text-right'
      case 'center':
        return 'text-center'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
        <Table style={{ minWidth }}>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`${col.width || ''} ${alignClass(col.align)} text-xs sm:text-sm`}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((row, index) => (
                <TableRow key={getRowKey(row, index)}>
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={`${alignClass(col.align)} text-xs sm:text-sm`}
                    >
                      {col.render(row, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground text-xs sm:text-sm"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {footer}
    </div>
  )
}
