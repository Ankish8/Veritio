'use client'

/**
 * Categorical Comparison Visualization
 *
 * Side-by-side horizontal percentage bars for choice questions.
 * CSS-only bars (no Recharts) matching the ChoiceContent pattern.
 */

import { useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const DESIGN_A_COLOR = '#3b82f6' // blue-500
const DESIGN_B_COLOR = '#f97316' // orange-500

interface CategoricalComparisonVizProps {
  responsesA: any[]
  responsesB: any[]
}

interface OptionRow {
  option: string
  countA: number
  countB: number
  pctA: number
  pctB: number
  diff: number
}

export function CategoricalComparisonViz({ responsesA, responsesB }: CategoricalComparisonVizProps) {
  const rows = useMemo(() => {
    const freqA = new Map<string, number>()
    const freqB = new Map<string, number>()

    for (const r of responsesA) {
      const vals = extractValues(r.response_value)
      for (const v of vals) freqA.set(v, (freqA.get(v) || 0) + 1)
    }
    for (const r of responsesB) {
      const vals = extractValues(r.response_value)
      for (const v of vals) freqB.set(v, (freqB.get(v) || 0) + 1)
    }

    const allOptions = new Set([...freqA.keys(), ...freqB.keys()])
    const totalA = responsesA.length || 1
    const totalB = responsesB.length || 1

    const result: OptionRow[] = []
    for (const option of allOptions) {
      const countA = freqA.get(option) || 0
      const countB = freqB.get(option) || 0
      const pctA = (countA / totalA) * 100
      const pctB = (countB / totalB) * 100
      result.push({ option, countA, countB, pctA, pctB, diff: pctB - pctA })
    }

    // Sort by total count descending
    result.sort((a, b) => (b.countA + b.countB) - (a.countA + a.countB))
    return result
  }, [responsesA, responsesB])

  if (rows.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No response data to compare.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.option} className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium truncate max-w-[60%]">{row.option}</span>
            <DiffIndicator diff={row.diff} />
          </div>

          {/* Design A bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs w-8 shrink-0 text-right" style={{ color: DESIGN_A_COLOR }}>A</span>
            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${row.pctA}%`, backgroundColor: DESIGN_A_COLOR }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-20 shrink-0 text-right">
              {row.countA} ({row.pctA.toFixed(0)}%)
            </span>
          </div>

          {/* Design B bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs w-8 shrink-0 text-right" style={{ color: DESIGN_B_COLOR }}>B</span>
            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${row.pctB}%`, backgroundColor: DESIGN_B_COLOR }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-20 shrink-0 text-right">
              {row.countB} ({row.pctB.toFixed(0)}%)
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function DiffIndicator({ diff }: { diff: number }) {
  if (Math.abs(diff) < 1) {
    return <span className="text-xs text-muted-foreground">--</span>
  }
  const sign = diff > 0 ? '+' : ''
  const color = Math.abs(diff) >= 10 ? 'text-foreground font-medium' : 'text-muted-foreground'
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`text-xs ${color}`}>
            {sign}{diff.toFixed(0)}pp
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Design B is {Math.abs(diff).toFixed(1)} percentage points {diff > 0 ? 'higher' : 'lower'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function extractValues(responseValue: any): string[] {
  if (Array.isArray(responseValue)) return responseValue.map(String)
  if (typeof responseValue === 'string') return [responseValue]
  if (typeof responseValue === 'boolean') return [responseValue ? 'Yes' : 'No']
  if (typeof responseValue === 'number') return [String(responseValue)]
  return []
}
