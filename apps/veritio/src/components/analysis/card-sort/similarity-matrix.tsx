'use client'

import { useMemo, memo } from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { SimilarityResult } from '@/lib/algorithms/similarity-matrix'
import { getHeatmapColor, getHeatmapTextColorGray } from '@/lib/colors'

interface SimilarityMatrixProps {
  data: SimilarityResult
  optimalOrder?: string[]
  headerActions?: React.ReactNode
  participantCount?: number
}

const CELL_SIZE = 32

const MatrixCell = memo(function MatrixCell({
  value,
  count,
  rowLabel,
  colLabel,
}: {
  value: number
  count: number
  rowLabel: string
  colLabel: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          style={{
            minWidth: CELL_SIZE,
            height: CELL_SIZE - 8,
            backgroundColor: getHeatmapColor(value),
            color: getHeatmapTextColorGray(value),
          }}
          className="flex items-center justify-center text-sm font-medium cursor-pointer hover:ring-2 hover:ring-stone-800 hover:ring-inset transition-shadow"
        >
          {value}
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="bg-stone-900 text-white border-stone-800"
      >
        <p className="font-medium">
          {colLabel} / {rowLabel} - grouped together by {value}% of participants ({count}{' '}
          {count === 1 ? 'time' : 'times'})
        </p>
      </TooltipContent>
    </Tooltip>
  )
})

export const SimilarityMatrix = memo(function SimilarityMatrix({
  data,
  optimalOrder,
  headerActions,
  participantCount,
}: SimilarityMatrixProps) {
  // Reorder matrix according to optimal order if provided
  const { orderedMatrix, orderedCountMatrix, orderedLabels } = useMemo(() => {
    if (!optimalOrder || optimalOrder.length !== data.cardLabels.length) {
      return {
        orderedMatrix: data.matrix,
        orderedCountMatrix: data.countMatrix,
        orderedLabels: data.cardLabels,
      }
    }

    const newLabels = optimalOrder.filter((l) => data.cardLabels.includes(l))
    const newMatrix = newLabels.map((rowLabel) => {
      const rowIdx = data.cardLabels.indexOf(rowLabel)
      return newLabels.map((colLabel) => {
        const colIdx = data.cardLabels.indexOf(colLabel)
        return data.matrix[rowIdx][colIdx]
      })
    })
    const newCountMatrix = newLabels.map((rowLabel) => {
      const rowIdx = data.cardLabels.indexOf(rowLabel)
      return newLabels.map((colLabel) => {
        const colIdx = data.cardLabels.indexOf(colLabel)
        return data.countMatrix[rowIdx][colIdx]
      })
    })

    return {
      orderedMatrix: newMatrix,
      orderedCountMatrix: newCountMatrix,
      orderedLabels: newLabels,
    }
  }, [data, optimalOrder])

  return (
    <div className="rounded-lg border bg-card" data-pdf-chart="similarity-matrix">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Similarity matrix</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p>
                Shows how often each pair of cards was placed in the same
                category. Darker blue indicates higher agreement between
                participants.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-3">
          {participantCount !== undefined && (
            <span className="text-sm text-muted-foreground border rounded-md px-2 py-1">
              {participantCount} of {participantCount} Participants
            </span>
          )}
          {headerActions}
        </div>
      </div>

      {/* Matrix Content */}
      <div className="p-0">
        <TooltipProvider delayDuration={0}>
          <div className="overflow-x-auto px-4 pb-4">
            <div className="w-full">
              {/* Triangular matrix - each row has rowIndex cells followed by the label */}
              {orderedLabels.map((rowLabel, rowIdx) => (
                <div key={`row-${rowIdx}`} className="flex items-center">
                  {/* Cells for this row - row 0 has 0 cells, row 1 has 1 cell, etc */}
                  {rowIdx > 0 &&
                    Array.from({ length: rowIdx }).map((_, colIdx) => (
                      <MatrixCell
                        key={`cell-${rowIdx}-${colIdx}`}
                        value={orderedMatrix[rowIdx][colIdx]}
                        count={orderedCountMatrix[rowIdx][colIdx]}
                        rowLabel={rowLabel}
                        colLabel={orderedLabels[colIdx]}
                      />
                    ))}

                  {/* Row label */}
                  <span className="text-sm text-foreground ml-2 whitespace-nowrap">
                    {rowLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TooltipProvider>
      </div>
    </div>
  )
})
