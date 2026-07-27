export interface CategoryLimit {
  id: string
  label: string
  min_cards?: number | null
  max_cards?: number | null
}

export interface CardPlacement {
  cardId: string
  categoryId: string
}

export interface CategoryLimitViolation {
  categoryId: string
  message: string
  type: 'minimum' | 'maximum'
}

export function validateCategoryLimitValues(
  minCards: number | null | undefined,
  maxCards: number | null | undefined
): string | null {
  if (minCards != null && (!Number.isInteger(minCards) || minCards < 0)) {
    return 'Minimum cards must be a non-negative whole number.'
  }
  if (maxCards != null && (!Number.isInteger(maxCards) || maxCards < 0)) {
    return 'Maximum cards must be a non-negative whole number.'
  }
  if (minCards != null && maxCards != null && minCards > maxCards) {
    return 'Minimum cards cannot be greater than maximum cards.'
  }
  return null
}

export function getCategoryCardCount(
  placements: CardPlacement[],
  categoryId: string
): number {
  return placements.reduce(
    (count, placement) => count + (placement.categoryId === categoryId ? 1 : 0),
    0
  )
}

export function canPlaceCardInCategory(
  placements: CardPlacement[],
  category: CategoryLimit,
  cardId: string
): boolean {
  if (category.max_cards == null) return true
  const isAlreadyInCategory = placements.some(
    (placement) =>
      placement.cardId === cardId && placement.categoryId === category.id
  )
  return (
    isAlreadyInCategory ||
    getCategoryCardCount(placements, category.id) < category.max_cards
  )
}

export function validateCategoryPlacements(
  categories: CategoryLimit[],
  placements: CardPlacement[]
): CategoryLimitViolation[] {
  const violations: CategoryLimitViolation[] = []

  for (const category of categories) {
    const count = getCategoryCardCount(placements, category.id)
    if (category.min_cards != null && count < category.min_cards) {
      violations.push({
        categoryId: category.id,
        type: 'minimum',
        message: `"${category.label}" needs at least ${category.min_cards} card${
          category.min_cards === 1 ? '' : 's'
        } (${count} currently).`,
      })
    }
    if (category.max_cards != null && count > category.max_cards) {
      violations.push({
        categoryId: category.id,
        type: 'maximum',
        message: `"${category.label}" allows at most ${category.max_cards} card${
          category.max_cards === 1 ? '' : 's'
        } (${count} currently).`,
      })
    }
  }

  return violations
}

export function validateStoredCardPlacements(
  categories: CategoryLimit[],
  cardPlacements: Record<string, string>
): CategoryLimitViolation[] {
  const counts = new Map<string, number>()
  for (const categoryLabel of Object.values(cardPlacements)) {
    counts.set(categoryLabel, (counts.get(categoryLabel) ?? 0) + 1)
  }

  return categories.flatMap<CategoryLimitViolation>((category) => {
    const count = counts.get(category.label) ?? 0
    if (category.min_cards != null && count < category.min_cards) {
      return [{
        categoryId: category.id,
        type: 'minimum' as const,
        message: `"${category.label}" needs at least ${category.min_cards} card${
          category.min_cards === 1 ? '' : 's'
        }.`,
      }]
    }
    if (category.max_cards != null && count > category.max_cards) {
      return [{
        categoryId: category.id,
        type: 'maximum' as const,
        message: `"${category.label}" allows at most ${category.max_cards} card${
          category.max_cards === 1 ? '' : 's'
        }.`,
      }]
    }
    return []
  })
}
