import { describe, expect, it } from 'vitest'
import {
  canPlaceCardInCategory,
  validateCategoryLimitValues,
  validateCategoryPlacements,
  validateStoredCardPlacements,
} from './category-limits'

const category = {
  id: 'category-1',
  label: 'Navigation',
  min_cards: 1,
  max_cards: 2,
}

describe('card-sort category limits', () => {
  it('rejects invalid category constraints', () => {
    expect(validateCategoryLimitValues(-1, null)).toMatch(/non-negative/)
    expect(validateCategoryLimitValues(3, 2)).toMatch(/cannot be greater/)
    expect(validateCategoryLimitValues(1, 2)).toBeNull()
  })

  it('prevents a new placement once the maximum is reached', () => {
    const placements = [
      { cardId: 'card-1', categoryId: category.id },
      { cardId: 'card-2', categoryId: category.id },
    ]
    expect(canPlaceCardInCategory(placements, category, 'card-3')).toBe(false)
    expect(canPlaceCardInCategory(placements, category, 'card-1')).toBe(true)
  })

  it('reports minimum and forged maximum violations', () => {
    expect(validateCategoryPlacements([category], [])).toMatchObject([
      { categoryId: category.id, type: 'minimum' },
    ])
    expect(
      validateStoredCardPlacements([category], {
        'card-1': category.label,
        'card-2': category.label,
        'card-3': category.label,
      })
    ).toMatchObject([{ categoryId: category.id, type: 'maximum' }])
  })
})
