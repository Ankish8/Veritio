// =============================================================================
// VALIDATION UTILITIES
// Helper functions for validation
// =============================================================================

import type { ValidationSectionId, ValidationIssue, ValidationNavigationPath } from './types'
import { SECTION_LABELS } from './types'

// -----------------------------------------------------------------------------
// ID Generation
// -----------------------------------------------------------------------------

let issueCounter = 0

/**
 * Generate a unique ID for a validation issue
 */
export function generateIssueId(
  section: ValidationSectionId,
  itemId?: string,
  rule?: string
): string {
  issueCounter++
  const parts = [section, itemId || 'section', rule || 'generic', issueCounter]
  return parts.join('-')
}

/**
 * Reset the issue counter (for testing)
 */
export function resetIssueCounter(): void {
  issueCounter = 0
}

// -----------------------------------------------------------------------------
// HTML Content Helpers
// -----------------------------------------------------------------------------

/**
 * Check if HTML content is effectively empty
 * Strips tags and checks for non-whitespace content
 */
export function isHtmlEmpty(html: string | undefined | null): boolean {
  if (!html) return true
  // Remove all HTML tags
  const text = html.replace(/<[^>]*>/g, '').trim()
  // Also handle &nbsp; and other HTML entities
  const withoutEntities = text.replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/gi, ' ').trim()
  return withoutEntities.length === 0
}

/**
 * Strip HTML tags from content
 */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/gi, ' ').trim()
}

// -----------------------------------------------------------------------------
// Text Helpers
// -----------------------------------------------------------------------------

/**
 * Truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number = 40): string {
  if (!text) return ''
  const stripped = stripHtml(text)
  if (stripped.length <= maxLength) return stripped
  return stripped.slice(0, maxLength - 3) + '...'
}

/**
 * Get a display label for a question (Q1, Q2, etc.)
 */
export function getQuestionLabel(position: number): string {
  return `Q${position + 1}`
}

// -----------------------------------------------------------------------------
// Issue Creation Helpers
// -----------------------------------------------------------------------------

/**
 * Create a validation issue
 */
export function createIssue(
  section: ValidationSectionId,
  message: string,
  navigationPath: ValidationNavigationPath,
  options?: {
    itemLabel?: string
    itemId?: string
    rule?: string
  }
): ValidationIssue {
  return {
    id: generateIssueId(section, options?.itemId, options?.rule),
    section,
    sectionLabel: SECTION_LABELS[section],
    message,
    itemLabel: options?.itemLabel,
    navigationPath,
  }
}

// -----------------------------------------------------------------------------
// Duplicate Detection
// -----------------------------------------------------------------------------

/**
 * Find duplicate labels in an array (case-insensitive)
 */
export function findDuplicateLabels(items: Array<{ label: string; id?: string }>): string[] {
  const seen = new Map<string, number>()
  const duplicates: string[] = []

  for (const item of items) {
    const normalized = item.label.toLowerCase().trim()
    if (!normalized) continue // Skip empty labels

    const count = (seen.get(normalized) || 0) + 1
    seen.set(normalized, count)

    if (count === 2) {
      // Only add to duplicates on the second occurrence
      duplicates.push(item.label)
    }
  }

  return duplicates
}

/**
 * Check if an array has duplicate labels (case-insensitive)
 */
export function hasDuplicateLabels(items: Array<{ label: string }>): boolean {
  const seen = new Set<string>()
  for (const item of items) {
    const normalized = item.label.toLowerCase().trim()
    if (!normalized) continue
    if (seen.has(normalized)) return true
    seen.add(normalized)
  }
  return false
}

/**
 * Find items with empty labels
 */
export function findEmptyLabels(items: Array<{ label: string; id: string }>): string[] {
  return items
    .filter(item => !item.label || item.label.trim().length === 0)
    .map(item => item.id)
}
