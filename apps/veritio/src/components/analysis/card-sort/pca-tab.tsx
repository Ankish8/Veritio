'use client'

import { useState, useMemo, useEffect, memo } from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Slider } from '@/components/ui/slider'
import {
  extractParticipantIA,
  calculateIASimilarity,
  performPCAAnalysis,
  type ParticipantIA,
  type IAStructure,
} from '@/lib/algorithms/pca-analysis'
import {
  PCA_STRATEGY_MIN_THRESHOLD,
  PCA_STRATEGY_DEFAULT_THRESHOLD,
  PCA_STRATEGY_MAX_THRESHOLD,
  PCA_TOP_STRATEGIES_COUNT,
} from '@/lib/constants/analysis-thresholds'

interface PCATabProps {
  cards: Array<{ id: string; label: string; description?: string | null }>
  responses: Array<{
    participant_id: string
    card_placements: Record<string, string> | unknown
  }>
  participants?: Array<{ id: string; email?: string | null }>
}

function StrategyCard({
  strategy,
  rank,
}: {
  strategy: IAStructure
  rank: number
}) {
  const supportPercent = Math.round(strategy.supportRatio * 100)

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      {/* Header with rank badge */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
              {rank}
            </span>
            <span className="font-medium text-sm">Strategy {rank}</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-blue-600">{supportPercent}%</div>
            <div className="text-xs text-muted-foreground">
              {strategy.supportingParticipantIds.length}/{strategy.totalParticipants} participants
            </div>
          </div>
        </div>
      </div>

      {/* Categories preview */}
      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        {strategy.categories.slice(0, 4).map((category, idx) => (
          <div key={idx}>
            <div className="font-medium text-xs text-muted-foreground mb-1">
              {category.name}
            </div>
            <div className="flex flex-wrap gap-1">
              {category.cardLabels.slice(0, 3).map((label, labelIdx) => (
                <span
                  key={labelIdx}
                  className="bg-blue-50 text-xs px-2 py-0.5 rounded"
                >
                  {label}
                </span>
              ))}
              {category.cardLabels.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{category.cardLabels.length - 3} more
                </span>
              )}
            </div>
          </div>
        ))}
        {strategy.categories.length > 4 && (
          <div className="text-xs text-muted-foreground">
            +{strategy.categories.length - 4} more groups
          </div>
        )}
      </div>
    </div>
  )
}

