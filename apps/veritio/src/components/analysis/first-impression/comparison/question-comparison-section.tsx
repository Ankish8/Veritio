'use client'

/**
 * Question-by-Question Comparison Section
 *
 * Orchestrator that:
 * 1. Matches questions across two designs by position
 * 2. Filters raw responses per design+question
 * 3. Runs appropriate stat test per comparison strategy
 * 4. Renders QuestionComparisonCard per matched pair
 */

import { useMemo } from 'react'
import { MessageSquare } from 'lucide-react'
import { extractNumericValue } from '@/lib/utils/question-helpers'
import { tTest } from '@/lib/algorithms/ab-test-analysis'
import { chiSquareTest } from '@/lib/algorithms/ab-test-analysis'
import { matchQuestions } from './question-matching'
import { QuestionComparisonCard } from './question-comparison-card'
import type { DesignWithMetrics } from './comparison-tab'
import type {
  FirstImpressionResultsResponse,
  FirstImpressionDesign,
} from '@/services/results/first-impression'

interface QuestionComparisonSectionProps {
  designA: DesignWithMetrics
  designB: DesignWithMetrics
  results: FirstImpressionResultsResponse
}

export function QuestionComparisonSection({
  designA,
  designB,
  results,
}: QuestionComparisonSectionProps) {
  // Match questions by position
  const pairs = useMemo(
    () => matchQuestions(designA as FirstImpressionDesign, designB as FirstImpressionDesign),
    [designA, designB],
  )

  // Pre-filter responses by design
  const responsesByDesignA = useMemo(
    () => results.responses.filter(r => r.design_id === designA.id),
    [results.responses, designA.id],
  )
  const responsesByDesignB = useMemo(
    () => results.responses.filter(r => r.design_id === designB.id),
    [results.responses, designB.id],
  )

  // Compute per-pair data: filtered responses + p-value
  const pairData = useMemo(() => {
    return pairs.map(pair => {
      const responsesA = pair.questionA
        ? responsesByDesignA.filter(r => r.question_id === pair.questionA!.id)
        : []
      const responsesB = pair.questionB
        ? responsesByDesignB.filter(r => r.question_id === pair.questionB!.id)
        : []

      let pValue: number | null = null

      if (pair.comparisonStrategy === 'numeric' && responsesA.length > 0 && responsesB.length > 0) {
        const numA = responsesA
          .map(r => extractNumericValue(r.response_value))
          .filter((v): v is number => v !== null)
        const numB = responsesB
          .map(r => extractNumericValue(r.response_value))
          .filter((v): v is number => v !== null)
        if (numA.length >= 2 && numB.length >= 2) {
          pValue = tTest(numA, numB).pValue
        }
      } else if (pair.comparisonStrategy === 'categorical' && responsesA.length > 0 && responsesB.length > 0) {
        const valA = responsesA.map(r => r.response_value)
        const valB = responsesB.map(r => r.response_value)
        pValue = chiSquareTest(valA, valB).pValue
      }

      return { pair, responsesA, responsesB, pValue }
    })
  }, [pairs, responsesByDesignA, responsesByDesignB])

  const designAName = designA.name || `Design ${designA.position + 1}`
  const designBName = designB.name || `Design ${designB.position + 1}`

  // No questions on either design
  if (pairs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="font-medium text-sm">No questions to compare</p>
        <p className="text-xs mt-1">
          Neither design has questions configured.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Question-by-Question Comparison</h3>
        <span className="text-xs text-muted-foreground">
          {pairs.length} question{pairs.length !== 1 ? 's' : ''} matched
        </span>
      </div>

      {pairData.map(({ pair, responsesA, responsesB, pValue }) => (
        <QuestionComparisonCard
          key={pair.position}
          pair={pair}
          responsesA={responsesA}
          responsesB={responsesB}
          designAName={designAName}
          designBName={designBName}
          pValue={pValue}
        />
      ))}
    </div>
  )
}
