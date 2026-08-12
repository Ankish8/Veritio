'use client'

import React, { useState, useCallback, useMemo, useRef, ReactNode, useLayoutEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Button } from '@veritio/ui/components/button'
import { Checkbox } from '@veritio/ui/components/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@veritio/ui/components/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import {
  EyeOff,
  UserPlus,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react'
import { toast } from '@veritio/ui/components/sonner'
import { usePagination, PAGE_SIZE_OPTIONS } from '../hooks'

/** Minimum number of selected participants to trigger a confirmation dialog */
const BULK_CONFIRM_THRESHOLD = 3

/**
 * Drop the cells whose column is currently hidden.
 *
 * `renderColumns`/`renderRow` hand back an opaque tree, so the cells are
 * matched to columns by position. React.Children.toArray drops the `false`
 * that a conditional column renders, which is exactly what the width arrays
 * already assume, so the indexes line up.
 */
function filterCellsByColumn(
  cells: ReactNode,
  isVisible: (index: number) => boolean
): ReactNode[] {
  const unwrapped =
    React.isValidElement<{ children?: ReactNode }>(cells) && cells.type === React.Fragment
      ? cells.props.children
      : cells
  return React.Children.toArray(unwrapped).filter((_, index) => isVisible(index))
}

/**
 * Percentage column tracks are only safe if they add up to the full width and
 * pair 1:1 with their minimums. A short/long array or a total over 100% pushes
 * the trailing columns past the container, which is how header labels end up
 * painted on top of each other. Surfaced in dev and test, never in production.
 */
export function assertValidColumnWidths(
  columnWidths: string[],
  columnMinWidths?: number[],
  columnVisibleFrom?: number[]
): string[] {
  const problems: string[] = []

  if (columnMinWidths && columnMinWidths.length !== columnWidths.length) {
    problems.push(
      `columnMinWidths has ${columnMinWidths.length} entries but columnWidths has ${columnWidths.length}`
    )
  }

  if (columnVisibleFrom && columnVisibleFrom.length !== columnWidths.length) {
    problems.push(
      `columnVisibleFrom has ${columnVisibleFrom.length} entries but columnWidths has ${columnWidths.length}`
    )
  }

  const percentages = columnWidths.filter((w) => w.trim().endsWith('%'))
  if (percentages.length === columnWidths.length) {
    const total = percentages.reduce((sum, w) => sum + parseFloat(w), 0)
    // Tolerance covers rounding in tables that compute widths proportionally.
    if (Math.abs(total - 100) > 0.5) {
      problems.push(`column widths total ${total.toFixed(1)}%, expected 100%`)
    }
  }

  if (problems.length > 0) {
    console.error(
      `[ParticipantsListBase] Invalid column layout: ${problems.join('; ')}. ` +
        `Columns will overlap or be clipped.`
    )
  }

  return problems
}

