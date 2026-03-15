import type {
  QuestionType,
  ResponseValue,
  SingleChoiceResponseValue,
  MultiChoiceResponseValue,
  ScaleResponseValue,
} from '../supabase/study-flow-types'

interface QuestionOption {
  id: string
  label: string
}

interface KeyboardHandlerContext {
  questionType: QuestionType
  options: QuestionOption[]
  value: ResponseValue | undefined
  onChange: (value: ResponseValue) => void
  scalePoints: number
  maxSelections?: number
  onSelectionComplete?: () => void
  lastNpsKey: React.MutableRefObject<{ key: string; time: number } | null>
}

// Convert letter to index (A = 0, B = 1, etc.)
function letterToIndex(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - 65
}

/**
 * Handle keyboard input for radio/dropdown questions
 */
function handleRadioKey(
  key: string,
  ctx: KeyboardHandlerContext
): boolean {
  if (!/^[A-Z]$/.test(key)) return false

  const index = letterToIndex(key)
  if (index < 0 || index >= ctx.options.length) return false

  const option = ctx.options[index]
  const newValue: SingleChoiceResponseValue = { optionId: option.id }
  ctx.onChange(newValue)
  ctx.onSelectionComplete?.()
  return true
}

/**
 * Handle keyboard input for checkbox questions
 */
function handleCheckboxKey(
  key: string,
  ctx: KeyboardHandlerContext
): boolean {
  if (!/^[A-Z]$/.test(key)) return false

  const index = letterToIndex(key)
  if (index < 0 || index >= ctx.options.length) return false

  const option = ctx.options[index]
  const currentValue = ctx.value as MultiChoiceResponseValue | undefined
  const currentIds = currentValue?.optionIds || []

  let newIds: string[]
  if (currentIds.includes(option.id)) {
    newIds = currentIds.filter((id) => id !== option.id)
  } else {
    if (ctx.maxSelections && currentIds.length >= ctx.maxSelections) {
      return false // Can't select more
    }
    newIds = [...currentIds, option.id]
  }

  const newValue: MultiChoiceResponseValue = {
    optionIds: newIds,
    otherText: currentValue?.otherText,
  }
  ctx.onChange(newValue)

  // Auto-advance only if maxSelections is set and reached
  if (ctx.maxSelections && newIds.length >= ctx.maxSelections) {
    ctx.onSelectionComplete?.()
  }
  return true
}

/**
 * Handle keyboard input for likert scale questions (opinion_scale type)
 * Opinion scale uses plain number, not ScaleResponseValue object
 * Supports both letter keys (A-E) and number keys (1-5) for better UX
 */
function handleLikertKey(
  key: string,
  ctx: KeyboardHandlerContext
): boolean {
  let value: number

  // Check if it's a number key (1-9, 0)
  if (/^[0-9]$/.test(key)) {
    value = parseInt(key, 10)

    // Handle special case: 0 might represent 10 for 10-point scales
    if (value === 0) {
      value = 10
    }

    // Check if the number is within valid range
    const minValue = ctx.scalePoints === 10 ? 1 : (ctx.scalePoints === 5 ? 1 : 1)
    const maxValue = ctx.scalePoints

    if (value < minValue || value > maxValue) return false

  } else if (/^[A-Z]$/.test(key)) {
    // Letter key support (A=1, B=2, etc.)
    const index = letterToIndex(key)
    if (index < 0 || index >= ctx.scalePoints) return false
    value = index + 1
  } else {
    return false
  }

  // Opinion scale expects a plain number, not an object
  ctx.onChange(value)
  ctx.onSelectionComplete?.()
  return true
}

/**
 * Handle keyboard input for NPS questions (0-10 scale)
 */
function handleNpsKey(
  key: string,
  ctx: KeyboardHandlerContext
): boolean {
  if (!/^[0-9]$/.test(key)) return false

  const pressedNum = parseInt(key, 10)
  const now = Date.now()

  // Check for double-press of 0 for score 10
  if (pressedNum === 0) {
    const currentScoreValue = (ctx.value as ScaleResponseValue)?.value
    if (
      ctx.lastNpsKey.current?.key === '0' &&
      now - ctx.lastNpsKey.current.time < 500 &&
      currentScoreValue === 0
    ) {
      const newValue: ScaleResponseValue = { value: 10 }
      ctx.onChange(newValue)
      ctx.onSelectionComplete?.()
      ctx.lastNpsKey.current = null
      return true
    }
  }

  ctx.lastNpsKey.current = { key, time: now }
  const newValue: ScaleResponseValue = { value: pressedNum }
  ctx.onChange(newValue)
  ctx.onSelectionComplete?.()
  return true
}

/**
 * Route keyboard input to the appropriate handler based on question type
 */
export function handleQuestionKeypress(
  key: string,
  ctx: KeyboardHandlerContext
): boolean {
  switch (ctx.questionType) {
    case 'multiple_choice':
    case 'image_choice':
      // Use maxSelections to determine single vs multi select behavior
      if (ctx.maxSelections !== undefined) {
        return handleCheckboxKey(key, ctx)
      }
      return handleRadioKey(key, ctx)
    case 'yes_no':
      return handleRadioKey(key, ctx)
    case 'opinion_scale':
      return handleLikertKey(key, ctx)
    case 'nps':
      return handleNpsKey(key, ctx)
    default:
      return false
  }
}

/**
 * Get the keyboard hint for an option at the given index
 */
export function getKeyboardHint(questionType: QuestionType, index: number): string {
  if (questionType === 'nps') {
    // NPS uses numbers 0-9, then "00" for 10 (press 0 twice)
    if (index === 10) return '00'
    return String(index)
  }
  // Convert index to letter (0 = A, 1 = B, etc.)
  return String.fromCharCode(65 + index)
}
