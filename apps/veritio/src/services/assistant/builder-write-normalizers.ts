/**
 * Normalizers & utilities for builder write tool handlers.
 *
 * These transform LLM-provided data into the canonical shapes expected by the
 * database layer (option labels, question types, branching logic, images, etc.).
 */

// ---------------------------------------------------------------------------
// Question data preparation
// ---------------------------------------------------------------------------

/**
 * Prepare question data: normalize type and config with all necessary transformations
 */
export function prepareQuestionData(item: Record<string, unknown>): { questionType: string; config: Record<string, unknown> } {
  const rawType = String(item.question_type || 'single_line_text')
  const rawConfig = mergeItemLevelArrays(item, (item.config as Record<string, unknown>) ?? {})
  const normalized = normalizeQuestionType(rawType, rawConfig)
  const sanitizedConfig = ensureOptionIds(normalizeOptionLabels(normalized.config))
  return { questionType: normalized.question_type, config: sanitizedConfig }
}

/**
 * Prepare config: merge item-level arrays and normalize
 */
export function prepareConfig(item: Record<string, unknown>, config: Record<string, unknown>): Record<string, unknown> {
  const rawConfig = mergeItemLevelArrays(item, config)
  return ensureOptionIds(normalizeOptionLabels(rawConfig))
}

// ---------------------------------------------------------------------------
// Branching logic normalization
// ---------------------------------------------------------------------------

/**
 * Normalize branching_logic from various LLM formats
 */
export function normalizeBranchingLogic(
  logic: Record<string, unknown> | null | undefined,
  questionType: string,
  config: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!logic || typeof logic !== 'object') return null

  const isYesNo = questionType === 'yes_no'
  const options = (Array.isArray(config.options) ? config.options : []) as Record<string, unknown>[]

  const resolveOptionId = (raw: string): string => {
    if (isYesNo) {
      const lower = raw.toLowerCase().trim()
      if (lower === 'yes' || lower === 'true') return 'yes'
      if (lower === 'no' || lower === 'false') return 'no'
      return raw
    }
    if (/^[0-9a-f-]{36}$/i.test(raw)) return raw
    const match = options.find(
      (o) => String(o.label || '').toLowerCase().trim() === raw.toLowerCase().trim()
    )
    return match?.id ? String(match.id) : raw
  }

  const normalizeTarget = (t: unknown): string =>
    String(t || 'next') === 'reject' ? 'reject' : 'next'

  // Format 1: Has rules array
  if (Array.isArray(logic.rules)) {
    const rules = (logic.rules as Record<string, unknown>[]).map((rule) => {
      const rawId = String(rule.optionId ?? rule.option ?? rule.option_id ?? '')
      return {
        optionId: resolveOptionId(rawId),
        target: normalizeTarget(rule.target ?? rule.action),
      }
    })
    return {
      rules,
      defaultTarget: normalizeTarget(logic.defaultTarget ?? logic.default_target),
    }
  }

  // Format 2: Old { action, conditions }
  if (logic.action !== undefined || Array.isArray(logic.conditions)) {
    const action = normalizeTarget(logic.action)
    const conditions = (Array.isArray(logic.conditions) ? logic.conditions : []) as Record<string, unknown>[]
    const rules: { optionId: string; target: string }[] = []

    for (const cond of conditions) {
      const value = String(cond.value ?? cond.optionId ?? cond.option ?? '')
      if (!value) continue
      rules.push({ optionId: resolveOptionId(value), target: action })
    }

    if (rules.length > 0) {
      return { rules, defaultTarget: 'next' }
    }
  }

  // Format 3: Simplified map for yes_no
  if (isYesNo && ('yes' in logic || 'no' in logic || 'Yes' in logic || 'No' in logic)) {
    const rules: { optionId: string; target: string }[] = []
    const yesTarget = normalizeTarget(logic.yes ?? logic.Yes)
    const noTarget = normalizeTarget(logic.no ?? logic.No)
    if (yesTarget === 'reject') rules.push({ optionId: 'yes', target: 'reject' })
    if (noTarget === 'reject') rules.push({ optionId: 'no', target: 'reject' })
    return { rules, defaultTarget: 'next' }
  }

  return logic
}

// ---------------------------------------------------------------------------
// Image normalization
// ---------------------------------------------------------------------------

/**
 * Normalize image data from various LLM formats
 */
