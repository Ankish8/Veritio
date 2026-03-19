/** Question types that support AI follow-up probing. */
export const AI_FOLLOWUP_TYPES = [
  'single_line_text',
  'multi_line_text',
  'nps',
  'opinion_scale',
  'slider',
  'multiple_choice',
  'yes_no',
] as const

/**
 * Build a human-readable answer text for the AI evaluator.
 * Shared between survey-questions-step and questions-step.
 */
export function buildAnswerText(
  questionType: string,
  rawValue: unknown,
  config: Record<string, unknown>
): string {
  switch (questionType) {
    case 'single_line_text':
    case 'multi_line_text':
      return typeof rawValue === 'string' ? rawValue : (rawValue as any)?.text || ''

    case 'nps': {
      const npsVal =
        typeof rawValue === 'object' && rawValue !== null && 'value' in rawValue
          ? (rawValue as { value: number }).value
          : rawValue
      return typeof npsVal === 'number' ? `Rated ${npsVal} out of 10` : ''
    }

    case 'opinion_scale': {
      const points = (config as any)?.scalePoints ?? 5
      return typeof rawValue === 'number' ? `Rated ${rawValue} out of ${points}` : ''
    }

    case 'slider': {
      const min = (config as any)?.minValue ?? 0
      const max = (config as any)?.maxValue ?? 100
      return typeof rawValue === 'number' ? `Selected ${rawValue} on ${min}-${max} scale` : ''
    }

    case 'multiple_choice': {
      const options: { id: string; label: string }[] = (config as any)?.options ?? []
      if (rawValue && typeof rawValue === 'object' && 'optionIds' in rawValue) {
        const resp = rawValue as { optionIds: string[]; otherText?: string }
        const labels = resp.optionIds.map((id: string) => options.find((o) => o.id === id)?.label ?? id)
        const parts = [...labels, ...(resp.otherText ? [`Other: "${resp.otherText}"`] : [])]
        return `Selected: ${parts.join(', ')}`
      }
      if (rawValue && typeof rawValue === 'object' && 'optionId' in rawValue) {
        const resp = rawValue as { optionId: string; otherText?: string }
        const label = options.find((o) => o.id === resp.optionId)?.label ?? resp.optionId
        return resp.otherText ? `Selected: ${label} (Other: "${resp.otherText}")` : `Selected: ${label}`
      }
      return ''
    }

    case 'yes_no':
      if (typeof rawValue === 'boolean') return rawValue ? 'Yes' : 'No'
      return rawValue === true ? 'Yes' : rawValue === false ? 'No' : ''

    default:
      return ''
  }
}
