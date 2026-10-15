/**
 * Deterministic rules that decide whether an answer is worth a follow-up,
 * before any model is called. The model only writes the question (and, when
 * the probe is optional, judges whether the answer is already complete).
 */

import type { FollowupDecision, FollowupEvaluationInput } from './types'

/** Answers longer than this already carry their own explanation. */
const DETAILED_ANSWER_WORDS = 80
/** A probe reply this long is treated as complete; no second probe. */
const DETAILED_PROBE_REPLY_WORDS = 120

const SKIP = (reason: string): FollowupDecision => ({ kind: 'skip', reason })

export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

export function decideFollowup(input: FollowupEvaluationInput): FollowupDecision {
  const { question, answerText, responseContext, thread } = input
  const aiConfig = question.config.aiFollowup
  const hasDepthHint = !!aiConfig?.depthHint?.trim()

  // Second probe: the model judges the reply to the first probe in context.
  if (thread.length > 0) {
    const lastReply = thread[thread.length - 1].answer
    const words = countWords(lastReply)
    if (words === 0) return SKIP('Empty follow-up reply')
    if (words > DETAILED_PROBE_REPLY_WORDS) return SKIP('Follow-up reply already detailed')
    return { kind: 'ask', mustAsk: false, signal: 'Reply to the previous follow-up', fallbackQuestion: null }
  }

  switch (question.type) {
    case 'single_line_text':
    case 'multi_line_text': {
      const words = countWords(answerText)
      if (words === 0) return SKIP('Empty answer')
      if (words > DETAILED_ANSWER_WORDS) return SKIP('Answer already detailed')
      // Short answers ("No", "Nothing") can be complete; the model decides.
      return { kind: 'ask', mustAsk: false, signal: words < 3 ? 'Very short answer' : 'Open-text answer', fallbackQuestion: null }
    }

    case 'nps': {
      const value = responseContext.value
      if (typeof value !== 'number' || value < 0 || value > 10) return SKIP('No NPS value')
      if (value <= 6) {
        return { kind: 'ask', mustAsk: true, signal: `NPS ${value}/10 (detractor)`, fallbackQuestion: scaleFallback(value) }
      }
      if (value <= 8) return { kind: 'ask', mustAsk: false, signal: `NPS ${value}/10 (passive)`, fallbackQuestion: null }
      return hasDepthHint
        ? { kind: 'ask', mustAsk: false, signal: `NPS ${value}/10 (promoter)`, fallbackQuestion: null }
        : SKIP('Promoter score')
    }

    case 'opinion_scale':
    case 'slider': {
      const value = responseContext.value
      if (typeof value !== 'number') return SKIP('No rating value')
      const { min, max } = scaleBounds(question.type, question.config)
      const label = `Rated ${value} on a ${min} to ${max} scale`
      const range = max - min
      if (range <= 0) return { kind: 'ask', mustAsk: false, signal: label, fallbackQuestion: null }
      const normalized = (value - min) / range
      if (normalized <= 0.3) {
        return { kind: 'ask', mustAsk: true, signal: `${label} (low)`, fallbackQuestion: scaleFallback(value) }
      }
      if (normalized >= 0.8) {
        return hasDepthHint
          ? { kind: 'ask', mustAsk: false, signal: `${label} (high)`, fallbackQuestion: null }
          : SKIP('High rating')
      }
      return { kind: 'ask', mustAsk: false, signal: `${label} (middle)`, fallbackQuestion: null }
    }

    case 'yes_no':
      return answerText.trim()
        ? { kind: 'ask', mustAsk: false, signal: 'Yes/no answer', fallbackQuestion: null }
        : SKIP('No yes/no value')

    case 'multiple_choice':
      return decideChoice(input)

    default:
      return SKIP(`Unsupported question type: ${question.type}`)
  }
}

function decideChoice(input: FollowupEvaluationInput): FollowupDecision {
  const { question, responseContext } = input
  const aiConfig = question.config.aiFollowup
  const condition = aiConfig?.triggerCondition ?? 'always'
  const selectedIds = responseContext.selectedOptionIds ?? []
  const isOther = !!responseContext.isOtherSelected || !!responseContext.otherText?.trim()

  if (selectedIds.length === 0 && !isOther) return SKIP('No selection')

  if (condition === 'when_other') {
    if (!isOther) return SKIP('Other not selected')
    const otherText = responseContext.otherText?.trim()
    return {
      kind: 'ask',
      mustAsk: true,
      signal: 'Selected "Other"',
      fallbackQuestion: otherText
        ? `Could you tell us a bit more about "${truncate(otherText, 60)}"?`
        : 'Could you tell us more about what you had in mind?',
    }
  }

  if (condition === 'specific_options') {
    const triggerIds = aiConfig?.triggerOptionIds ?? []
    // No options picked in the builder: behave like "always" (matches the player).
    if (triggerIds.length > 0) {
      const matched = selectedIds.filter((id) => triggerIds.includes(id))
      if (matched.length === 0) return SKIP('No trigger option selected')
      const labels = optionLabels(question.config, matched)
      return {
        kind: 'ask',
        mustAsk: true,
        signal: `Selected a trigger option: ${labels.join(', ')}`,
        fallbackQuestion: `What made you choose "${truncate(labels.join(', '), 60)}"?`,
      }
    }
  }

  return { kind: 'ask', mustAsk: false, signal: 'Choice answer', fallbackQuestion: null }
}

export function scaleBounds(type: string, config: Record<string, unknown>): { min: number; max: number } {
  if (type === 'slider') {
    const min = typeof config.minValue === 'number' ? config.minValue : 0
    const max = typeof config.maxValue === 'number' ? config.maxValue : 100
    return { min, max }
  }
  const points = typeof config.scalePoints === 'number' ? config.scalePoints : 5
  return config.startAtZero ? { min: 0, max: points - 1 } : { min: 1, max: points }
}

export function optionLabels(config: Record<string, unknown>, ids: string[]): string[] {
  const options = Array.isArray(config.options) ? (config.options as { id?: unknown; label?: unknown }[]) : []
  return ids.map((id) => {
    const match = options.find((o) => o.id === id)
    return typeof match?.label === 'string' ? match.label : id
  })
}

function scaleFallback(value: number): string {
  return `What's the main reason you gave a score of ${value}?`
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}
