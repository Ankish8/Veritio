'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { getHeatmapColor, getHeatmapTextColor } from '@/lib/colors'

interface ResultsMatrixProps {
  cards: Array<{ id: string; label: string; description?: string | null }>
  categories: Array<{ id: string; label: string; description?: string | null }>
  responses: Array<{
    participant_id: string
    card_placements: Record<string, string> | unknown
  }>
}

interface MatrixCell {
  cardId: string
  categoryId: string
  count: number
  percentage: number
  isTopChoice: boolean
}

interface MatrixRow {
  card: { id: string; label: string; description?: string | null }
  cells: MatrixCell[]
  agreement: number
}

export function ResultsMatrix({ cards, categories, responses }: ResultsMatrixProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)

  // Calculate matrix data
  const { rows, totalResponses } = useMemo(() => {
    const responseCount = responses.length

    if (responseCount === 0) {
      return {
        rows: cards.map((card) => ({
          card,
          cells: categories.map((cat) => ({
            cardId: card.id,
            categoryId: cat.id,
            count: 0,
            percentage: 0,
            isTopChoice: false,
          })),
          agreement: 0,
        })),
        totalResponses: 0,
      }
    }

    // Count placements for each card-category pair
    const placementCounts = new Map<string, number>()

    for (const response of responses) {
      const placements = (response.card_placements || {}) as Record<string, string>

      for (const [cardId, categoryLabel] of Object.entries(placements)) {
        // Find category by label (for closed sorts, placements use category labels)
        const category = categories.find(
          (c) => c.label === categoryLabel || c.id === categoryLabel
        )
        if (category) {
          const key = `${cardId}:${category.id}`
          placementCounts.set(key, (placementCounts.get(key) || 0) + 1)
        }
      }
    }

    // Build rows
    const matrixRows: MatrixRow[] = cards.map((card) => {
      const cells: MatrixCell[] = categories.map((category) => {
        const key = `${card.id}:${category.id}`
        const count = placementCounts.get(key) || 0
        const percentage = Math.round((count / responseCount) * 100)

        return {
          cardId: card.id,
          categoryId: category.id,
          count,
          percentage,
          isTopChoice: false,
        }
      })

      // Find top category
      let maxCount = 0
      let topCategoryIndex = -1
      cells.forEach((cell, idx) => {
        if (cell.count > maxCount) {
          maxCount = cell.count
          topCategoryIndex = idx
        }
      })

      if (topCategoryIndex >= 0) {
        cells[topCategoryIndex].isTopChoice = true
      }

      const agreement = topCategoryIndex >= 0 ? cells[topCategoryIndex].percentage : 0

      return {
        card,
        cells,
        agreement,
      }
    })

    return {
      rows: matrixRows,
      totalResponses: responseCount,
    }
  }, [cards, categories, responses])

  const cellSize = 48
  const labelWidth = 160

  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Results Matrix</CardTitle>
          <CardDescription>
            No pre-defined categories found. The Results Matrix is only available for closed card sorts.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card data-pdf-chart="results-matrix">
      <CardHeader>
        <CardTitle>Results Matrix</CardTitle>
        <CardDescription>
          Shows how participants sorted cards into your pre-defined categories.
          Darker blue indicates more participants chose that placement.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <TooltipProvider>
          <div className="overflow-x-auto px-4 pb-4">
            <div className="w-full">
              {/* Header row with category labels */}
              <div className="flex border-b border-slate-200">
                <div
                  style={{ width: labelWidth, minWidth: labelWidth }}
                  className="flex items-end justify-end pr-3 pb-2"
                >
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Cards
                  </span>
                </div>
                {categories.map((category, _idx) => (
                  <div
                    key={category.id}
                    style={{ width: cellSize, minWidth: cellSize }}
                    className="flex items-end justify-center pb-2"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="text-[12px] font-medium text-slate-600 origin-bottom-left transform -rotate-45 whitespace-nowrap truncate cursor-help"
                          style={{ maxWidth: cellSize * 2.5 }}
                        >
                          {category.label}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{category.label}</p>
                        {category.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {category.description}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ))}
                {/* Agreement column */}
                <div
                  style={{ width: 80, minWidth: 80 }}
                  className="flex items-end justify-center pb-2 pl-2"
                >
                  <span className="text-[12px] font-medium text-slate-600 uppercase tracking-wide">
                    Agreement
                  </span>
                </div>
              </div>

              {/* Matrix rows */}
              {rows.map((row, rowIdx) => (
                <div
                  key={row.card.id}
                  className={`flex border-b border-slate-100 ${
                    hoveredCell?.row === rowIdx ? 'bg-slate-50' : ''
                  }`}
                >
                  {/* Card label */}
                  <div
                    style={{ width: labelWidth, minWidth: labelWidth }}
                    className="flex items-center pr-3 py-1"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm text-right truncate w-full cursor-help">
                          {row.card.label}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p className="font-medium">{row.card.label}</p>
                        {row.card.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {row.card.description}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Cells */}
                  {row.cells.map((cell, colIdx) => (
                    <Tooltip key={`${row.card.id}-${cell.categoryId}`}>
                      <TooltipTrigger asChild>
                        <div
                          style={{
                            width: cellSize,
                            height: cellSize,
                            minWidth: cellSize,
                            backgroundColor: getHeatmapColor(cell.percentage),
                            color: getHeatmapTextColor(cell.percentage),
                          }}
                          className={`
                            flex items-center justify-center
                            border border-white/60
                            cursor-pointer
                            transition-all
                            ${cell.isTopChoice ? 'ring-2 ring-blue-600 ring-inset' : ''}
                            ${hoveredCell?.col === colIdx ? 'ring-1 ring-slate-400' : ''}
                          `}
                          onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          <span className="text-xs font-medium">
                            {cell.count > 0 ? cell.count : ''}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          <p className="font-medium">
                            {cell.count} participant{cell.count !== 1 ? 's' : ''} ({cell.percentage}%)
                          </p>
                          <p className="text-muted-foreground text-xs mt-1">
                            {row.card.label} → {categories[colIdx].label}
                          </p>
                          {cell.isTopChoice && (
                            <Badge className="mt-2 bg-blue-100 text-blue-800">
                              Top choice
                            </Badge>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}

                  {/* Agreement indicator */}
                  <div
                    style={{ width: 80, minWidth: 80 }}
                    className="flex items-center justify-center pl-2"
                  >
                    <Badge
                      variant={row.agreement >= 60 ? 'default' : 'outline'}
                      className={
                        row.agreement >= 60
                          ? 'bg-green-100 text-green-800'
                          : row.agreement >= 40
                          ? 'bg-amber-100 text-amber-800'
                          : ''
                      }
                    >
                      {row.agreement}%
                    </Badge>
                  </div>
                </div>
              ))}

              {/* Legend */}
              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Fewer placements</span>
                  <div className="flex">
                    {[0, 15, 30, 45, 60, 75, 90].map((value) => (
                      <div
                        key={value}
                        style={{
                          width: 20,
                          height: 12,
                          backgroundColor: getHeatmapColor(value),
                        }}
                        className="border border-white/50"
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">More placements</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Based on {totalResponses} participant{totalResponses !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
