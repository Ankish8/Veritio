'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowUpDown, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StandardizationMapping } from '@/lib/algorithms/category-standardization'
import { applyStandardization, getUniqueCategoryNames } from '@/lib/algorithms/category-standardization'
import { getHeatmapColor, getHeatmapTextColor } from '@/lib/colors'

interface StandardizationGridProps {
  cards: Array<{ id: string; label: string; description?: string | null }>
  responses: Array<{
    participant_id?: string
    card_placements: Record<string, string> | unknown
  }>
  standardizations: StandardizationMapping[]
  showRawCategories?: boolean
  headerActions?: React.ReactNode
}

type SortMode = 'alphabetical' | 'frequency-high' | 'frequency-low'

export function StandardizationGrid({
  cards,
  responses,
  standardizations,
  showRawCategories = false,
  headerActions,
}: StandardizationGridProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('alphabetical')
  const [columnSort, setColumnSort] = useState<{
    columnIndex: number | null
    direction: 'asc' | 'desc'
  }>({ columnIndex: null, direction: 'desc' })

  const handleColumnSort = (colIdx: number) => {
    setColumnSort(prev => {
      if (prev.columnIndex !== colIdx) {
        // New column - start with descending (highest first)
        return { columnIndex: colIdx, direction: 'desc' }
      }
      if (prev.direction === 'desc') {
        // Cycle: desc -> asc
        return { columnIndex: colIdx, direction: 'asc' }
      }
      // Cycle: asc -> unsorted (null)
      return { columnIndex: null, direction: 'desc' }
    })
  }

  // Get all unique category names (with or without standardization)
  const categoryNames = useMemo(() => {
    // Cast responses to match algorithm expectations
    const typedResponses = responses.map(r => ({
      card_placements: (r.card_placements || {}) as Record<string, string>
    }))
    if (showRawCategories || standardizations.length === 0) {
      return getUniqueCategoryNames(typedResponses)
    }
    return getUniqueCategoryNames(typedResponses, standardizations)
  }, [responses, standardizations, showRawCategories])

  // Calculate grid data
  const { gridData, categoryTotals, totalResponses } = useMemo(() => {
    const responseCount = responses.length
    const categoryTotalsMap = new Map<string, number>()

    // Initialize grid
    const grid: Map<string, Map<string, number>> = new Map()
    for (const card of cards) {
      grid.set(card.id, new Map())
    }

    // Count placements
    for (const response of responses) {
      // Apply standardization if available
      const placements = showRawCategories || standardizations.length === 0
        ? (response.card_placements as Record<string, string>)
        : applyStandardization(
            { card_placements: response.card_placements as Record<string, string> },
            standardizations
          )

      for (const [cardId, categoryName] of Object.entries(placements)) {
        if (grid.has(cardId)) {
          const cardMap = grid.get(cardId)!
          cardMap.set(categoryName, (cardMap.get(categoryName) || 0) + 1)
          categoryTotalsMap.set(categoryName, (categoryTotalsMap.get(categoryName) || 0) + 1)
        }
      }
    }

    return {
      gridData: grid,
      categoryTotals: categoryTotalsMap,
      totalResponses: responseCount,
    }
  }, [cards, responses, standardizations, showRawCategories])

  // Sort categories based on mode
  const sortedCategories = useMemo(() => {
    const sorted = [...categoryNames]

    switch (sortMode) {
      case 'alphabetical':
        return sorted.sort((a, b) => a.localeCompare(b))
      case 'frequency-high':
        return sorted.sort((a, b) => (categoryTotals.get(b) || 0) - (categoryTotals.get(a) || 0))
      case 'frequency-low':
        return sorted.sort((a, b) => (categoryTotals.get(a) || 0) - (categoryTotals.get(b) || 0))
      default:
        return sorted
    }
  }, [categoryNames, sortMode, categoryTotals])

  // Sort cards (rows) by a specific column's values when column sort is active
  const sortedCards = useMemo(() => {
    if (columnSort.columnIndex === null) return cards

    const categoryName = sortedCategories[columnSort.columnIndex]
    return [...cards].sort((a, b) => {
      const aCount = gridData.get(a.id)?.get(categoryName) || 0
      const bCount = gridData.get(b.id)?.get(categoryName) || 0

      if (aCount !== bCount) {
        return columnSort.direction === 'asc' ? aCount - bCount : bCount - aCount
      }
      // Stable sort fallback: alphabetical by card label
      return a.label.localeCompare(b.label)
    })
  }, [cards, gridData, sortedCategories, columnSort])

  // Responsive cell sizing
  const cellHeight = 44
  const labelWidthPercent = 15 // Label column takes 15%
  const cellWidthPercent = sortedCategories.length > 0 ? (85 / sortedCategories.length) : 10 // Remaining 85% divided among categories

  if (categoryNames.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Standardization Grid</CardTitle>
          <CardDescription>
            No categories found. This view is available after participants have submitted responses.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg">Standardization Grid</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Shows how often each card was placed in each{' '}
              {showRawCategories ? 'participant-created' : 'standardized'} category.
              <span className="hidden sm:inline"> Darker blue indicates more frequent placement.</span>
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {headerActions}
            <Select value={sortMode} onValueChange={(v) => {
              setSortMode(v as SortMode)
              setColumnSort({ columnIndex: null, direction: 'desc' }) // Reset column sort
            }}>
              <SelectTrigger className="w-[140px] sm:w-[180px] h-8 sm:h-9 text-xs sm:text-sm">
                <ArrowUpDown className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
                <SelectItem value="frequency-high">Most frequent first</SelectItem>
                <SelectItem value="frequency-low">Least frequent first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <TooltipProvider>
          <div className="overflow-x-auto">
            <div className="w-full">
              {/* Header row with category labels */}
              <div className="flex border-b border-slate-200" style={{ height: 100 }}>
                <div
                  className="flex items-end justify-end pr-3 pb-2 flex-shrink-0"
                  style={{ width: `${labelWidthPercent}%` }}
                >
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Cards
                  </span>
                </div>
                {sortedCategories.map((categoryName, idx) => (
                  <div
                    key={categoryName}
                    className="flex items-end justify-center pb-2 cursor-pointer group"
                    style={{ width: `${cellWidthPercent}%` }}
                    onClick={() => handleColumnSort(idx)}
                  >
                    <div className="relative flex flex-col items-center">
                      {/* Sort indicator */}
                      <div className="h-3 mb-0.5 flex items-center justify-center">
                        {columnSort.columnIndex === idx ? (
                          columnSort.direction === 'desc' ? (
                            <ChevronDown className="h-3 w-3 text-slate-700" />
                          ) : (
                            <ChevronUp className="h-3 w-3 text-slate-700" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              "text-xs font-medium origin-bottom-left transform -rotate-45 whitespace-nowrap cursor-pointer transition-all",
                              hoveredCell?.col === idx ? "font-bold text-foreground" : "text-muted-foreground",
                              columnSort.columnIndex === idx && "text-blue-700 font-bold"
                            )}
                          >
                            {categoryName}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{categoryName}</p>
                          <p className="text-xs text-muted-foreground">
                            {categoryTotals.get(categoryName) || 0} total placements
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Click to sort rows by this column
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid rows */}
              {sortedCards.map((card, rowIdx) => {
                const cardData = gridData.get(card.id) || new Map()

                return (
                  <div
                    key={card.id}
                    className={cn(
                      "flex border-b border-border",
                      hoveredCell?.row === rowIdx && "bg-muted/50"
                    )}
                  >
                    {/* Card label */}
                    <div
                      className="flex items-center pr-3 py-1 flex-shrink-0 overflow-hidden"
                      style={{ width: `${labelWidthPercent}%` }}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              "text-sm text-right truncate w-full cursor-help transition-all",
                              hoveredCell?.row === rowIdx && "font-semibold text-foreground"
                            )}
                          >
                            {card.label}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p className="font-medium">{card.label}</p>
                          {card.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {card.description}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Cells */}
                    {sortedCategories.map((categoryName, colIdx) => {
                      const count = cardData.get(categoryName) || 0
                      const percentage = totalResponses > 0
                        ? Math.round((count / totalResponses) * 100)
                        : 0

                      return (
                        <Tooltip key={`${card.id}-${categoryName}`}>
                          <TooltipTrigger asChild>
                            <div
                              style={{
                                height: cellHeight,
                                width: `${cellWidthPercent}%`,
                                backgroundColor: getHeatmapColor(percentage),
                                color: getHeatmapTextColor(percentage, 50),
                              }}
                              className="flex items-center justify-center border border-white/60 cursor-pointer transition-all"
                              onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              <span className="text-xs font-medium">
                                {count > 0 ? count : ''}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <p className="font-medium">
                                {count} participant{count !== 1 ? 's' : ''} ({percentage}%)
                              </p>
                              <p className="text-muted-foreground text-xs mt-1">
                                {card.label} → {categoryName}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                )
              })}

              {/* Legend - responsive stacking */}
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">Fewer</span>
                  <div className="flex">
                    {[0, 10, 20, 30, 45, 60, 80].map((value) => (
                      <div
                        key={value}
                        style={{
                          width: 16,
                          height: 10,
                          backgroundColor: getHeatmapColor(value),
                        }}
                        className="border border-white/50 sm:w-5 sm:h-3"
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:inline">More</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {totalResponses} participant{totalResponses !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
