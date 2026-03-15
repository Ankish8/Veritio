'use client'

import { useState, useCallback } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn, stripPipingHtml } from '@/lib/utils'
import type {
  CorrelationMatrixData,
  CorrelationPair,
  CorrelationDisplayOptions,
  QuestionCorrelationInfo,
} from './types'
import { getPairKey } from './types'
import {
  getCorrelationStrength,
  getCorrelationHeatmapColor,
} from '@/lib/algorithms/correlation-statistics'

interface CorrelationMatrixProps {
  data: CorrelationMatrixData
  displayOptions: CorrelationDisplayOptions
  onCellClick?: (pair: CorrelationPair) => void
}

function getCellColor(pair: CorrelationPair | null, isDiagonal: boolean): string {
  if (isDiagonal) return 'bg-muted/30'
  if (!pair) return 'bg-muted/10'
  return getCorrelationHeatmapColor(pair.result.coefficient, pair.result.isSignificant)
}

function formatCoefficient(pair: CorrelationPair | null, isDiagonal: boolean): string {
  if (isDiagonal) return '1.00'
  if (!pair) return '—'
  return pair.result.coefficient.toFixed(2)
}

function getStrengthSymbol(pair: CorrelationPair): string {
  const { coefficient, isSignificant } = pair.result
  if (!isSignificant) return '○'

  const strength = getCorrelationStrength(coefficient)
  const sign = coefficient > 0 ? '+' : '-'

  switch (strength) {
    case 'strong': return sign + sign + sign
    case 'moderate': return sign + sign
    case 'weak': return sign
    default: return '○'
  }
}

function QuestionTooltipContent({ question }: { question: QuestionCorrelationInfo }) {
  return (
    <>
      <p className="font-medium" style={{ color: '#ffffff' }}>{stripPipingHtml(question.text)}</p>
      <p className="text-xs mt-1" style={{ color: '#a1a1aa' }}>Type: {question.type}</p>
    </>
  )
}

function CorrelationTooltip({
  pair,
  question1,
  question2,
}: {
  pair: CorrelationPair
  question1: QuestionCorrelationInfo
  question2: QuestionCorrelationInfo
}) {
  const { result } = pair

  return (
    <div className="space-y-2" style={{ color: '#ffffff' }}>
      <div>
        <p className="font-medium text-sm" style={{ color: '#ffffff' }}>{stripPipingHtml(question1.shortText)}</p>
        <p className="text-xs" style={{ color: '#a1a1aa' }}>vs</p>
        <p className="font-medium text-sm" style={{ color: '#ffffff' }}>{stripPipingHtml(question2.shortText)}</p>
      </div>
      <div className="pt-2 space-y-1 text-xs" style={{ borderTop: '1px solid #52525b' }}>
        <div className="flex justify-between gap-4">
          <span style={{ color: '#a1a1aa' }}>Correlation:</span>
          <span className="font-medium" style={{ color: result.coefficient > 0 ? '#34d399' : '#f87171' }}>
            {result.coefficient.toFixed(3)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: '#a1a1aa' }}>Strength:</span>
          <span className="capitalize" style={{ color: '#ffffff' }}>{result.strength}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: '#a1a1aa' }}>p-value:</span>
          <span style={{ color: result.isSignificant ? '#34d399' : '#ffffff' }}>
            {result.pValue < 0.001 ? '< 0.001' : result.pValue.toFixed(3)}
            {result.isSignificant && ' *'}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: '#a1a1aa' }}>Sample size:</span>
          <span style={{ color: '#ffffff' }}>{result.n}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: '#a1a1aa' }}>Method:</span>
          <span className="capitalize" style={{ color: '#ffffff' }}>{result.method.replace('_', ' ')}</span>
        </div>
      </div>
      {result.isSignificant && (
        <p className="text-xs pt-1" style={{ color: '#34d399', borderTop: '1px solid #52525b' }}>
          ✓ Statistically significant (p &lt; 0.05)
        </p>
      )}
    </div>
  )
}

