import type {
  Card,
  Category,
  CardSortSettings,
  CardSortValidationResult,
  CardSortValidationError,
  CardSortValidationWarning,
  CardSortValidationErrorCode,
  CardSortValidationWarningCode,
} from '../types'

const MIN_RECOMMENDED_CARDS = 10
const MIN_RECOMMENDED_CATEGORIES = 3

export function validateCardSort(
  cards: Card[],
  categories: Category[],
  settings: CardSortSettings
): CardSortValidationResult {
  const errors: CardSortValidationError[] = []
  const warnings: CardSortValidationWarning[] = []

  if (cards.length === 0) {
    errors.push(createError('NO_CARDS', 'At least one card is required'))
  }

  if (settings.mode !== 'open' && categories.length === 0) {
    errors.push(
      createError('NO_CATEGORIES', 'At least one category is required for closed or hybrid mode')
    )
  }

  const cardTitles = new Set<string>()
  for (const card of cards) {
    if (!card.title?.trim()) {
      errors.push(
        createError('CARD_MISSING_TITLE', `Card at position ${card.position + 1} is missing a title`, {
          cardId: card.id,
          field: 'title',
        })
      )
    } else {
      const normalizedTitle = card.title.toLowerCase().trim()
      if (cardTitles.has(normalizedTitle)) {
        errors.push(
          createError('DUPLICATE_CARD_TITLE', `Duplicate card title: "${card.title}"`, {
            cardId: card.id,
            field: 'title',
          })
        )
      }
      cardTitles.add(normalizedTitle)
    }

    if (!card.description?.trim()) {
      warnings.push(
        createWarning(
          'CARD_MISSING_DESCRIPTION',
          `Card "${card.title || `at position ${card.position + 1}`}" has no description`,
          { field: 'description' }
        )
      )
    }
  }

  const categoryNames = new Set<string>()
  for (const category of categories) {
    if (!category.name?.trim()) {
      errors.push(
        createError('CATEGORY_MISSING_NAME', `Category at position ${category.position + 1} is missing a name`, {
          categoryId: category.id,
          field: 'name',
        })
      )
    } else {
      const normalizedName = category.name.toLowerCase().trim()
      if (categoryNames.has(normalizedName)) {
        errors.push(
          createError('DUPLICATE_CATEGORY_NAME', `Duplicate category name: "${category.name}"`, {
            categoryId: category.id,
            field: 'name',
          })
        )
      }
      categoryNames.add(normalizedName)
    }

    if (settings.showCategoryDescriptions && !category.description?.trim()) {
      warnings.push(
        createWarning(
          'CATEGORY_MISSING_DESCRIPTION',
          `Category "${category.name || `at position ${category.position + 1}`}" has no description`,
          { field: 'description' }
        )
      )
    }
  }

  if (settings.cardSubset && settings.cardSubset > cards.length) {
    errors.push(
      createError(
        'CARD_LIMIT_EXCEEDED',
        `Card subset (${settings.cardSubset}) exceeds total cards (${cards.length})`,
        { field: 'cardSubset' }
      )
    )
  }

  if (cards.length > 0 && cards.length < MIN_RECOMMENDED_CARDS) {
    warnings.push(
      createWarning(
        'FEW_CARDS',
        `Study has only ${cards.length} cards. Consider adding more for better results.`
      )
    )
  }

  if (settings.mode !== 'open' && categories.length > 0 && categories.length < MIN_RECOMMENDED_CATEGORIES) {
    warnings.push(
      createWarning(
        'FEW_CATEGORIES',
        `Study has only ${categories.length} categories. Consider adding more for better analysis.`
      )
    )
  }

  const hasLimits = categories.some((c) => c.min_cards != null || c.max_cards != null)
  if (hasLimits) {
    const totalMin = categories.reduce((sum, c) => sum + (c.min_cards || 0), 0)
    const totalMax = categories.reduce((sum, c) => sum + (c.max_cards || Infinity), 0)

    if (totalMin > cards.length) {
      warnings.push(
        createWarning(
          'UNBALANCED_CATEGORY_LIMITS',
          `Minimum card requirements (${totalMin}) exceed total cards (${cards.length})`
        )
      )
    }

    if (totalMax < cards.length && totalMax !== Infinity) {
      warnings.push(
        createWarning(
          'UNBALANCED_CATEGORY_LIMITS',
          `Maximum card limits (${totalMax}) are less than total cards (${cards.length})`
        )
      )
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

function createError(
  code: CardSortValidationErrorCode,
  message: string,
  options?: { cardId?: string; categoryId?: string; field?: string }
): CardSortValidationError {
  return {
    code,
    message,
    ...options,
  }
}

function createWarning(
  code: CardSortValidationWarningCode,
  message: string,
  options?: { field?: string }
): CardSortValidationWarning {
  return {
    code,
    message,
    ...options,
  }
}

