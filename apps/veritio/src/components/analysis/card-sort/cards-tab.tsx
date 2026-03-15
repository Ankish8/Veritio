'use client'

import { useState, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Folder,
  Search,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CardsTabProps {
  cards: Array<{ id: string; label: string; description?: string | null }>
  responses: Array<{
    participant_id: string
    card_placements: Record<string, string> | unknown
    /** Optional: card positions within categories for position calculation */
    card_positions?: Record<string, number> | unknown
  }>
  categories: Array<{ id: string; label: string; description?: string | null }>
  mode: 'open' | 'closed' | 'hybrid'
  /** Optional slot for header actions (e.g., segment dropdown) */
  headerActions?: React.ReactNode
}

interface CategoryData {
  name: string
  frequency: number
  averagePosition: number
}

interface CardAnalysis {
  card: { id: string; label: string; description?: string | null }
  sortedIntoCount: number
  categories: CategoryData[]
  topCategory: CategoryData | null
}

type SortColumn = 'card' | 'sortedInto' | 'categories' | 'frequency' | 'position'
type SortDirection = 'asc' | 'desc'

interface FlattenedRow {
  cardId: string
  cardLabel: string
  sortedIntoCount: number
  categoryName: string | null
  frequency: number | null
  averagePosition: number | null
  isFirstCategoryForCard: boolean
  totalCategoriesForCard: number
}

const ROW_HEIGHT = 52

export function CardsTab({ cards, responses, categories: _categories, mode: _mode, headerActions }: CardsTabProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('card')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllCategories, setShowAllCategories] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const cardAnalyses: CardAnalysis[] = useMemo(() => {
    return cards.map((card) => {
      const categoryData = new Map<string, { count: number; positions: number[] }>()

      for (const response of responses) {
        const placements = (response.card_placements || {}) as Record<string, string>
        const positions = (response.card_positions || {}) as Record<string, number>
        const categoryName = placements[card.id]

        if (categoryName) {
          const existing = categoryData.get(categoryName) || { count: 0, positions: [] }
          existing.count++

          const position = positions[card.id]
          if (typeof position === 'number') {
            existing.positions.push(position)
          }

          categoryData.set(categoryName, existing)
        }
      }

      const categoriesList: CategoryData[] = Array.from(categoryData.entries())
        .map(([name, data]) => ({
          name,
          frequency: data.count,
          averagePosition: data.positions.length > 0
            ? Number((data.positions.reduce((a, b) => a + b, 0) / data.positions.length).toFixed(1))
            : 1.0,
        }))
        .sort((a, b) => b.frequency - a.frequency)

      return {
        card,
        sortedIntoCount: categoryData.size,
        categories: categoriesList,
        topCategory: categoriesList.length > 0 ? categoriesList[0] : null,
      }
    })
  }, [cards, responses])

  const filteredAnalyses = useMemo(() => {
    if (!searchQuery.trim()) return cardAnalyses
    const query = searchQuery.toLowerCase()
    return cardAnalyses.filter(analysis =>
      analysis.card.label.toLowerCase().includes(query) ||
      analysis.categories.some(cat => cat.name.toLowerCase().includes(query))
    )
  }, [cardAnalyses, searchQuery])

  const sortedAnalyses = useMemo(() => {
    return [...filteredAnalyses].sort((a, b) => {
      let comparison = 0

      switch (sortColumn) {
        case 'card':
          comparison = a.card.label.localeCompare(b.card.label)
          break
        case 'sortedInto':
          comparison = a.sortedIntoCount - b.sortedIntoCount
          break
        case 'categories':
          comparison = (a.topCategory?.name || '').localeCompare(b.topCategory?.name || '')
          break
        case 'frequency':
          comparison = (a.topCategory?.frequency || 0) - (b.topCategory?.frequency || 0)
          break
        case 'position':
          comparison = (a.topCategory?.averagePosition || 0) - (b.topCategory?.averagePosition || 0)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredAnalyses, sortColumn, sortDirection])

  const flattenedRows: FlattenedRow[] = useMemo(() => {
    const rows: FlattenedRow[] = []

    for (const analysis of sortedAnalyses) {
      const displayCategories = showAllCategories
        ? analysis.categories
        : analysis.categories.slice(0, 1)

      if (displayCategories.length === 0) {
        rows.push({
          cardId: analysis.card.id,
          cardLabel: analysis.card.label,
          sortedIntoCount: 0,
          categoryName: null,
          frequency: null,
          averagePosition: null,
          isFirstCategoryForCard: true,
          totalCategoriesForCard: 0,
        })
      } else {
        displayCategories.forEach((cat, idx) => {
          rows.push({
            cardId: analysis.card.id,
            cardLabel: analysis.card.label,
            sortedIntoCount: analysis.sortedIntoCount,
            categoryName: cat.name,
            frequency: cat.frequency,
            averagePosition: cat.averagePosition,
            isFirstCategoryForCard: idx === 0,
            totalCategoriesForCard: displayCategories.length,
          })
        })
      }
    }

    return rows
  }, [sortedAnalyses, showAllCategories])

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: flattenedRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const SortIndicator = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />
    }
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 ml-1" />
      : <ChevronDown className="h-3.5 w-3.5 ml-1" />
  }

  const ColumnHeader = ({
    column,
    label,
    tooltip,
    className
  }: {
    column: SortColumn
    label: string
    tooltip: string
    className?: string
  }) => (
    <div
      className={cn(
        "cursor-pointer select-none transition-colors px-4 uppercase text-xs font-semibold tracking-wide",
        className
      )}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <SortIndicator column={column} />
      </div>
    </div>
  )

  if (cards.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        No cards defined for this study.
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base sm:text-lg font-semibold">Your cards</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">
                  Per-card breakdown showing how participants categorized each card.
                  Cards sorted into many categories may be ambiguous or confusing.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="show-all-categories" className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
              Show all
            </Label>
            <Switch
              id="show-all-categories"
              checked={showAllCategories}
              onCheckedChange={setShowAllCategories}
            />
          </div>

          <div className="relative w-[150px] sm:w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 sm:pl-8 h-8 sm:h-9 text-sm"
            />
          </div>

          {headerActions}
        </div>
      </div>

      <div className="flex flex-col h-[500px]">
        <div className="shrink-0 overflow-y-hidden" style={{ scrollbarGutter: 'stable' }}>
          <div
            className="flex items-center border-b text-muted-foreground min-w-[600px]"
            style={{
              display: 'grid',
              gridTemplateColumns: '20% 20% 25% 17.5% 17.5%',
              alignItems: 'center',
              minHeight: '44px',
            }}
          >
            <ColumnHeader
              column="card"
              label="Card"
              tooltip="The card label that participants sorted"
            />
            <ColumnHeader
              column="sortedInto"
              label="Sorted into"
              tooltip="Number of different categories this card was sorted into across all participants"
            />
            <ColumnHeader
              column="categories"
              label="Categories"
              tooltip="The categories where this card was placed, shown with folder icons"
            />
            <ColumnHeader
              column="frequency"
              label="Frequency"
              tooltip="Number of participants who placed this card into each category"
              className="justify-end text-right"
            />
            <ColumnHeader
              column="position"
              label="Position"
              tooltip="Average order position that the card was placed within the category (1.0 = first)"
              className="justify-end text-right"
            />
          </div>
        </div>

        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-auto" style={{ scrollbarGutter: 'stable' }}>
          {flattenedRows.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground">
              {searchQuery ? 'No cards match your search.' : 'No cards to display.'}
            </div>
          ) : (
            <div
              style={{
                height: virtualizer.getTotalSize(),
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const row = flattenedRows[virtualItem.index]
                const isEmptyCard = row.categoryName === null

                return (
                  <div
                    key={`${row.cardId}-${row.categoryName || 'empty'}-${virtualItem.index}`}
                    className={cn(
                      "border-b hover:bg-slate-50/50 transition-colors min-w-[600px]",
                      !row.isFirstCategoryForCard && 'border-t-0'
                    )}
                    style={{
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '20% 20% 25% 17.5% 17.5%',
                      alignItems: 'center',
                    }}
                  >
                    <div className="px-4 py-3">
                      {row.isFirstCategoryForCard ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded bg-muted text-sm font-medium text-foreground">
                          {row.cardLabel}
                        </span>
                      ) : (
                        <span className="text-transparent text-sm">—</span>
                      )}
                    </div>

                    <div className="px-4 py-3">
                      {row.isFirstCategoryForCard ? (
                        <span className="text-sm text-foreground">
                          {row.sortedIntoCount} {row.sortedIntoCount === 1 ? 'category' : 'categories'}
                        </span>
                      ) : (
                        <span className="text-transparent text-sm">—</span>
                      )}
                    </div>

                    <div className="px-4 py-3">
                      {isEmptyCard ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{row.categoryName}</span>
                        </div>
                      )}
                    </div>

                    <div className="px-4 py-3 text-right">
                      {isEmptyCard ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="text-sm font-medium text-foreground">{row.frequency}</span>
                      )}
                    </div>

                    <div className="px-4 py-3 text-right">
                      {isEmptyCard ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="text-sm text-foreground">{row.averagePosition?.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