function MatrixCell({
  rowQ,
  colQ,
  pair,
  isDiagonal,
  cellKey,
  isHovered,
  displayOptions,
  onCellClick,
  onHover,
}: {
  rowQ: QuestionCorrelationInfo
  colQ: QuestionCorrelationInfo
  pair: CorrelationPair | null
  isDiagonal: boolean
  cellKey: string
  isHovered: boolean
  displayOptions: CorrelationDisplayOptions
  onCellClick?: (pair: CorrelationPair) => void
  onHover: (key: string | null) => void
}) {
  if (!isDiagonal && pair) {
    return (
      <td className="p-0" style={{ width: '48px', height: '48px' }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'w-10 h-10 mx-auto flex items-center justify-center rounded text-[11px] font-medium transition-all',
                getCellColor(pair, false),
                'cursor-pointer hover:ring-2 hover:ring-primary/50',
                isHovered && 'ring-2 ring-primary'
              )}
              onClick={() => onCellClick?.(pair)}
              onMouseEnter={() => onHover(cellKey)}
              onMouseLeave={() => onHover(null)}
            >
              {displayOptions.showCoefficients
                ? <span>{formatCoefficient(pair, false)}</span>
                : <span className="text-[12px]">{getStrengthSymbol(pair)}</span>
              }
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[350px]">
            <CorrelationTooltip pair={pair} question1={rowQ} question2={colQ} />
          </TooltipContent>
        </Tooltip>
      </td>
    )
  }

  return (
    <td className="p-0" style={{ width: '48px', height: '48px' }}>
      <div
        className={cn(
          'w-10 h-10 mx-auto flex items-center justify-center rounded text-[11px] font-medium',
          getCellColor(pair, isDiagonal),
          isDiagonal ? 'cursor-default' : 'cursor-default opacity-50'
        )}
      >
        {displayOptions.showCoefficients && (
          <span>{formatCoefficient(pair, isDiagonal)}</span>
        )}
      </div>
    </td>
  )
}

export function CorrelationMatrix({
  data,
  displayOptions,
  onCellClick,
}: CorrelationMatrixProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)
  const { questions, pairs } = data

  const getCorrelation = useCallback((q1Id: string, q2Id: string): CorrelationPair | null => {
    if (q1Id === q2Id) return null
    return pairs.get(getPairKey(q1Id, q2Id)) || null
  }, [pairs])

  return (
    <TooltipProvider>
      <div className="overflow-x-auto" data-pdf-chart="correlation-matrix">
        <div className="inline-block min-w-full">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="p-2 min-w-[120px]" />
                {questions.map((q, idx) => (
                  <th key={q.id} className="p-1 text-center font-normal" style={{ width: '48px', minWidth: '48px' }}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-10 h-10 flex items-center justify-center mx-auto rounded border border-border/50 bg-muted/20 cursor-help text-muted-foreground text-[12px] font-medium">
                          Q{idx + 1}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[300px]">
                        <QuestionTooltipContent question={q} />
                      </TooltipContent>
                    </Tooltip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {questions.map((rowQ, rowIdx) => (
                <tr key={rowQ.id}>
                  <td className="p-2 text-right pr-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help text-muted-foreground hover:text-foreground transition-colors">
                          <span className="font-medium text-foreground">Q{rowIdx + 1}</span>
                          <span className="ml-2 text-muted-foreground">{stripPipingHtml(rowQ.shortText)}</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[300px]">
                        <QuestionTooltipContent question={rowQ} />
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  {questions.map((colQ, colIdx) => (
                    <MatrixCell
                      key={colQ.id}
                      rowQ={rowQ}
                      colQ={colQ}
                      pair={getCorrelation(rowQ.id, colQ.id)}
                      isDiagonal={rowIdx === colIdx}
                      cellKey={`${rowIdx}-${colIdx}`}
                      isHovered={hoveredCell === `${rowIdx}-${colIdx}`}
                      displayOptions={displayOptions}
                      onCellClick={onCellClick}
                      onHover={setHoveredCell}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Legend */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Negative</span>
              <div className="flex gap-0.5">
                <div className="w-5 h-5 rounded bg-red-500/80" />
                <div className="w-5 h-5 rounded bg-red-400/60" />
                <div className="w-5 h-5 rounded bg-red-300/40" />
                <div className="w-5 h-5 rounded bg-muted/50" />
                <div className="w-5 h-5 rounded bg-emerald-300/40" />
                <div className="w-5 h-5 rounded bg-emerald-400/60" />
                <div className="w-5 h-5 rounded bg-emerald-500/80" />
              </div>
              <span>Positive</span>
            </div>
            <div className="text-muted-foreground/70">
              Darker = Stronger correlation
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