// Estimated row height for virtualization
const ROW_HEIGHT = 52
export interface RowHandlers {
  isSelected: boolean
  onToggleSelect: () => void
  onToggleExclude: (exclude: boolean) => void
  onClick: () => void
}
export interface DialogHandlers {
  onClose: () => void
  onNavigate: (direction: 'prev' | 'next') => void
  canNavigatePrev: boolean
  canNavigateNext: boolean
  onToggleExclude?: (participantId: string, exclude: boolean) => void
}
export interface ParticipantsListBaseProps<T> {
  items: T[]
  getParticipantId: (item: T) => string
  isExcluded: (item: T) => boolean
  onExclusionChange?: (participantId: string, exclude: boolean) => void
  /** Efficient bulk exclusion change — single API call for multiple participants */
  onBulkExclusionChange?: (participantIds: string[], exclude: boolean) => void
  /** Permanently delete participants and all of their study-scoped data */
  onDeleteParticipants?: (participantIds: string[]) => Promise<number | void>
  renderColumns: () => ReactNode
  renderRow: (item: T, index: number, handlers: RowHandlers) => ReactNode
  renderDetailDialog: (
    item: T | null,
    index: number,
    handlers: DialogHandlers
  ) => ReactNode
  columnWidths?: string[]
  /**
   * Per-column minimum width in px, positionally matching `columnWidths`.
   * Percentage tracks alone shrink without limit, so on a narrow container the
   * labels stop fitting. Supplying minimums turns each track into
   * `minmax(<min>px, <percentage>)` and lets the table scroll horizontally
   * rather than squeezing columns into each other. Use `0` for a column that
   * has no meaningful minimum.
   */
  columnMinWidths?: number[]
  /**
   * Per-column minimum *container* width in px at which the column appears,
   * positionally matching `columnWidths`. Below it the column is dropped from
   * both the header and every row, and the remaining percentages are rescaled
   * to fill the row.
   *
   * This is what makes the table responsive: instead of squeezing ten columns
   * into a phone, the least important ones step aside and the row's detail
   * panel stays the complete record. Use `0`/omit for a column that must
   * always be present. Order the thresholds by how much the column matters,
   * not by its position.
   */
  columnVisibleFrom?: number[]
  /**
   * Row renderer for narrow screens. A phone cannot show a ten-column table,
   * and dropping columns there would strand the data, because the row detail
   * panel is not reachable on mobile. So below `mobileCardBelow` the table
   * becomes a stacked card per participant with every value laid out
   * vertically: nothing to scroll sideways for, nothing hidden.
   *
   * Tables that do not supply this keep the grid at every width.
   */
  renderMobileCard?: (item: T, index: number, handlers: RowHandlers) => ReactNode
  /** Table width below which `renderMobileCard` takes over. Defaults to 640. */
  mobileCardBelow?: number
  emptyTitle?: string
  emptyDescription?: string
  noMatchMessage?: string
  showSelection?: boolean
  showBulkActions?: boolean
  paginationLabel?: string
}
export function ParticipantsListBase<T>({
  items,
  getParticipantId,
  isExcluded: _isExcluded,
  onExclusionChange,
  onBulkExclusionChange,
  onDeleteParticipants,
  renderColumns,
  renderRow,
  renderDetailDialog,
  columnWidths,
  columnMinWidths,
  columnVisibleFrom,
  renderMobileCard,
  mobileCardBelow = 640,
  emptyTitle = 'No participants yet',
  emptyDescription = 'Participants will appear here once they start your study.',
  noMatchMessage = 'No participants match the current filters.',
  showSelection = true,
  showBulkActions = true,
  paginationLabel = 'participants',
}: ParticipantsListBaseProps<T>) {
  const tableRef = useRef<HTMLDivElement>(null)
  const [tableWidth, setTableWidth] = useState(0)
  const [selectedParticipant, setSelectedParticipant] = useState<T | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkActioning, setIsBulkActioning] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; exclude: boolean }>({ open: false, exclude: true })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Track mounted state to defer virtualization until scroll container is ready
  // This prevents flushSync warnings from TanStack Virtual measuring during render
  const [isMounted, setIsMounted] = useState(false)

  const pagination = usePagination(items, { defaultPageSize: 50 })

  // Ref for the scrollable container (virtualization)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Set mounted after initial render when DOM refs are available
  useLayoutEffect(() => {
    setIsMounted(true)
  }, [])

  // Virtualizer for the paginated items
  const virtualizer = useVirtualizer({
    count: pagination.items.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  })

  // Selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === pagination.items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pagination.items.map((item) => getParticipantId(item))))
    }
  }, [selectedIds.size, pagination.items, getParticipantId])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }, [])

  // Execute the bulk exclusion (called directly or after confirmation)
  const executeBulkExclude = useCallback(
    (exclude: boolean) => {
      const ids = [...selectedIds]
      if (ids.length === 0) return

      setIsBulkActioning(true)

      if (onBulkExclusionChange) {
        // Use efficient bulk API
        onBulkExclusionChange(ids, exclude)
      } else if (onExclusionChange) {
        // Fallback: individual calls
        for (const id of ids) {
          onExclusionChange(id, exclude)
        }
      }

      setSelectedIds(new Set())
      setIsBulkActioning(false)
    },
    [selectedIds, onExclusionChange, onBulkExclusionChange]
  )

  // Bulk exclude/include handler — shows confirmation for 3+ participants
  const handleBulkExclude = useCallback(
    (exclude: boolean) => {
      if (!onExclusionChange && !onBulkExclusionChange) return

      if (exclude && selectedIds.size >= BULK_CONFIRM_THRESHOLD) {
        setConfirmDialog({ open: true, exclude })
      } else {
        executeBulkExclude(exclude)
      }
    },
    [selectedIds.size, onExclusionChange, onBulkExclusionChange, executeBulkExclude]
  )

  const executeBulkDelete = useCallback(async () => {
    const ids = [...selectedIds]
    if (!onDeleteParticipants || ids.length === 0) return

    setIsBulkActioning(true)

    try {
      const confirmedCount = await onDeleteParticipants(ids)
      const deletedCount = confirmedCount ?? ids.length

      setSelectedIds(new Set())
      setSelectedParticipant(null)
      toast.success(
        `${deletedCount} ${deletedCount === 1 ? 'participant' : 'participants'} deleted permanently`,
      )
    } catch (error) {
      toast.error('Participants could not be deleted', {
        description:
          error instanceof Error
            ? error.message
            : 'Please try again.',
      })
    } finally {
      setIsBulkActioning(false)
      setDeleteDialogOpen(false)
    }
  }, [onDeleteParticipants, selectedIds])

  // Detail dialog handlers
  const handleSelectParticipant = useCallback((item: T, index: number) => {
    // Toggle behavior: if clicking the same participant, close the panel
    const clickedId = getParticipantId(item)
    const currentId = selectedParticipant ? getParticipantId(selectedParticipant) : null

    if (clickedId === currentId) {
      // Same participant clicked - close the panel
      setSelectedParticipant(null)
    } else {
      // Different participant - open/switch to their panel
      setSelectedParticipant(item)
      setSelectedIndex(index)
    }
  }, [getParticipantId, selectedParticipant])

  const handleNavigateParticipant = useCallback(
    (direction: 'prev' | 'next') => {
      const currentItems = pagination.items
      const newIndex = direction === 'prev' ? selectedIndex - 1 : selectedIndex + 1
      if (newIndex >= 0 && newIndex < currentItems.length) {
        setSelectedParticipant(currentItems[newIndex])
        setSelectedIndex(newIndex)
      }
    },
    [pagination.items, selectedIndex]
  )

  // Responsive columns are driven by the table's own width rather than the
  // viewport, because the dashboard sidebar and the shared-results layout give
  // the same viewport very different amounts of room.
  const needsWidth = !!columnVisibleFrom || !!renderMobileCard
  useLayoutEffect(() => {
    const el = tableRef.current
    if (!el || !needsWidth) return

    const measure = () => setTableWidth(el.clientWidth)
    measure()

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [needsWidth])

  // Only switch to cards once the width is actually known, so the server-rendered
  // and first-paint output stays the table.
  const isCardLayout = !!renderMobileCard && tableWidth > 0 && tableWidth < mobileCardBelow

  // Which columns survive at the current width. `null` means "no responsive
  // config, render everything" so tables that opt out are untouched.
  const visibleColumnIndexes = useMemo(() => {
    if (!columnWidths || columnWidths.length === 0 || !columnVisibleFrom) return null
    // Before the first measurement (and during SSR) assume there is room, so
    // the table never flashes a stripped-down set of columns on the way in.
    const available = tableWidth || Number.POSITIVE_INFINITY
    const kept = columnWidths
      .map((_, i) => i)
      .filter((i) => (columnVisibleFrom[i] ?? 0) <= available)
    return new Set(kept)
  }, [columnWidths, columnVisibleFrom, tableWidth])

  const isColumnVisible = useCallback(
    (index: number) => !visibleColumnIndexes || visibleColumnIndexes.has(index),
    [visibleColumnIndexes]
  )

  // Hiding columns leaves the percentages short of 100, so rescale what is left
  // to fill the row exactly.
  const effectiveColumnWidths = useMemo(() => {
    if (!columnWidths || !visibleColumnIndexes) return columnWidths
    const kept = columnWidths.filter((_, i) => visibleColumnIndexes.has(i))
    if (!kept.every((w) => w.trim().endsWith('%'))) return kept
    const total = kept.reduce((sum, w) => sum + parseFloat(w), 0)
    if (total <= 0) return kept
    return kept.map((w) => `${((parseFloat(w) / total) * 100).toFixed(3)}%`)
  }, [columnWidths, visibleColumnIndexes])

  const effectiveColumnMinWidths = useMemo(() => {
    if (!columnMinWidths || !visibleColumnIndexes) return columnMinWidths
    return columnMinWidths.filter((_, i) => visibleColumnIndexes.has(i))
  }, [columnMinWidths, visibleColumnIndexes])

  const hasColumnWidths = !!effectiveColumnWidths && effectiveColumnWidths.length > 0

  // The author-supplied arrays are the contract, so they are what gets checked.
  if (process.env.NODE_ENV !== 'production' && columnWidths && columnWidths.length > 0) {
    assertValidColumnWidths(columnWidths, columnMinWidths, columnVisibleFrom)
  }

  // Each track becomes `minmax(<min>px, <percentage>)` when a minimum is given,
  // so a column can never be squeezed below the width its content needs.
  const gridTemplateColumns = useMemo(() => {
    if (!effectiveColumnWidths || effectiveColumnWidths.length === 0) return undefined

    return effectiveColumnWidths
      .map((width, i) => {
        const min = effectiveColumnMinWidths?.[i]
        return min && min > 0 ? `minmax(${min}px, ${width})` : width
      })
      .join(' ')
  }, [effectiveColumnWidths, effectiveColumnMinWidths])

  // Once the container is narrower than the sum of the minimums the table
  // scrolls horizontally instead of overlapping its own columns. With
  // `columnVisibleFrom` configured this is a backstop that should rarely fire.
  const tableMinWidth = useMemo(() => {
    if (!effectiveColumnMinWidths || effectiveColumnMinWidths.length === 0) return undefined
    return effectiveColumnMinWidths.reduce((sum, min) => sum + (min || 0), 0)
  }, [effectiveColumnMinWidths])

  // Empty state
  if (items.length === 0) {
    return (
      <div className="py-8 sm:py-12 text-center">
        <Users className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
        <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-medium">{emptyTitle}</h3>
        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground px-4">{emptyDescription}</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col flex-1 min-h-[400px]">
        {/* Bulk actions - responsive wrap */}
        {showBulkActions &&
          selectedIds.size > 0 &&
          (onExclusionChange || onBulkExclusionChange || onDeleteParticipants) && (
          <div className="flex flex-wrap items-center gap-2 p-2 bg-muted rounded-lg mb-3 sm:mb-4 shrink-0">
            <span className="text-xs sm:text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <div className="flex-1 min-w-[50px]" />
            <div className="flex gap-2">
              {(onExclusionChange || onBulkExclusionChange) && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 sm:h-8 text-xs sm:text-sm"
                    onClick={() => handleBulkExclude(true)}
                    disabled={isBulkActioning}
                  >
                    <EyeOff className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Exclude
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 sm:h-8 text-xs sm:text-sm"
                    onClick={() => handleBulkExclude(false)}
                    disabled={isBulkActioning}
                  >
                    <UserPlus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Include
                  </Button>
                </>
              )}
              {onDeleteParticipants && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 sm:h-8 text-xs sm:text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isBulkActioning}
                >
                  {isBulkActioning ? (
                    <Loader2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                  {isBulkActioning ? 'Deleting…' : 'Delete'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Header and body share one horizontal scroller so their columns can
            never drift out of alignment. */}
        <div ref={tableRef} className="flex flex-col flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
        {isCardLayout ? (
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/50 border-t">
            {pagination.items.map((item, index) => {
              const id = getParticipantId(item)
              const handlers: RowHandlers = {
                isSelected: selectedIds.has(id),
                onToggleSelect: () => toggleSelect(id),
                onToggleExclude: (exclude) => onExclusionChange?.(id, exclude),
                onClick: () => handleSelectParticipant(item, index),
              }
              return <div key={id}>{renderMobileCard!(item, index, handlers)}</div>
            })}
          </div>
        ) : (
        <div className="flex flex-col flex-1 min-h-0" style={{ minWidth: tableMinWidth }}>
        {/* Table Header - fixed above scroll, uses CSS Grid to match virtualized body */}
        <div className="shrink-0 overflow-hidden" style={{ scrollbarGutter: 'stable' }}>
          <div
            className="flex items-center border-b text-sm text-muted-foreground"
            style={
              hasColumnWidths
                ? {
                    display: 'grid',
                    gridTemplateColumns,
                    alignItems: 'center',
                    minHeight: '40px',
                  }
                : undefined
            }
          >
            {showSelection && isColumnVisible(0) && (
              <div className="flex min-w-0 items-center justify-center px-4">
                <Checkbox
                  checked={
                    selectedIds.size === pagination.items.length &&
                    pagination.items.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </div>
            )}
            {/* Header cells start at column 1 — the base owns the checkbox track. */}
            {visibleColumnIndexes
              ? filterCellsByColumn(renderColumns(), (i) => isColumnVisible(i + 1))
              : renderColumns()}
          </div>
        </div>

        {/* Body - scrollable with virtualization */}
        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style={{ scrollbarGutter: 'stable' }}>
          {/* Only render virtualized content after mount to prevent flushSync warnings */}
          {isMounted && (
            <div
              style={{
                height: virtualizer.getTotalSize(),
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const item = pagination.items[virtualItem.index]
                const id = getParticipantId(item)
                const handlers: RowHandlers = {
                  isSelected: selectedIds.has(id),
                  onToggleSelect: () => toggleSelect(id),
                  onToggleExclude: (exclude) => onExclusionChange?.(id, exclude),
                  onClick: () => handleSelectParticipant(item, virtualItem.index),
                }
                const row = renderRow(item, virtualItem.index, handlers)

                // Clone the row element and inject virtual positioning + CSS Grid styles
                if (React.isValidElement(row)) {
                  const gridStyle: React.CSSProperties = hasColumnWidths
                    ? {
                        display: 'grid',
                        gridTemplateColumns,
                        alignItems: 'center',
                      }
                    : {}

                  const rowElement = row as React.ReactElement<{
                    style?: React.CSSProperties
                    children?: ReactNode
                  }>
                  const rowProps = {
                    key: virtualItem.key,
                    style: {
                      ...(rowElement.props.style || {}),
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                      position: 'absolute' as const,
                      top: 0,
                      left: 0,
                      width: '100%',
                      ...gridStyle,
                    },
                  }

                  // Row cells include the checkbox, so they index from 0.
                  return visibleColumnIndexes
                    ? React.cloneElement(
                        rowElement,
                        rowProps,
                        filterCellsByColumn(rowElement.props.children, isColumnVisible)
                      )
                    : React.cloneElement(rowElement, rowProps)
                }
                return row
              })}
            </div>
          )}
        </div>
        </div>
        )}
        </div>

        {pagination.items.length === 0 && items.length > 0 && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            {noMatchMessage}
          </div>
        )}

        {/* Pagination - responsive stacking */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 sm:pt-4 border-t shrink-0">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>Show</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(v) => pagination.setPageSize(parseInt(v))}
            >
              <SelectTrigger className="w-[70px] sm:w-[80px] h-7 sm:h-8 text-xs sm:text-sm">
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
            <span className="hidden sm:inline">{paginationLabel} per page</span>
            <span className="sm:hidden">per page</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm text-muted-foreground">
              <span className="hidden sm:inline">Showing </span>
              {pagination.showingRange.from}-{pagination.showingRange.to}
              <span className="hidden sm:inline"> of</span>
              <span className="sm:hidden">/</span> {pagination.totalItems}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={pagination.previousPage}
                disabled={!pagination.hasPreviousPage}
              >
                <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={pagination.nextPage}
                disabled={!pagination.hasNextPage}
              >
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      {renderDetailDialog(selectedParticipant, selectedIndex, {
        onClose: () => setSelectedParticipant(null),
        onNavigate: handleNavigateParticipant,
        canNavigatePrev: selectedIndex > 0,
        canNavigateNext: selectedIndex < pagination.items.length - 1,
        onToggleExclude: onExclusionChange,
      })}

      {/* Bulk exclude confirmation dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ open: false, exclude: true })
        }}
      >
        <AlertDialogContent size="lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Exclude {selectedIds.size} participants from analysis?
            </AlertDialogTitle>
            <AlertDialogDescription>
              These participants will be hidden from analysis calculations. You can include them again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                executeBulkExclude(confirmDialog.exclude)
                setConfirmDialog({ open: false, exclude: true })
              }}
            >
              Exclude {selectedIds.size} participants
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent participant deletion confirmation */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!isBulkActioning) setDeleteDialogOpen(open)
        }}
      >
        <AlertDialogContent size="lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.size}{' '}
              {selectedIds.size === 1 ? 'participant' : 'participants'} permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All responses, analysis data, recordings, and transcripts for{' '}
              {selectedIds.size === 1 ? 'this participant' : 'these participants'} will
              be permanently deleted. Any generated AI insights report for this study
              will also be removed and can be regenerated. This cannot be undone.
              Reusable Panel profiles will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkActioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isBulkActioning}
              onClick={() => {
                void executeBulkDelete()
              }}
            >
              {isBulkActioning ? 'Deleting…' : `Delete ${selectedIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
