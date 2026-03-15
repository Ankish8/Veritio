/**
 * Segment Condition Configurations
 *
 * Defines all available segment conditions organized by tier and study type.
 * This is the single source of truth for what conditions are available
 * and how they behave.
 */

import type { ConditionDefinition, TierMetadata, ConditionTier, OperatorDefinition } from './types'

// =============================================================================
// TIER METADATA
// =============================================================================

export const TIER_METADATA: TierMetadata[] = [
  {
    id: 'essential',
    label: 'Essential',
    description: 'Core filters available for all studies',
  },
  {
    id: 'quality',
    label: 'Quality & Segmentation',
    description: 'Filters for data quality and participant segments',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'Study-specific performance metrics',
  },
]

export const TIER_LABELS: Record<ConditionTier, string> = {
  essential: 'Essential',
  quality: 'Quality & Segmentation',
  advanced: 'Advanced',
}

// =============================================================================
// OPERATORS BY VALUE TYPE
// =============================================================================

export const OPERATORS_BY_VALUE_TYPE: Record<string, OperatorDefinition[]> = {
  status: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
  ],
  text: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'contains', label: 'Contains' },
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'between', label: 'Between', requiresSecondValue: true },
  ],
  percentage: [
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'between', label: 'Between', requiresSecondValue: true },
  ],
  select: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
  ],
  question: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
    { value: 'contains', label: 'Contains' },
  ],
  url_tag: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
    { value: 'contains', label: 'Contains' },
  ],
  response_tag: [
    { value: 'equals', label: 'Has tag' },
    { value: 'not_equals', label: 'Does not have tag' },
  ],
}

/**
 * Get operators for a specific value type
 */
export function getOperatorsForValueType(valueType: string): OperatorDefinition[] {
  return OPERATORS_BY_VALUE_TYPE[valueType] || OPERATORS_BY_VALUE_TYPE.text
}

// =============================================================================
// CONDITION DEFINITIONS
// =============================================================================

/**
 * All condition definitions with tier and study type metadata.
 * Order matters - conditions are displayed in this order within each tier.
 */
export const CONDITION_DEFINITIONS: ConditionDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1: ESSENTIAL (available for all studies)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'status',
    label: 'Status',
    description: 'Filter by participant completion status',
    tier: 'essential',
    valueType: 'status',
    studyTypes: 'all',
  },
  {
    type: 'question_response',
    label: 'Question response',
    description: 'Filter by answer to a specific question',
    tier: 'essential',
    valueType: 'question',
    studyTypes: 'all',
  },
  {
    type: 'participant_id',
    label: 'Participant ID',
    description: 'Filter by specific participant identifier',
    tier: 'essential',
    valueType: 'text',
    studyTypes: 'all',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2: QUALITY & SEGMENTATION
  // ═══════════════════════════════════════════════════════════════════════════

  // Common quality conditions (all studies)
  {
    type: 'time_taken',
    label: 'Time taken',
    description: 'Total time spent on the study',
    tier: 'quality',
    valueType: 'number',
    studyTypes: 'all',
    unit: 'seconds',
    defaultRange: { min: 0, max: 600 },
  },
  {
    type: 'url_tag',
    label: 'URL tag',
    description: 'Filter by URL parameter value',
    tier: 'quality',
    valueType: 'url_tag',
    studyTypes: 'all',
  },

  // Card Sort specific
  {
    type: 'categories_created',
    label: 'Categories created',
    description: 'Number of categories participant created',
    tier: 'quality',
    valueType: 'number',
    studyTypes: ['card_sort'],
    defaultRange: { min: 0, max: 20 },
  },

  // First Impression specific
  {
    type: 'device_type',
    label: 'Device type',
    description: 'Filter by device used (desktop, tablet, mobile)',
    tier: 'quality',
    valueType: 'select',
    studyTypes: ['first_impression'],
  },
  {
    type: 'design_assignment',
    label: 'Design shown',
    description: 'Filter by which design the participant was shown',
    tier: 'quality',
    valueType: 'select',
    studyTypes: ['first_impression'],
  },
  {
    type: 'response_tag',
    label: 'Response tag',
    description: 'Filter by tags assigned to participant responses',
    tier: 'quality',
    valueType: 'response_tag',
    studyTypes: ['first_impression'],
  },

  // Tree Test specific
  {
    type: 'task_success_rate',
    label: 'Task success rate',
    description: 'Percentage of tasks completed correctly',
    tier: 'quality',
    valueType: 'percentage',
    studyTypes: ['tree_test', 'prototype_test'],
    unit: '%',
    defaultRange: { min: 0, max: 100 },
  },

  // First Click specific
  {
    type: 'correct_clicks_rate',
    label: 'Correct clicks rate',
    description: 'Percentage of clicks in the correct area',
    tier: 'quality',
    valueType: 'percentage',
    studyTypes: ['first_click'],
    unit: '%',
    defaultRange: { min: 0, max: 100 },
  },

  // Survey specific
  {
    type: 'questions_answered',
    label: 'Questions answered',
    description: 'Number of questions the participant answered',
    tier: 'quality',
    valueType: 'number',
    studyTypes: ['survey'],
    defaultRange: { min: 0, max: 100 },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: ADVANCED (study-specific)
  // ═══════════════════════════════════════════════════════════════════════════

  // First Impression advanced
  {
    type: 'response_rate',
    label: 'Response rate',
    description: 'Percentage of questions answered',
    tier: 'advanced',
    valueType: 'percentage',
    studyTypes: ['first_impression'],
    unit: '%',
    defaultRange: { min: 0, max: 100 },
  },

  // Tree Test advanced
  {
    type: 'direct_success_rate',
    label: 'Direct success rate',
    description: 'Percentage of tasks completed without backtracking',
    tier: 'advanced',
    valueType: 'percentage',
    studyTypes: ['tree_test'],
    unit: '%',
    defaultRange: { min: 0, max: 100 },
  },
  {
    type: 'tasks_completed',
    label: 'Tasks completed',
    description: 'Number of tasks the participant completed',
    tier: 'advanced',
    valueType: 'number',
    studyTypes: ['tree_test', 'first_click'],
    defaultRange: { min: 0, max: 50 },
  },

  // Prototype Test advanced
  {
    type: 'misclick_count',
    label: 'Misclick count',
    description: 'Total number of misclicks across all tasks',
    tier: 'advanced',
    valueType: 'number',
    studyTypes: ['prototype_test'],
    defaultRange: { min: 0, max: 100 },
  },
]