export function normalizeImage(raw: unknown): { url: string; alt?: string } | null {
  if (!raw) return null

  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return { url: trimmed }
    }
    return null
  }

  if (typeof raw !== 'object') return null

  const obj = raw as Record<string, unknown>

  // Nested { image: { url } }
  if (obj.image && typeof obj.image === 'object') {
    return normalizeImage(obj.image)
  }

  // Extract URL from various field names
  const urlValue = obj.url ?? obj.src ?? obj.image_url ?? obj.href
  if (typeof urlValue === 'string') {
    const trimmed = urlValue.trim()
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return {
        url: trimmed,
        ...(typeof obj.alt === 'string' ? { alt: obj.alt } : {}),
      }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Option & config normalization
// ---------------------------------------------------------------------------

/**
 * Merge array fields from item level into config
 */
export function mergeItemLevelArrays(
  item: Record<string, unknown>,
  config: Record<string, unknown>,
): Record<string, unknown> {
  const arrayFields = ['options', 'rows', 'columns', 'items', 'scales']
  let merged = config
  for (const field of arrayFields) {
    if (Array.isArray(item[field]) && !Array.isArray(merged[field])) {
      merged = { ...merged, [field]: item[field] }
    }
  }
  return merged
}

/**
 * Normalize option labels - convert strings and wrong field names
 */
export function normalizeOptionLabels(config: Record<string, unknown>): Record<string, unknown> {
  const arrayFields = ['options', 'rows', 'columns', 'items', 'scales']
  let result = config

  for (const field of arrayFields) {
    const arr = result[field]
    if (!arr || !Array.isArray(arr)) continue

    let changed = false
    const normalized = arr.map((item: unknown) => {
      if (typeof item === 'string') {
        changed = true
        return { label: item }
      }

      if (typeof item !== 'object' || item === null) return item

      const obj = item as Record<string, unknown>
      if (typeof obj.label === 'string' && obj.label.trim()) return obj

      const altFields = ['text', 'value', 'name', 'title', 'content']
      for (const alt of altFields) {
        const v = obj[alt]
        if (typeof v === 'string' && v.trim()) {
          changed = true
          return { ...obj, label: v }
        }
      }

      return obj
    })

    if (changed) {
      result = { ...result, [field]: normalized }
    }
  }

  return result
}

/**
 * Ensure all array items have unique IDs
 */
export function ensureOptionIds(config: Record<string, unknown>): Record<string, unknown> {
  const arrayFields = ['options', 'rows', 'columns', 'items', 'scales']
  let result = config

  for (const field of arrayFields) {
    const arr = result[field]
    if (!arr || !Array.isArray(arr)) continue

    const seenIds = new Set<string>()
    const fixed = (arr as Record<string, unknown>[]).map((item) => {
      const id = item.id as string | undefined
      if (!id || seenIds.has(id)) {
        return { ...item, id: crypto.randomUUID() }
      }
      seenIds.add(id)
      return item
    })

    if (fixed !== arr) {
      result = { ...result, [field]: fixed }
    }
  }

  return result
}

/**
 * Normalize legacy question types
 */
export function normalizeQuestionType(
  rawType: string,
  config: Record<string, unknown>,
): { question_type: string; config: Record<string, unknown> } {
  switch (rawType) {
    case 'radio':
      return { question_type: 'multiple_choice', config: { mode: 'single', ...config } }
    case 'checkbox':
      return { question_type: 'multiple_choice', config: { mode: 'multi', ...config } }
    case 'dropdown':
      return { question_type: 'multiple_choice', config: { mode: 'dropdown', ...config } }
    case 'likert':
      return { question_type: 'opinion_scale', config: { scalePoints: 5, scaleType: 'stars', ...config } }
    case 'rating':
      return { question_type: 'slider', config: { minValue: 0, maxValue: 100, step: 1, ...config } }
    case 'yes_no':
      return { question_type: 'yes_no', config: { styleType: 'buttons', ...config } }
    case 'multiple_choice':
      return { question_type: 'multiple_choice', config: { mode: config.mode || 'single', ...config } }
    case 'opinion_scale':
      return { question_type: 'opinion_scale', config: { scalePoints: 5, scaleType: 'stars', ...config } }
    case 'slider':
      return { question_type: 'slider', config: { minValue: 0, maxValue: 100, step: 1, ...config } }
    default:
      return { question_type: rawType, config }
  }
}

// ---------------------------------------------------------------------------
// Misc utilities
// ---------------------------------------------------------------------------

/**
 * Ensure post-task questions have IDs
 */
export function ensurePostTaskQuestionIds(raw: unknown): unknown {
  if (!Array.isArray(raw)) return []
  return raw.map((q: any) => ({
    ...q,
    id: q.id || crypto.randomUUID(),
  }))
}

/** Strip HTML from DB-stored rich text fields for display in plain-text UI components */
export function stripHtmlForResult(html: unknown): string | undefined {
  if (!html || typeof html !== 'string') return undefined
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/?(p|div|h[1-6]|li|ul|ol|blockquote|strong|em|b|i|span|a)[^>]*>/gi, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim() || undefined
}

/**
 * Deep merge two objects
 */
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target }
  for (const [key, value] of Object.entries(source)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}