function ParticipantIACard({
  ia,
  similarCount,
  totalParticipants,
  participantEmail,
}: {
  ia: ParticipantIA
  similarCount: number
  totalParticipants: number
  participantEmail?: string
}) {
  return (
    <div className="border rounded-lg bg-white">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="font-medium text-sm text-foreground">
          Similar IAs: {similarCount}/{totalParticipants}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {ia.categories.length} groups submitted by participant {participantEmail || ia.participantId}
        </div>
      </div>

      {/* Categories */}
      <div className="p-4 space-y-4">
        {ia.categories.map((category, idx) => (
          <div key={idx}>
            <div className="font-medium text-sm mb-2">{category.name}</div>
            <div className="space-y-1.5">
              {category.cardLabels.map((label, labelIdx) => (
                <div
                  key={labelIdx}
                  className="bg-blue-50 text-sm px-3 py-2 rounded"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const PCATab = memo(function PCATab({ cards, responses, participants }: PCATabProps) {
  const [strategyThreshold, setStrategyThreshold] = useState(PCA_STRATEGY_DEFAULT_THRESHOLD)

  const typedResponses = useMemo(() =>
    responses
      .filter(r => r.card_placements && Object.keys(r.card_placements as object).length > 0)
      .map(r => ({
        participant_id: r.participant_id,
        card_placements: (r.card_placements || {}) as Record<string, string>
      })),
    [responses]
  )

  const { allIAs, minGroups, maxGroups } = useMemo(() => {
    const cardMap = new Map<string, string>()
    for (const card of cards) {
      cardMap.set(card.id, card.label)
    }

    const allIAs = typedResponses.map(r => extractParticipantIA(r, cardMap))

    if (allIAs.length === 0) {
      return { allIAs: [], minGroups: 2, maxGroups: 10 }
    }

    const groupCounts = allIAs.map(ia => ia.categories.length)
    return {
      allIAs,
      minGroups: Math.min(...groupCounts),
      maxGroups: Math.max(...groupCounts),
    }
  }, [cards, typedResponses])

  const topStrategies = useMemo(() => {
    if (typedResponses.length < 2 || cards.length === 0) return []

    return performPCAAnalysis(
      typedResponses,
      cards,
      PCA_TOP_STRATEGIES_COUNT,
      strategyThreshold
    ).topIAs
  }, [typedResponses, cards, strategyThreshold])

  const [groupRange, setGroupRange] = useState<[number, number]>([2, 10])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGroupRange([minGroups, maxGroups])
  }, [minGroups, maxGroups])

  const filteredIAs = useMemo(() => {
    return allIAs.filter(
      ia => ia.categories.length >= groupRange[0] && ia.categories.length <= groupRange[1]
    )
  }, [allIAs, groupRange])

  const iasWithSimilarity = useMemo(() => {
    const SIMILARITY_THRESHOLD = 0.5

    return filteredIAs.map(ia => {
      let similarCount = 1
      for (const other of allIAs) {
        if (other.participantId === ia.participantId) continue
        const similarity = calculateIASimilarity(ia, other)
        if (similarity >= SIMILARITY_THRESHOLD) {
          similarCount++
        }
      }

      return {
        ia,
        similarCount,
      }
    })
  }, [filteredIAs, allIAs])

  const sortedIAs = useMemo(() => {
    return [...iasWithSimilarity].sort((a, b) => {
      if (b.similarCount !== a.similarCount) {
        return b.similarCount - a.similarCount
      }
      return a.ia.categories.length - b.ia.categories.length
    })
  }, [iasWithSimilarity])

  const participantEmails = useMemo(() => {
    const map = new Map<string, string>()
    if (participants) {
      for (const p of participants) {
        if (p.email) {
          map.set(p.id, p.email)
        }
      }
    }
    return map
  }, [participants])

  if (responses.length === 0 || allIAs.length === 0) {
    return (
      <div className="rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-medium">Participant-centric analysis</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  PCA identifies individual participant responses that are most similar
                  to other participants, helping you find common mental models.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-sm text-muted-foreground">
          {responses.length === 0
            ? 'No responses yet. PCA analysis will appear once participants complete the study.'
            : 'Not enough data to perform analysis. More participant responses are needed.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Participant-centric analysis</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  We look at each of your participant responses and compare them to each other.
                  The PCA shows individual responses that agree most strongly with your other participants.
                  It works best with at least 30 responses.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {topStrategies.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">Top Strategies</h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      These are the most common ways participants organized your cards.
                      Each strategy represents a cluster of similar participant responses.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Similarity:</span>
              <Slider
                value={[strategyThreshold]}
                onValueChange={(value) => setStrategyThreshold(value[0])}
                min={PCA_STRATEGY_MIN_THRESHOLD}
                max={PCA_STRATEGY_MAX_THRESHOLD}
                step={0.05}
                className="w-24"
              />
              <span className="w-8">{Math.round(strategyThreshold * 100)}%</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topStrategies.map((strategy, idx) => (
              <StrategyCard key={strategy.id} strategy={strategy} rank={idx + 1} />
            ))}
          </div>
        </div>
      )}

      {topStrategies.length > 0 && (
        <div className="border-t pt-6">
          <h4 className="font-medium text-sm mb-4">Individual Participant IAs</h4>
        </div>
      )}

      <div className="rounded-lg border p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap">
          <span className="text-xs sm:text-sm text-muted-foreground">
            <span className="hidden sm:inline">Consider information architectures (IAs) with</span>
            <span className="sm:hidden">IAs with</span>
          </span>
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[150px] sm:min-w-[200px] max-w-[400px]">
            <span className="text-xs sm:text-sm font-medium w-4 text-center">{groupRange[0]}</span>
            <Slider
              value={groupRange}
              onValueChange={(value) => setGroupRange(value as [number, number])}
              min={minGroups}
              max={maxGroups}
              step={1}
              className="flex-1"
            />
            <span className="text-xs sm:text-sm font-medium w-4 text-center">{groupRange[1]}</span>
          </div>
          <span className="text-xs sm:text-sm text-muted-foreground">
            {groupRange[0]} - {groupRange[1]} groups
          </span>
        </div>
      </div>

      {sortedIAs.length === 0 ? (
        <div className="rounded-lg border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No IAs found with {groupRange[0]} - {groupRange[1]} groups. Adjust the range to see results.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {sortedIAs.slice(0, 6).map(({ ia, similarCount }) => (
            <ParticipantIACard
              key={ia.participantId}
              ia={ia}
              similarCount={similarCount}
              totalParticipants={allIAs.length}
              participantEmail={participantEmails.get(ia.participantId)}
            />
          ))}
        </div>
      )}

      {sortedIAs.length > 6 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing top 6 of {sortedIAs.length} IAs. Narrow the range to see more specific results.
        </div>
      )}
    </div>
  )
})
