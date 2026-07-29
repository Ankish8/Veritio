import {
  validateCategoryPlacements,
  type CategoryLimit,
} from './category-limits'
import { UNCLEAR_CATEGORY_ID, UNCLEAR_CATEGORY_LABEL } from './unclear-category'

export interface CardSortSubmissionSettings {
  mode: 'open' | 'closed' | 'hybrid'
  allowSkip?: boolean
  requireAllCardsSorted?: boolean
  cardSubset?: number
  includeUnclearCategory?: boolean
}

interface ValidateCardSortSubmissionInput {
  settings: CardSortSubmissionSettings
  cardIds: string[]
  categories: CategoryLimit[]
  cardPlacements: Record<string, string>
  categoryAssignments?: Record<string, string>
  customCategories?: string[] | null
}

export function readCardSortSubmissionSettings(
  value: unknown
): CardSortSubmissionSettings {
  if (!value || typeof value !== 'object') return { mode: 'open' }
  const settings = value as Record<string, unknown>
  const mode =
    settings.mode === 'closed' || settings.mode === 'hybrid'
      ? settings.mode
      : 'open'
  return {
    mode,
    allowSkip: settings.allowSkip === true,
    requireAllCardsSorted:
      typeof settings.requireAllCardsSorted === 'boolean'
        ? settings.requireAllCardsSorted
        : undefined,
    cardSubset:
      typeof settings.cardSubset === 'number' &&
      Number.isInteger(settings.cardSubset) &&
      settings.cardSubset > 0
        ? settings.cardSubset
        : undefined,
    includeUnclearCategory: settings.includeUnclearCategory === true,
  }
}

export function validateCardSortSubmission({
  settings,
  cardIds,
  categories,
  cardPlacements,
  categoryAssignments,
  customCategories,
}: ValidateCardSortSubmissionInput): string | null {
  const submittedCardIds = Object.keys(cardPlacements)
  const validCardIds = new Set(cardIds)
  if (submittedCardIds.some((cardId) => !validCardIds.has(cardId))) {
    return 'Submission contains an unknown card'
  }

  const requireAllCards =
    settings.requireAllCardsSorted ??
    (!settings.allowSkip && settings.mode === 'closed')
  const expectedCardCount = settings.cardSubset
    ? Math.min(settings.cardSubset, cardIds.length)
    : cardIds.length
  if (requireAllCards && submittedCardIds.length !== expectedCardCount) {
    return `Submission must sort all ${expectedCardCount} cards`
  }

  // Limits apply only to predefined categories in closed and hybrid sorts.
  const constrainedCategories =
    settings.mode === 'open'
      ? []
      : categories.filter(
          (category) =>
            category.min_cards != null || category.max_cards != null
        )

  if (!categoryAssignments) {
    return constrainedCategories.length > 0
      ? 'Category assignments are required for constrained categories'
      : null
  }
  if (submittedCardIds.some((cardId) => !categoryAssignments[cardId])) {
    return 'Category assignments are required for constrained categories'
  }

  const categoryById = new Map(
    categories.map((category) => [category.id, category])
  )
  const customLabels = new Set(
    (customCategories ?? []).map((label) => label.trim()).filter(Boolean)
  )
  const normalizedPlacements: Array<{
    cardId: string
    categoryId: string
  }> = []

  for (const cardId of submittedCardIds) {
    const categoryId = categoryAssignments[cardId]
    const submittedLabel = cardPlacements[cardId]
    const predefinedCategory = categoryById.get(categoryId)

    if (predefinedCategory) {
      if (predefinedCategory.label !== submittedLabel) {
        return 'Category label does not match its assignment'
      }
    } else if (
      categoryId === UNCLEAR_CATEGORY_ID &&
      settings.includeUnclearCategory
    ) {
      if (submittedLabel !== UNCLEAR_CATEGORY_LABEL) {
        return 'Unclear category label is invalid'
      }
    } else if (
      settings.mode !== 'closed' &&
      customLabels.has(submittedLabel)
    ) {
      // A participant-created category is valid in open/hybrid mode.
    } else {
      return 'Submission contains an unknown category'
    }

    normalizedPlacements.push({ cardId, categoryId })
  }

  const violations = validateCategoryPlacements(
    constrainedCategories,
    normalizedPlacements
  )
  return violations[0]?.message ?? null
}
