'use client'

import { useState, useMemo, useEffect, useDeferredValue, memo } from 'react'
import { HelpCircle, Sparkles, AlertTriangle, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { getHeatmapColor, getHeatmapTextColor } from '@/lib/colors'
import {
  buildPCAModel,
  selectPCAStrategies,
  type ParticipantIA,
  type PCAModel,
  type PCAStrategy,
} from '@/lib/algorithms/pca-analysis'
import {
  contestedCards,
  synthesizeConsensusIA,
  type ConsensusIA,
} from '@/lib/algorithms/consensus-ia'
import {
  interpretPCA,
  strategyStability,
  type Guidance,
} from '@/lib/algorithms/pca-interpretation'
import {
  PCA_EXPLORATORY_FLOOR,
  PCA_MIN_MEANINGFUL_RESPONSES,
  PCA_STRATEGY_MIN_THRESHOLD,
  PCA_STRATEGY_DEFAULT_THRESHOLD,
  PCA_STRATEGY_MAX_THRESHOLD,
  PCA_TOP_STRATEGIES_COUNT,
} from '@/lib/constants/analysis-thresholds'

const MAX_VISIBLE_IAS = 6

interface PCATabProps {
  cards: Array<{ id: string; label: string; description?: string | null }>
  responses: Array<{
    participant_id: string
    card_placements: Record<string, string> | unknown
    category_assignments?: Record<string, string> | unknown
    custom_categories?: unknown
  }>
  /** Predefined categories, so a researcher's own "Unclear" is not mistaken for the synthetic bucket. */
  categories?: Array<{ label: string }>
  /**
   * Only used to number participants for display. Deliberately does not accept
   * an identifier: this tab renders on the public shared-results page.
   */
  participants?: Array<{ id: string }>
}

function pct(value: number): number {
  return Math.round(value * 100)
}

// ---------------------------------------------------------------------------
// Guidance
// ---------------------------------------------------------------------------

function GuidanceList({ guidance }: { guidance: Guidance[] }) {
  if (guidance.length === 0) return null

  return (
    <div className="space-y-2">
      {guidance.map((item) => {
        const isWarn = item.severity === 'warn'
        const Icon = isWarn ? AlertTriangle : Info
        return (
          <div
            key={item.ruleId}
            className={`rounded-lg border p-3 sm:p-4 flex gap-3 ${
              isWarn ? 'border-amber-200 bg-amber-50' : 'border-blue-100 bg-blue-50/50'
            }`}
          >
            <Icon
              className={`h-4 w-4 mt-0.5 shrink-0 ${
                isWarn ? 'text-amber-600' : 'text-blue-600'
              }`}
              aria-hidden
            />
            <div>
              <div className="text-sm font-medium">{item.title}</div>
              <p className="text-xs text-muted-foreground mt-1">{item.body}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Strategy card
// ---------------------------------------------------------------------------

function ConfidenceChip({ label, confidence }: { label: string; confidence: number }) {
  const value = Math.round(confidence * 100)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="text-xs px-2 py-0.5 rounded inline-flex items-center gap-1"
          style={{
            backgroundColor: getHeatmapColor(value),
            color: getHeatmapTextColor(value),
          }}
        >
          {label}
          <span className="opacity-70">{value}%</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {value}% of the participants behind this strategy put this card with the rest of
          its group.
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

function StrategyCard({
  strategy,
  consensus,
  rank,
  participantNumbers,
}: {
  strategy: PCAStrategy
  consensus: ConsensusIA | null
  rank: number
  participantNumbers: Map<string, number>
}) {
  const synthesized = consensus?.source === 'synthesized'
  const closestNumber = consensus
    ? participantNumbers.get(consensus.closestParticipantId)
    : undefined
  const representativeNumber = participantNumbers.get(strategy.representativeParticipantId)

  return (
    <div className="border rounded-lg bg-white overflow-hidden flex flex-col">
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
              {rank}
            </span>
            <span className="font-medium text-sm">Strategy {rank}</span>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-blue-600">{pct(strategy.supportRatio)}%</div>
            <div className="text-xs text-muted-foreground">
              {strategy.supportingParticipantIds.length}/{strategy.totalParticipants} participants
            </div>
          </div>
        </div>

        {synthesized ? (
          <div className="mt-2 flex items-start gap-1.5">
            <Sparkles className="h-3 w-3 text-blue-600 mt-0.5 shrink-0" aria-hidden />
            <p className="text-xs text-muted-foreground">
              Built from all {consensus.memberCount} participants behind this strategy, not
              any one person&apos;s sort. They used{' '}
              {consensus.memberGroupCountRange[0] === consensus.memberGroupCountRange[1]
                ? `${consensus.memberGroupCountRange[0]} groups`
                : `${consensus.memberGroupCountRange[0]} to ${consensus.memberGroupCountRange[1]} groups`}
              ; this uses {consensus.groupCount}.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Shown exactly as submitted
            {representativeNumber !== undefined
              ? ` by Participant ${representativeNumber}`
              : ''}
            .
          </p>
        )}
      </div>

      <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-80">
        {(consensus?.groups ?? []).map((group) => (
          <div key={group.id}>
            <div className="flex items-baseline gap-1.5 flex-wrap mb-1">
              <span className="font-medium text-xs">{group.label || 'Unnamed group'}</span>
              {group.labelSupport > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {group.labelSupport} of {consensus?.memberCount}
                </span>
              )}
            </div>
            {group.alternativeLabels.length > 0 && (
              <div className="text-[11px] text-muted-foreground mb-1">
                also called{' '}
                {group.alternativeLabels
                  .map((alt) => `${alt.label} (${alt.support})`)
                  .join(' · ')}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {group.cards.map((card) =>
                synthesized ? (
                  <ConfidenceChip
                    key={card.cardId}
                    label={card.label}
                    confidence={card.confidence}
                  />
                ) : (
                  <span
                    key={card.cardId}
                    className="bg-blue-50 text-xs px-2 py-0.5 rounded"
                  >
                    {card.label}
                  </span>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {synthesized && closestNumber !== undefined && (
        <div className="px-4 py-2 border-t text-[11px] text-muted-foreground">
          Closest real sort: Participant {closestNumber}
          {consensus.lowConfidenceCardIds.length > 0 && (
            <>
              {' · '}
              {consensus.lowConfidenceCardIds.length}{' '}
              {consensus.lowConfidenceCardIds.length === 1 ? 'card' : 'cards'} placed with
              low confidence
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual participant sorts
// ---------------------------------------------------------------------------

function ParticipantIACard({
  ia,
  similarCount,
  totalParticipants,
  participantNumber,
}: {
  ia: ParticipantIA
  similarCount: number
  totalParticipants: number
  participantNumber: number | null
}) {
  return (
    <div className="border rounded-lg bg-white">
      <div className="p-4 border-b">
        <div className="font-medium text-sm text-foreground">
          Similar IAs: {similarCount}/{totalParticipants}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {ia.categories.length} groups submitted by{' '}
          {participantNumber !== null ? `Participant ${participantNumber}` : 'a participant'}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {ia.categories.map((category) => (
          <div key={category.cardIds[0]}>
            <div className="font-medium text-sm mb-2">{category.name || 'Unnamed group'}</div>
            <div className="space-y-1.5">
              {category.cardLabels.map((label, labelIdx) => (
                <div key={labelIdx} className="bg-blue-50 text-sm px-3 py-2 rounded">
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

/** Honest notes about what the numbers below are based on. */
function DataNotes({ model }: { model: PCAModel }) {
  const notes: string[] = []

  if (model.unclearExcluded && model.unclearCardCount > 0) {
    notes.push(
      `${model.unclearCardCount} ${model.unclearCardCount === 1 ? 'card was' : 'cards were'} left in "Unclear" and excluded from the comparison.`
    )
  }

  if (model.labelKeyedCount > 0 && model.labelKeyedCount === model.totalParticipants) {
    notes.push(
      'These responses were recorded before group identities were stored, so two groups a participant gave the same name cannot be told apart.'
    )
  } else if (model.labelKeyedCount > 0) {
    notes.push(
      `${model.labelKeyedCount} of ${model.totalParticipants} responses predate stored group identities, so same-named groups in those cannot be told apart.`
    )
  }

  if (model.truncated > 0) {
    notes.push(
      `Comparing the first ${model.totalParticipants} responses; ${model.truncated} were left out.`
    )
  }

  if (notes.length === 0) return null

  return (
    <ul className="mt-2 space-y-1 text-xs text-muted-foreground list-disc pl-4">
      {notes.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

export const PCATab = memo(function PCATab({
  cards,
  responses,
  categories,
  participants,
}: PCATabProps) {
  const [threshold, setThreshold] = useState(PCA_STRATEGY_DEFAULT_THRESHOLD)
  // "Unclear" means "I could not place this card", so it is excluded by default.
  const [excludeUnclear, setExcludeUnclear] = useState(true)

  const typedResponses = useMemo(
    () =>
      responses
        .filter((r) => r.card_placements && Object.keys(r.card_placements as object).length > 0)
        .map((r) => ({
          participant_id: r.participant_id,
          card_placements: r.card_placements as Record<string, string>,
          category_assignments:
            (r.category_assignments as Record<string, string> | null | undefined) ?? null,
          custom_categories: r.custom_categories,
        })),
    [responses]
  )

  const predefinedCategoryLabels = useMemo(
    () => (categories ?? []).map((c) => c.label),
    [categories]
  )

  // The expensive phase, and the only one that depends on the data.
  const model = useMemo(
    () =>
      buildPCAModel(typedResponses, cards, {
        excludeUnclear,
        predefinedCategoryLabels,
      }),
    [typedResponses, cards, excludeUnclear, predefinedCategoryLabels]
  )

  // Deferring the threshold keeps the last good render on screen while dragging
  // rather than flashing an empty state.
  const deferredThreshold = useDeferredValue(threshold)
  const selection = useMemo(
    () => selectPCAStrategies(model, deferredThreshold, PCA_TOP_STRATEGIES_COUNT),
    [model, deferredThreshold]
  )

  const consensuses = useMemo(() => {
    const byId = new Map(model.ias.map((ia) => [ia.participantId, ia]))
    return selection.strategies.map((strategy) =>
      synthesizeConsensusIA(
        strategy.id,
        model.ias[strategy.representativeIndex],
        strategy.supportingParticipantIds
          .map((id) => byId.get(id))
          .filter((ia): ia is ParticipantIA => ia !== undefined),
        cards
      )
    )
  }, [model, selection, cards])

  const contested = useMemo(
    () => contestedCards(consensuses.filter((c): c is ConsensusIA => c !== null)),
    [consensuses]
  )

  const stability = useMemo(
    () => strategyStability(model, deferredThreshold),
    [model, deferredThreshold]
  )

  const guidance = useMemo(
    () => interpretPCA({ model, selection, stability }),
    [model, selection, stability]
  )

  const { minGroups, maxGroups } = useMemo(() => {
    if (model.ias.length === 0) return { minGroups: 1, maxGroups: 1 }
    const counts = model.ias.map((ia) => ia.categories.length)
    return { minGroups: Math.min(...counts), maxGroups: Math.max(...counts) }
  }, [model])

  const [groupRange, setGroupRange] = useState<[number, number]>([minGroups, maxGroups])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGroupRange([minGroups, maxGroups])
  }, [minGroups, maxGroups])

  const participantNumbers = useMemo(() => {
    const map = new Map<string, number>()
    ;(participants ?? []).forEach((p, index) => map.set(p.id, index + 1))
    return map
  }, [participants])

  // Agreement counts come from the same votes array the strategy percentages are
  // derived from, so the two can never disagree.
  const sortedIAs = useMemo(() => {
    return model.ias
      .map((ia, index) => ({ ia, similarCount: selection.votes[index] }))
      .filter(
        ({ ia }) =>
          ia.categories.length >= groupRange[0] && ia.categories.length <= groupRange[1]
      )
      .sort((a, b) => {
        if (b.similarCount !== a.similarCount) return b.similarCount - a.similarCount
        if (a.ia.categories.length !== b.ia.categories.length) {
          return a.ia.categories.length - b.ia.categories.length
        }
        return a.ia.participantId < b.ia.participantId ? -1 : 1
      })
  }, [model, selection, groupRange])

  const headerTooltip = (
    <Tooltip>
      <TooltipTrigger>
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>
          We compare every participant&apos;s sort with every other. Two sorts count as
          agreeing when at least {pct(threshold)}% of their combined card pairings are shared.
          Category names are ignored when comparing. Works best with{' '}
          {PCA_MIN_MEANINGFUL_RESPONSES} or more responses.
        </p>
      </TooltipContent>
    </Tooltip>
  )

  if (responses.length === 0 || model.totalParticipants === 0) {
    return (
      <TooltipProvider>
        <div className="rounded-lg border p-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium">Participant-centric analysis</h3>
            {headerTooltip}
          </div>
          <p className="text-sm text-muted-foreground">
            {responses.length === 0
              ? 'No responses yet. This analysis will appear once participants complete the study.'
              : 'Not enough data to perform analysis. More participant responses are needed.'}
          </p>
        </div>
      </TooltipProvider>
    )
  }

  const showStrategies =
    model.totalParticipants >= PCA_EXPLORATORY_FLOOR && selection.strategies.length > 0

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">Participant-centric analysis</h3>
            {headerTooltip}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Based on {model.totalParticipants}{' '}
            {model.totalParticipants === 1 ? 'response' : 'responses'}
            {stability.computed && showStrategies
              ? `. Leaving any one participant out gives the same leading strategy ${pct(stability.score)}% of the time.`
              : '.'}
          </p>
          <DataNotes model={model} />
        </div>

        <GuidanceList guidance={guidance} />

        {/* Controls stay visible even when nothing clears the threshold, otherwise
            there is no way to lower it. */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm">Top Strategies</h4>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  The most widely shared ways participants organized your cards. Each is
                  chosen because more participants agree with it than with any other, and
                  shown only if it differs from the strategies above it. Where there are
                  enough supporters, the groups shown are averaged across all of them rather
                  than copied from one person.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {model.unclearCardCount > 0 && (
              <div className="flex items-center gap-2">
                <Switch
                  id="pca-exclude-unclear"
                  checked={excludeUnclear}
                  onCheckedChange={setExcludeUnclear}
                />
                <Label htmlFor="pca-exclude-unclear" className="text-xs text-muted-foreground">
                  Ignore &quot;Unclear&quot; cards
                </Label>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Agreement:</span>
              <Slider
                value={[threshold]}
                onValueChange={(value) => setThreshold(value[0])}
                min={PCA_STRATEGY_MIN_THRESHOLD}
                max={PCA_STRATEGY_MAX_THRESHOLD}
                step={0.05}
                className="w-24"
                aria-label="Minimum agreement between two responses"
              />
              <span className="w-8">{pct(threshold)}%</span>
            </div>
          </div>
        </div>

        {showStrategies ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {selection.strategies.map((strategy, idx) => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                consensus={consensuses[idx]}
                rank={idx + 1}
                participantNumbers={participantNumbers}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {model.totalParticipants < PCA_EXPLORATORY_FLOOR
                ? 'Strategies are hidden until there are enough responses for agreement to mean something. The individual sorts below are still worth reading.'
                : `No sort was shared by at least two participants at ${pct(deferredThreshold)}% agreement. Lower the agreement slider, or collect more responses.`}
            </p>
          </div>
        )}

        {showStrategies && contested.length > 0 && (
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="font-medium text-sm">Contested cards</h4>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Cards that no strategy placed confidently. These are the ones worth a
                    closer look: an unclear name, a topic that spans two groups, or a genuine
                    split in how people think about it.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="rounded-lg border divide-y">
              {contested.map((card) => (
                <div
                  key={card.cardId}
                  className="p-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3"
                >
                  <span className="text-sm font-medium sm:w-48 shrink-0">{card.label}</span>
                  <span className="text-xs text-muted-foreground flex-1">
                    {card.placements
                      .map(
                        (p) =>
                          `${p.groupLabel || 'unnamed group'} (${pct(p.confidence)}% confident)`
                      )
                      .join(' · ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t pt-6">
          <h4 className="font-medium text-sm mb-4">Individual Participant IAs</h4>

          {minGroups !== maxGroups && (
            <div className="rounded-lg border p-3 sm:p-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  <span className="hidden sm:inline">
                    Consider information architectures (IAs) with
                  </span>
                  <span className="sm:hidden">IAs with</span>
                </span>
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[150px] sm:min-w-[200px] max-w-[400px]">
                  <span className="text-xs sm:text-sm font-medium w-4 text-center">
                    {groupRange[0]}
                  </span>
                  <Slider
                    value={groupRange}
                    onValueChange={(value) => setGroupRange(value as [number, number])}
                    min={minGroups}
                    max={maxGroups}
                    step={1}
                    className="flex-1"
                    aria-label="Number of groups"
                  />
                  <span className="text-xs sm:text-sm font-medium w-4 text-center">
                    {groupRange[1]}
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {groupRange[0]} - {groupRange[1]} groups
                </span>
              </div>
            </div>
          )}

          {sortedIAs.length === 0 ? (
            <div className="rounded-lg border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No IAs found with {groupRange[0]} - {groupRange[1]} groups. Adjust the range
                to see results.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {sortedIAs.slice(0, MAX_VISIBLE_IAS).map(({ ia, similarCount }) => (
                <ParticipantIACard
                  key={ia.participantId}
                  ia={ia}
                  similarCount={similarCount}
                  totalParticipants={model.totalParticipants}
                  participantNumber={participantNumbers.get(ia.participantId) ?? null}
                />
              ))}
            </div>
          )}

          {sortedIAs.length > MAX_VISIBLE_IAS && (
            <div className="text-center text-sm text-muted-foreground mt-4">
              Showing top {MAX_VISIBLE_IAS} of {sortedIAs.length} IAs. Narrow the range to
              see more specific results.
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
})
