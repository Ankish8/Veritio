'use client'

import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Column {
  key: string
  label: string
  sortable?: boolean
  className?: string
  render?: (row: any) => ReactNode
}

interface AdminDataTableProps {
  columns: Column[]
  data: any[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  isLoading?: boolean
  emptyMessage?: string
  emptyIcon?: ReactNode
  onRowClick?: (row: any) => void
}

export function AdminDataTable({
  columns,
  data,
  page,
  totalPages,
  onPageChange,
  isLoading,
  emptyMessage = 'No data found',
  emptyIcon,
  onRowClick,
}: AdminDataTableProps) {
  return (
    <div className="rounded-xl bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        <Skeleton className="h-4 w-full max-w-[180px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data.map((row, i) => (
                  <TableRow
                    key={row.id ?? i}
                    onClick={() => onRowClick?.(row)}
                    className={onRowClick ? 'cursor-pointer' : ''}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render ? col.render(row) : row[col.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {!isLoading && data.length === 0 && (
        <div className="py-16 text-center">
          {emptyIcon && <div className="flex justify-center mb-3">{emptyIcon}</div>}
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
