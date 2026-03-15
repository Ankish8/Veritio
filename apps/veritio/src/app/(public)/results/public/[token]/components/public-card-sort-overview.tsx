'use client'

/**
 * Public Card Sort Overview
 *
 * Thin wrapper around the dashboard ResultsOverview component.
 * Transforms snake_case DB standardizations to camelCase for the dashboard component.
 */

import { ResultsOverview } from '@/components/analysis/card-sort/results-overview'
import type { CardSortResponse, Participant, Card as CardType } from '@veritio/study-types'

interface StandardizationRow {
  standardized_name: string
  original_names: string[]
  agreement_score: number
}

interface PublicCardSortOverviewProps {
  stats: {
    totalParticipants: number
    completedParticipants: number
    avgCompletionTimeMs: number
  }
  responses: CardSortResponse[]
  participants: Participant[]
  cards: CardType[]
  standardizations: StandardizationRow[]
}

export function PublicCardSortOverview({
  stats,
  responses,
  participants,
  cards,
  standardizations,
}: PublicCardSortOverviewProps) {
  const mappedStandardizations = standardizations.map((s) => ({
    standardizedName: s.standardized_name,
    originalNames: Array.isArray(s.original_names) ? s.original_names : [],
    agreementScore: s.agreement_score,
  }))

  return (
    <ResultsOverview
      stats={{
        ...stats,
        abandonedParticipants: stats.totalParticipants - stats.completedParticipants,
        completionRate:
          stats.totalParticipants > 0
            ? (stats.completedParticipants / stats.totalParticipants) * 100
            : 0,
      }}
      responses={responses}
      participants={participants}
      cards={cards}
      standardizations={mappedStandardizations}
    />
  )
}
