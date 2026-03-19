/**
 * Study Type Labels
 *
 * Human-readable labels for study types, used across the dashboard
 * and admin interfaces. Centralised here to avoid duplication.
 */

export const STUDY_TYPE_LABELS: Record<string, string> = {
  card_sort: 'Card Sort',
  tree_test: 'Tree Test',
  survey: 'Survey',
  prototype_test: 'Prototype Test',
  first_click: 'First Click',
  first_impression: 'First Impression',
  live_website_test: 'Live Website Test',
}

/** Return the human-readable label, falling back to the raw key. */
export function getStudyTypeLabel(type: string): string {
  return STUDY_TYPE_LABELS[type] ?? type
}
