'use client'

/**
 * Text Comparison Visualization
 *
 * Side-by-side word clouds at reduced height + keyword delta table
 * showing the biggest frequency differences between designs.
 */

import { useMemo, useState } from 'react'
import { buildWordData, DEFAULT_STOP_WORDS } from '@/lib/utils/question-helpers'
import { WordCloudVisualization, type WordData } from '../word-cloud/word-cloud-visualization'
import { ArrowUp, ArrowDown } from 'lucide-react'

const DESIGN_A_COLOR = '#3b82f6'
const DESIGN_B_COLOR = '#f97316'

interface TextComparisonVizProps {
  responsesA: any[]
  responsesB: any[]
  designAName: string
  designBName: string
}

interface KeywordDelta {
  word: string
  pctA: number
  pctB: number
  diff: number
  favors: 'A' | 'B'
}

export function TextComparisonViz({
  responsesA,
  responsesB,
  designAName,
  designBName,
}: TextComparisonVizProps) {
  const [selectedWordA, setSelectedWordA] = useState<string | null>(null)
  const [selectedWordB, setSelectedWordB] = useState<string | null>(null)

  const wordDataA = useMemo(() => buildWordData(responsesA, DEFAULT_STOP_WORDS), [responsesA])
  const wordDataB = useMemo(() => buildWordData(responsesB, DEFAULT_STOP_WORDS), [responsesB])

  const deltas = useMemo(() => computeKeywordDeltas(wordDataA, wordDataB), [wordDataA, wordDataB])

  if (responsesA.length === 0 && responsesB.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No text responses to compare.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Side-by-side word clouds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: DESIGN_A_COLOR }}>
            {designAName} ({responsesA.length} responses)
          </p>
          <div className="border rounded-lg p-2 min-h-[200px]">
            {wordDataA.length > 0 ? (
              <WordCloudVisualization
                wordData={wordDataA}
                onWordClick={setSelectedWordA}
                selectedWord={selectedWordA}
              />
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                Not enough text data
              </div>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: DESIGN_B_COLOR }}>
            {designBName} ({responsesB.length} responses)
          </p>
          <div className="border rounded-lg p-2 min-h-[200px]">
            {wordDataB.length > 0 ? (
              <WordCloudVisualization
                wordData={wordDataB}
                onWordClick={setSelectedWordB}
                selectedWord={selectedWordB}
              />
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                Not enough text data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyword delta table */}
      {deltas.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Keyword Differences (top words that differ most)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Word</th>
                  <th className="text-right py-2 font-medium" style={{ color: DESIGN_A_COLOR }}>
                    {designAName}
                  </th>
                  <th className="text-right py-2 font-medium" style={{ color: DESIGN_B_COLOR }}>
                    {designBName}
                  </th>
                  <th className="text-right py-2 font-medium">Diff</th>
                  <th className="text-left py-2 pl-2 font-medium">Favors</th>
                </tr>
              </thead>
              <tbody>
                {deltas.map((d) => (
                  <tr key={d.word} className="border-b last:border-0">
                    <td className="py-1.5 font-medium">{d.word}</td>
                    <td className="text-right py-1.5 tabular-nums">{d.pctA.toFixed(1)}%</td>
                    <td className="text-right py-1.5 tabular-nums">{d.pctB.toFixed(1)}%</td>
                    <td className="text-right py-1.5 tabular-nums">
                      {d.diff > 0 ? '+' : ''}{d.diff.toFixed(1)}%
                    </td>
                    <td className="py-1.5 pl-2">
                      <span
                        className="inline-flex items-center gap-0.5 text-xs font-medium"
                        style={{ color: d.favors === 'A' ? DESIGN_A_COLOR : DESIGN_B_COLOR }}
                      >
                        {d.favors === 'B' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {d.favors === 'A' ? designAName : designBName}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function computeKeywordDeltas(wordDataA: WordData[], wordDataB: WordData[]): KeywordDelta[] {
  const pctMapA = new Map(wordDataA.map(w => [w.text, w.percentage]))
  const pctMapB = new Map(wordDataB.map(w => [w.text, w.percentage]))

  const allWords = new Set([...pctMapA.keys(), ...pctMapB.keys()])
  const deltas: KeywordDelta[] = []

  for (const word of allWords) {
    const pctA = pctMapA.get(word) || 0
    const pctB = pctMapB.get(word) || 0
    const diff = pctB - pctA

    if (Math.abs(diff) >= 1) {
      deltas.push({
        word,
        pctA,
        pctB,
        diff,
        favors: diff > 0 ? 'B' : 'A',
      })
    }
  }

  // Sort by absolute difference descending, take top 10
  deltas.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
  return deltas.slice(0, 10)
}
