import type { ChoiceOption, BranchingLogic, BranchingRule } from '../supabase/study-flow-types'
export function parseBulkEditText(
  text: string,
  existingOptions: ChoiceOption[]
): ChoiceOption[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  // Create a map of existing options by label for O(1) lookup
  const existingByLabel = new Map(
    existingOptions.map((opt) => [opt.label.toLowerCase(), opt])
  )

  return lines.map((label) => {
    // Try to find existing option with same label (case-insensitive)
    const existing = existingByLabel.get(label.toLowerCase())
    if (existing) {
      // Preserve the original ID but use the new label (might have different casing)
      return { ...existing, label }
    }
    // Create new option with fresh UUID
    return {
      id: crypto.randomUUID(),
      label,
    }
  })
}
export function optionsToBulkEditText(options: ChoiceOption[]): string {
  return options.map((opt) => opt.label).join('\n')
}
export function filterBranchingRulesForOptions(
  logic: BranchingLogic | null | undefined,
  newOptions: ChoiceOption[]
): BranchingLogic | null {
  if (!logic) return null

  const validOptionIds = new Set(newOptions.map((opt) => opt.id))

  const filteredRules = logic.rules.filter((rule) =>
    validOptionIds.has(rule.optionId)
  )

  return {
    rules: filteredRules,
    defaultTarget: logic.defaultTarget,
  }
}
export function getBulkEditChanges(
  oldOptions: ChoiceOption[],
  newOptions: ChoiceOption[]
): {
  added: number
  removed: number
  preserved: number
  removedOptions: ChoiceOption[]
} {
  const oldIds = new Set(oldOptions.map((opt) => opt.id))
  const newIds = new Set(newOptions.map((opt) => opt.id))

  const preserved = [...newIds].filter((id) => oldIds.has(id)).length
  const added = newOptions.length - preserved
  const removed = oldOptions.length - preserved

  const removedOptions = oldOptions.filter((opt) => !newIds.has(opt.id))

  return {
    added,
    removed,
    preserved,
    removedOptions,
  }
}
export function validateBulkEditText(text: string): {
  isValid: boolean
  error?: string
  lineCount: number
} {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    return {
      isValid: false,
      error: 'At least 2 options are required',
      lineCount: lines.length,
    }
  }

  // Check for duplicates
  const uniqueLines = new Set(lines.map((l) => l.toLowerCase()))
  if (uniqueLines.size !== lines.length) {
    return {
      isValid: false,
      error: 'Duplicate options are not allowed',
      lineCount: lines.length,
    }
  }

  return {
    isValid: true,
    lineCount: lines.length,
  }
}
