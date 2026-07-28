'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  AlertTriangle,
  MessageSquare,
  Info,
  Layers,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatTime } from '@/lib/utils'
import { getFlagLabel } from '@/lib/utils/flag-utils'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type { ParticipantFlag } from '@/lib/algorithms/participant-flagging'
import { QuestionResponseCard } from '@/components/analysis/shared'

interface CardSortParticipantDetailContentProps {
  studyId: string
  responseId?: string
  cardsPlaced: number
  totalCards: number
  categoriesCreated: number
  totalTimeMs: number | null
  flags: ParticipantFlag[]
  flowResponses: StudyFlowResponseRow[]
  flowQuestions: StudyFlowQuestionRow[]
  /** cardId -> category label, exactly as the participant left it. */
  cardPlacements?: Record<string, string> | null
  cards?: Array<{ id: string; label: string }>
}

/**
 * Group the participant's placements into the piles they actually built.
 * card_placements stores the category *label*, so an unrecognised card id is
 * still worth showing — it just falls back to the raw id.
 */
function groupPlacementsByCategory(
  cardPlacements: Record<string, string> | null | undefined,
  cards: Array<{ id: string; label: string }>,
): Array<{ category: string; cards: string[] }> {
  if (!cardPlacements) return []

  const labelById = new Map(cards.map((card) => [card.id, card.label]))
  const piles = new Map<string, string[]>()

  for (const [cardId, category] of Object.entries(cardPlacements)) {
    if (typeof category !== 'string' || category.length === 0) continue
    const pile = piles.get(category) ?? []
    pile.push(labelById.get(cardId) ?? cardId)
    piles.set(category, pile)
  }

  return [...piles.entries()]
    .map(([category, pileCards]) => ({
      category,
      cards: pileCards.sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => b.cards.length - a.cards.length || a.category.localeCompare(b.category))
}

export function CardSortParticipantDetailContent({
  studyId: _studyId,
  responseId: _responseId,
  cardsPlaced,
  totalCards,
  categoriesCreated,
  totalTimeMs,
  flags,
  flowResponses,
  flowQuestions,
  cardPlacements,
  cards = [],
}: CardSortParticipantDetailContentProps) {
  const piles = groupPlacementsByCategory(cardPlacements, cards)

  return (
    <>
      {/* Card Sort Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Card Sort Performance
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 bg-muted/50">
            <CardContent className="p-3">
              <p className="text-lg font-bold">{cardsPlaced}/{totalCards}</p>
              <p className="text-xs text-muted-foreground">Cards Placed</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-muted/50">
            <CardContent className="p-3">
              <p className="text-lg font-bold">{categoriesCreated}</p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-muted/50">
            <CardContent className="p-3">
              <p className="text-lg font-bold">{formatTime(totalTimeMs)}</p>
              <p className="text-xs text-muted-foreground">Total Time</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-muted/50">
            <CardContent className="p-3">
              <p className="text-lg font-bold">{flags.length}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                Quality Flags
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/70 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                    Auto-detected issues: all cards in one group, each card in its own group, no card movement, or unusually fast/slow completion.
                  </TooltipContent>
                </Tooltip>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quality Flags */}
      {flags.length > 0 && (
        <div className="space-y-3 mt-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Quality Flags
          </h3>
          <div className="space-y-2">
            {flags.map((flag, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-amber-800 text-sm">
                    {getFlagLabel(flag.type)}
                  </div>
                  <div className="text-sm text-amber-700">{flag.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What the participant actually sorted */}
      {piles.length > 0 && (
        <div className="space-y-3 mt-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Card Placements
          </h3>
          <div className="space-y-2">
            {piles.map((pile) => (
              <div key={pile.category} className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium break-words">{pile.category}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {pile.cards.length} card{pile.cards.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pile.cards.map((card) => (
                    <span
                      key={card}
                      className="rounded-md bg-background border px-2 py-0.5 text-xs"
                    >
                      {card}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flow Question Responses */}
      {flowResponses.length > 0 && (
        <div className="space-y-3 mt-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Questionnaire Responses
          </h3>
          <div className="space-y-3">
            {flowResponses.map((response, idx) => {
              const question = flowQuestions.find(q => q.id === response.question_id)
              if (!question) return null
              return (
                <QuestionResponseCard
                  key={response.id}
                  question={question}
                  response={response}
                  index={idx}
                />
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

