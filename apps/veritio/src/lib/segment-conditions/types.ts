/**
 * Segment Condition Type Definitions
 *
 * Defines types for the study-type-specific condition configuration system.
 * Conditions are organized into tiers (essential, quality, advanced) and
 * filtered by study type.
 */

import type { SegmentConditionOperator } from '@veritio/study-types'

/**
 * Study type identifier
 */
export type StudyType =
  | 'card_sort'
  | 'tree_test'
  | 'survey'
  | 'prototype_test'
  | 'first_click'
  | 'first_impression'

/**
 * Condition tier classification for grouping in dropdown
 */
export type ConditionTier = 'essential' | 'quality' | 'advanced'

/**
 * Value type determines which operators are available
 * and how the UI renders the value input
 */
export type ConditionValueType =
  | 'status' // Predefined status options (completed, abandoned, in_progress)
  | 'text' // Free text input
  | 'number' // Numeric input with optional range
  | 'percentage' // 0-100 with % suffix
  | 'select' // Dropdown from dynamic options
  | 'question' // Question selector + value
  | 'url_tag' // Tag key + value selector
  | 'response_tag' // Response tag selector (for filtering by assigned tags)

/**
 * Operator definition with label and metadata
 */
export interface OperatorDefinition {
  value: SegmentConditionOperator
  label: string
  /** Some operators need additional value inputs (e.g., 'between' needs min/max) */
  requiresSecondValue?: boolean
}

/**
 * Definition of a single condition type
 */
export interface ConditionDefinition {
  /** Unique type identifier matching SegmentConditionType */
  type: string
  /** Display label in the condition type dropdown */
  label: string
  /** Brief description shown as tooltip/helper text */
  description?: string
  /** Which tier this condition belongs to */
  tier: ConditionTier
  /** How values are entered/rendered */
  valueType: ConditionValueType
  /** Which study types support this condition ('all' or specific types) */
  studyTypes: StudyType[] | 'all'
  /** For numeric types: unit label (e.g., "seconds", "%") */
  unit?: string
  /** For numeric types: reasonable default range */
  defaultRange?: { min: number; max: number }
}

/**
 * Tier metadata for UI rendering
 */
export interface TierMetadata {
  id: ConditionTier
  label: string
  description: string
}

/**
 * Design option for First Impression design_assignment condition
 */
export interface DesignOption {
  id: string
  name: string
  position?: number
}

/**
 * Task option for task-based conditions (Tree Test, First Click, Prototype Test)
 */
export interface TaskOption {
  id: string
  name: string
  position?: number
}

/**
 * Response tag option for response_tag condition
 */
export interface ResponseTagOption {
  id: string
  name: string
  color: string
}
