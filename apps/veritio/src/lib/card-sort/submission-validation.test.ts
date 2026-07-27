import { describe, expect, it } from 'vitest'
import {
  readCardSortSubmissionSettings,
  validateCardSortSubmission,
} from './submission-validation'

const categories = [
  {
    id: 'category-1',
    label: 'Products',
    min_cards: 1,
    max_cards: 2,
  },
]
const cardIds = ['card-1', 'card-2']

describe('card-sort submission validation', () => {
  it('ignores dormant predefined limits in open mode', () => {
    expect(
      validateCardSortSubmission({
        settings: { mode: 'open' },
        cardIds,
        categories,
        cardPlacements: {},
      })
    ).toBeNull()
  })

  it('rejects forged cards, categories, and labels', () => {
    const base = {
      settings: { mode: 'closed' as const, allowSkip: true },
      cardIds,
      categories,
      customCategories: null,
    }

    expect(
      validateCardSortSubmission({
        ...base,
        cardPlacements: { forged: 'Products' },
        categoryAssignments: { forged: 'category-1' },
      })
    ).toMatch(/unknown card/)
    expect(
      validateCardSortSubmission({
        ...base,
        cardPlacements: { 'card-1': 'Products' },
        categoryAssignments: { 'card-1': 'forged-category' },
      })
    ).toMatch(/unknown category/)
    expect(
      validateCardSortSubmission({
        ...base,
        cardPlacements: { 'card-1': 'Spoofed label' },
        categoryAssignments: { 'card-1': 'category-1' },
      })
    ).toMatch(/does not match/)
  })

  it('enforces minimum, maximum, and all-card requirements', () => {
    expect(
      validateCardSortSubmission({
        settings: { mode: 'closed' },
        cardIds,
        categories,
        cardPlacements: { 'card-1': 'Products' },
        categoryAssignments: { 'card-1': 'category-1' },
      })
    ).toMatch(/sort all 2 cards/)
    expect(
      validateCardSortSubmission({
        settings: { mode: 'closed', allowSkip: true },
        cardIds,
        categories,
        cardPlacements: {},
        categoryAssignments: {},
      })
    ).toMatch(/at least 1 card/)
  })

  it('normalizes legacy and malformed settings safely', () => {
    expect(readCardSortSubmissionSettings({ mode: 'hybrid' })).toEqual({
      mode: 'hybrid',
      allowSkip: false,
      requireAllCardsSorted: undefined,
      cardSubset: undefined,
      includeUnclearCategory: false,
    })
    expect(readCardSortSubmissionSettings(null)).toEqual({ mode: 'open' })
  })
})
