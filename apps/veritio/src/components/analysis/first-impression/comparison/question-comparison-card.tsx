'use client'

/**
 * Question Comparison Card
 *
 * Per-question wrapper that shows:
 * - Question number, text, type badge, response counts
 * - Significance badge (for numeric/categorical)
 * - Delegates body to the appropriate viz component
 */

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertCircle, Info } from 'lucide-react'
import { formatQuestionType } from '@/lib/utils/question-helpers'
import type { MatchedQuestionPair } from './question-matching'
import { getQuestionText, getQuestionType } from './question-matching'
import { NumericComparisonViz } from './numeric-comparison-viz'
import { CategoricalComparisonViz } from './categorical-comparison-viz'
import { TextComparisonViz } from './text-comparison-viz'

const DESIGN_A_COLOR = '#3b82f6'
const DESIGN_B_COLOR = '#f97316'

interface QuestionComparisonCardProps {
  pair: MatchedQuestionPair
  responsesA: any[]
  responsesB: any[]
  designAName: string
  designBName: string
  pValue: number | null
}

export const QuestionComparisonCard = memo(function QuestionComparisonCard({
  pair,
  responsesA,
  responsesB,
  designAName,
  designBName,
  pValue,
}: QuestionComparisonCardProps) {
  const { position, questionA, questionB, comparisonStrategy, matchConfidence } = pair

  // Use question A's text/type as primary (fallback to B)
  const questionText = questionA
    ? getQuestionText(questionA)
    : questionB
      ? getQuestionText(questionB)
      : 'Unknown question'
  const questionType = questionA
    ? getQuestionType(questionA)
    : questionB
      ? getQuestionType(questionB)
      : 'unknown'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium">
              Q{position + 1}: {questionText}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge variant="secondary" className="text-xs">
                {formatQuestionType(questionType)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                <span style={{ color: DESIGN_A_COLOR }}>{responsesA.length}</span>
                {' vs '}
                <span style={{ color: DESIGN_B_COLOR }}>{responsesB.length}</span>
                {' responses'}
              </span>
              {matchConfidence === 'position-only' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs gap-1 cursor-help">
                        <AlertCircle className="h-3 w-3" />
                        Type mismatch
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        These questions have different types and are matched by position only.
                        Comparison may not be meaningful.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {/* Significance indicator */}
          {pValue !== null && comparisonStrategy !== 'text' && (
            <PValueBadge pValue={pValue} />
          )}
        </div>
      </CardHeader>

      <CardContent>
        {comparisonStrategy === 'incompatible' ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            {!questionA || !questionB
              ? 'No matching question in the other design.'
              : 'Question types are incompatible for comparison.'}
          </div>
        ) : comparisonStrategy === 'numeric' ? (
          <NumericComparisonViz
            responsesA={responsesA}
            responsesB={responsesB}
            designAName={designAName}
            designBName={designBName}
          />
        ) : comparisonStrategy === 'categorical' ? (
          <CategoricalComparisonViz
            responsesA={responsesA}
            responsesB={responsesB}
          />
        ) : comparisonStrategy === 'text' ? (
          <TextComparisonViz
            responsesA={responsesA}
            responsesB={responsesB}
            designAName={designAName}
            designBName={designBName}
          />
        ) : null}
      </CardContent>
    </Card>
  )
})

function PValueBadge({ pValue }: { pValue: number }) {
  const isSignificant = pValue < 0.05
  const label = isSignificant ? `p=${pValue.toFixed(3)}` : 'ns'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`text-xs cursor-help shrink-0 ${
              isSignificant
                ? 'border-green-300 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-300'
                : ''
            }`}
          >
            <Info className="h-3 w-3 mr-1" />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">
            {isSignificant
              ? `Statistically significant difference (p=${pValue.toFixed(4)}). Less than 5% chance this difference is due to random variation.`
              : `Not statistically significant (p=${pValue.toFixed(4)}). The difference could be due to chance. More responses may help detect a real difference.`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
