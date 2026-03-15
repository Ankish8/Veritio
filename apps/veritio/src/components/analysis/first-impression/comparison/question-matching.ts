/**
 * Question matching algorithm for design comparison.
 *
 * Matches questions across two designs by position index.
 * Handles field aliases (question_type/type, question_text/prompt)
 * and flags incompatible type pairs.
 */

import type { FirstImpressionDesign, FirstImpressionDesignQuestion } from '@/services/results/first-impression'
import { getComparisonStrategy, type ComparisonStrategy } from '@/lib/utils/question-helpers'

export interface MatchedQuestionPair {
  position: number
  questionA: FirstImpressionDesignQuestion | null
  questionB: FirstImpressionDesignQuestion | null
  comparisonStrategy: ComparisonStrategy
  matchConfidence: 'exact' | 'type-match' | 'position-only' | 'unmatched'
}

/** Normalize field aliases — DB JSONB uses question_type/question_text */
function getQuestionType(q: FirstImpressionDesignQuestion): string {
  return q.type || q.question_type || 'unknown'
}

function getQuestionText(q: FirstImpressionDesignQuestion): string {
  return q.prompt || q.question_text || ''
}

/** Normalize type for comparison (e.g. single_line_text → short_text) */
function normalizeType(type: string): string {
  const aliases: Record<string, string> = {
    single_line_text: 'short_text',
    multi_line_text: 'long_text',
  }
  return aliases[type] || type
}

function resolveStrategy(typeA: string, typeB: string): ComparisonStrategy {
  const stratA = getComparisonStrategy(typeA)
  const stratB = getComparisonStrategy(typeB)

  if (stratA === stratB) return stratA
  return 'incompatible'
}

function resolveConfidence(
  qA: FirstImpressionDesignQuestion,
  qB: FirstImpressionDesignQuestion,
): MatchedQuestionPair['matchConfidence'] {
  const typeA = normalizeType(getQuestionType(qA))
  const typeB = normalizeType(getQuestionType(qB))
  const textA = getQuestionText(qA).toLowerCase().trim()
  const textB = getQuestionText(qB).toLowerCase().trim()

  if (typeA === typeB && textA === textB && textA.length > 0) return 'exact'
  if (typeA === typeB) return 'type-match'
  return 'position-only'
}

export function matchQuestions(
  designA: FirstImpressionDesign,
  designB: FirstImpressionDesign,
): MatchedQuestionPair[] {
  const questionsA = [...(designA.questions || [])].sort((a, b) => a.position - b.position)
  const questionsB = [...(designB.questions || [])].sort((a, b) => a.position - b.position)

  const maxLen = Math.max(questionsA.length, questionsB.length)
  const pairs: MatchedQuestionPair[] = []

  for (let i = 0; i < maxLen; i++) {
    const qA = questionsA[i] ?? null
    const qB = questionsB[i] ?? null

    if (qA && qB) {
      const typeA = normalizeType(getQuestionType(qA))
      const typeB = normalizeType(getQuestionType(qB))

      pairs.push({
        position: i,
        questionA: qA,
        questionB: qB,
        comparisonStrategy: resolveStrategy(typeA, typeB),
        matchConfidence: resolveConfidence(qA, qB),
      })
    } else {
      pairs.push({
        position: i,
        questionA: qA,
        questionB: qB,
        comparisonStrategy: 'incompatible',
        matchConfidence: 'unmatched',
      })
    }
  }

  return pairs
}

export { getQuestionType, getQuestionText }
