'use client'

import React, { useState, useCallback, useRef, ReactNode, useLayoutEffect } from 'react'
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
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react'
import { usePagination, PAGE_SIZE_OPTIONS } from '../hooks'

/** Minimum number of selected participants to trigger a confirmation dialog */
const BULK_CONFIRM_THRESHOLD = 3

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
  renderColumns: () => ReactNode
  renderRow: (item: T, index: number, handlers: RowHandlers) => ReactNode
  renderDetailDialog: (
    item: T | null,
    index: number,
    handlers: DialogHandlers
  ) => ReactNode
  columnWidths?: string[]
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
  renderColumns,
  renderRow,
  renderDetailDialog,
  columnWidths,
  emptyTitle = 'No participants yet',
  emptyDescription = 'Participants will appear here once they start your study.',
  noMatchMessage = 'No participants match the current filters.',
  showSelection = true,
  showBulkActions = true,
  paginationLabel = 'participants',
}: ParticipantsListBaseProps<T>) {
  const [selectedParticipant, setSelectedParticipant] = useState<T | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkActioning, setIsBulkActioning] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; exclude: boolean }>({ open: false, exclude: true })

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
        {showBulkActions && selectedIds.size > 0 && (onExclusionChange || onBulkExclusionChange) && (
          <div className="flex flex-wrap items-center gap-2 p-2 bg-muted rounded-lg mb-3 sm:mb-4 shrink-0">
            <span className="text-xs sm:text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <div className="flex-1 min-w-[50px]" />
            <div className="flex gap-2">
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
            </div>
          </div>
        )}

        {/* Table Header - fixed above scroll, uses CSS Grid to match virtualized body */}
        <div className="shrink-0 overflow-y-hidden" style={{ scrollbarGutter: 'stable' }}>
          <div
            className="flex items-center border-b text-sm text-muted-foreground"
            style={
              columnWidths && columnWidths.length > 0
                ? {
                    display: 'grid',
                    gridTemplateColumns: columnWidths.join(' '),
                    alignItems: 'center',
                    minHeight: '40px',
                  }
                : undefined
            }
          >
            {showSelection && (
              <div className="flex items-center justify-center px-4">
                <Checkbox
                  checked={
                    selectedIds.size === pagination.items.length &&
                    pagination.items.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </div>
            )}
            {renderColumns()}
          </div>
        </div>

        {/* Body - scrollable with virtualization */}
        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-auto" style={{ scrollbarGutter: 'stable' }}>
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
                  const gridStyle: React.CSSProperties = columnWidths && columnWidths.length > 0
                    ? {
                        display: 'grid',
                        gridTemplateColumns: columnWidths.join(' '),
                        alignItems: 'center',
                      }
                    : {}

                  return React.cloneElement(row as React.ReactElement<{ style?: React.CSSProperties }>, {
                    key: virtualItem.key,
                    style: {
                      ...((row as React.ReactElement<{ style?: React.CSSProperties }>).props.style || {}),
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                      position: 'absolute' as const,
                      top: 0,
                      left: 0,
                      width: '100%',
                      ...gridStyle,
                    },
                  })
                }
                return row
              })}
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
    </>
  )
}
