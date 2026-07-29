/**
 * Interpretation guardrails for Participant-Centric Analysis.
 *
 * Three percentages on a card are not a finding. This module turns the numbers
 * into what a researcher should conclude and do next, and refuses to imply
 * consensus that the data does not support.
 *
 * Rule ids are the stable contract. The copy is not: test the ids.
 */

import {
  selectPCAStrategies,
  simAt,
  type PCAModel,
  type PCASelection,
} from './pca-analysis'
import {
  PCA_EXPLORATORY_FLOOR,
  PCA_MIN_MEANINGFUL_RESPONSES,
  PCA_STABILITY_MAX_PARTICIPANTS,
} from '@/lib/constants/analysis-thresholds'

/** A strategy is "dominant" once this share of participants agrees with it. */
const DOMINANT_SUPPORT = 0.4
/** A secondary strategy needs this much support to count as a rival mental model. */
const RIVAL_SUPPORT = 0.25
/** Below this, leave-one-out says the result is an artifact of who happened to respond. */
const UNSTABLE_BELOW = 0.6
/** Share of responses that must be unusable before it is worth mentioning. */
const NOISY_RESPONSE_SHARE = 0.1

export type GuidanceRuleId =
  | 'low-n-exploratory'
  | 'low-n-provisional'
  | 'single-model-strong'
  | 'multiple-models'
  | 'no-dominant-model'
  | 'unstable-result'
  | 'noisy-responses'

export interface Guidance {
  ruleId: GuidanceRuleId
  severity: 'info' | 'warn'
  title: string
  body: string
}

export interface StabilityResult {
  /** Share of leave-one-out runs whose top strategy matched the full-data one. */
  score: number
  runs: number
  computed: boolean
}

/**
 * Leave-one-out stability of the top strategy.
 *
 * Re-runs the selection once per participant with that participant removed, and
 * counts how often the winner still agrees with the full-data winner. This is
 * the most honest thing available at low N: it answers "would I have reached the
 * same conclusion if one fewer person had responded?" without needing a second
 * metric or a significance test.
 *
 * O(n^3) reads over the precomputed matrix, so it is skipped on large studies,
 * where it also matters least.
 */
export function strategyStability(
  model: PCAModel,
  threshold: number
): StabilityResult {
  const n = model.totalParticipants
  if (n < 3 || n > PCA_STABILITY_MAX_PARTICIPANTS) {
    return { score: 0, runs: 0, computed: false }
  }

  const full = selectPCAStrategies(model, threshold, 1)
  if (full.strategies.length === 0) return { score: 0, runs: 0, computed: false }
  const fullWinner = full.strategies[0].representativeIndex

  let matched = 0
  let runs = 0

  for (let i = 0; i < n; i++) {
    const withoutI = selectPCAStrategies(model, threshold, 1, i)
    runs++
    const winner = withoutI.strategies[0]?.representativeIndex
    if (winner === undefined) continue
    // Same structure counts, not the same person: a different participant with
    // an equivalent sort is the same finding.
    if (winner === fullWinner || simAt(model, winner, fullWinner) >= threshold) matched++
  }

  return { score: runs > 0 ? matched / runs : 0, runs, computed: true }
}

export interface InterpretPCAInput {
  model: PCAModel
  selection: PCASelection
  stability?: StabilityResult
}

/** What the researcher should take away, most important first. */
export function interpretPCA({
  model,
  selection,
  stability,
}: InterpretPCAInput): Guidance[] {
  const guidance: Guidance[] = []
  const n = model.totalParticipants
  const strategies = selection.strategies
  const top = strategies[0]
  const thresholdPct = Math.round(selection.threshold * 100)

  if (n < PCA_EXPLORATORY_FLOOR) {
    guidance.push({
      ruleId: 'low-n-exploratory',
      severity: 'warn',
      title: 'Exploratory only',
      body: `With ${n} ${n === 1 ? 'response' : 'responses'} there are too few comparisons for a shared mental model to be distinguishable from chance. Read the individual sorts below for ideas, but do not draw structural conclusions yet.`,
    })
  } else if (n < PCA_MIN_MEANINGFUL_RESPONSES) {
    guidance.push({
      ruleId: 'low-n-provisional',
      severity: 'info',
      title: 'Provisional result',
      body: `${n} responses is enough to see a pattern forming but not to settle on one. Aim for ${PCA_MIN_MEANINGFUL_RESPONSES}.`,
    })
  }

  if (!top || top.supportRatio < DOMINANT_SUPPORT) {
    guidance.push({
      ruleId: 'no-dominant-model',
      severity: 'warn',
      title: 'No dominant mental model',
      body: top
        ? `The most widely shared sort is only recognized by ${Math.round(top.supportRatio * 100)}% of participants. Your cards do not yet have an arrangement most people agree on. The Similarity matrix will show which specific pairs people do agree about.`
        : `No sort was shared by at least two participants at ${thresholdPct}% agreement. Either participants are grouping these cards in genuinely different ways, or the deck mixes several unrelated topics. Lower the agreement slider to find partial overlap, or check the Similarity matrix for pairs that do hold.`,
    })
  } else {
    const rivals = strategies.slice(1).filter((s) => s.supportRatio >= RIVAL_SUPPORT)
    if (rivals.length > 0) {
      guidance.push({
        ruleId: 'multiple-models',
        severity: 'info',
        title: `${rivals.length + 1} competing mental models`,
        body: `Participants split into ${rivals.length + 1} distinct ways of organizing these cards, the largest covering ${Math.round(top.supportRatio * 100)}%. That usually means two audiences with different expectations. Compare the groups below, then consider which audience the navigation should serve, or whether both need a path.`,
      })
    } else {
      guidance.push({
        ruleId: 'single-model-strong',
        severity: 'info',
        title: 'One clear mental model',
        body: `${Math.round(top.supportRatio * 100)}% of participants sorted these cards in a way that matches Strategy 1. That is a solid basis for a first-draft structure. Check the contested cards before committing.`,
      })
    }
  }

  if (stability?.computed && stability.score < UNSTABLE_BELOW) {
    guidance.push({
      ruleId: 'unstable-result',
      severity: 'warn',
      title: 'Result depends on individual responses',
      body: `Removing any single participant changes the leading strategy in ${Math.round((1 - stability.score) * 100)}% of cases. The ranking above is not yet robust; more responses will settle it.`,
    })
  }

  const unusable =
    model.degenerateCounts['all-one-group'] +
    model.degenerateCounts['all-singletons'] +
    model.degenerateCounts['merged-groups']
  if (n > 0 && unusable / n > NOISY_RESPONSE_SHARE) {
    guidance.push({
      ruleId: 'noisy-responses',
      severity: 'info',
      title: 'Some responses cannot be used as a strategy',
      body: `${unusable} of ${n} responses either put every card in one group, gave every card its own group, or reused a group name. They still count toward agreement, but none can be shown as a strategy. If that share looks high, check the Participants tab for rushed sessions worth excluding.`,
    })
  }

  return guidance
}
