import type { CardWithImage, Category, CardSortSettings } from '@veritio/study-types'
import type { ValidationIssue, ValidationNavigationPath } from '../types'
import { createIssue, truncateText, findDuplicateLabels } from '../utils'

function validateCards(cards: CardWithImage[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'content',
  }

  if (cards.length === 0) {
    issues.push(
      createIssue(
        'card_sort_content',
        'At least one card is required',
        navPath,
        { rule: 'min-cards' }
      )
    )
    return issues
  }

  const emptyCards = cards.filter(c => !c.label || c.label.trim().length === 0)
  if (emptyCards.length > 0) {
    for (const card of emptyCards) {
      issues.push(
        createIssue(
          'card_sort_content',
          `A card is missing a label`,
          { ...navPath, itemId: card.id, itemType: 'card' },
          { itemId: card.id, rule: 'empty-card-label' }
        )
      )
    }
  }

  const duplicates = findDuplicateLabels(cards)
  for (const label of duplicates) {
    issues.push(
      createIssue(
        'card_sort_content',
        `Duplicate card label "${truncateText(label, 25)}"`,
        navPath,
        { rule: 'duplicate-card-label' }
      )
    )
  }

  return issues
}

function validateCategories(
  categories: Category[],
  mode: CardSortSettings['mode']
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'content',
  }

  if (mode === 'open') {
    return issues
  }

  if (categories.length === 0) {
    issues.push(
      createIssue(
        'card_sort_content',
        'At least one category is required for closed/hybrid mode',
        navPath,
        { rule: 'min-categories' }
      )
    )
    return issues
  }

  const emptyCategories = categories.filter(c => !c.label || c.label.trim().length === 0)
  if (emptyCategories.length > 0) {
    for (const category of emptyCategories) {
      issues.push(
        createIssue(
          'card_sort_content',
          `A category is missing a label`,
          { ...navPath, itemId: category.id, itemType: 'category' },
          { itemId: category.id, rule: 'empty-category-label' }
        )
      )
    }
  }

  const duplicates = findDuplicateLabels(categories)
  for (const label of duplicates) {
    issues.push(
      createIssue(
        'card_sort_content',
        `Duplicate category label "${truncateText(label, 25)}"`,
        navPath,
        { rule: 'duplicate-category-label' }
      )
    )
  }

  return issues
}

export function validateCardSortContent(
  cards: CardWithImage[],
  categories: Category[],
  settings: CardSortSettings
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  issues.push(...validateCards(cards))
  issues.push(...validateCategories(categories, settings.mode))

  return issues
}
