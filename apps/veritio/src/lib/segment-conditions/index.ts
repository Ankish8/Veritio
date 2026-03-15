/**
 * Segment Conditions Module
 *
 * Provides study-type-specific condition configurations for the segment builder.
 * Conditions are organized into tiers and filtered by study type.
 */

export * from './types'
export {
  TIER_METADATA,
  TIER_LABELS,
  OPERATORS_BY_VALUE_TYPE,
  CONDITION_DEFINITIONS,
  getOperatorsForValueType,
} from './condition-configs'

import type { ConditionDefinition, ConditionTier, StudyType } from './types'
import { CONDITION_DEFINITIONS } from './condition-configs'

/**
 * Get all condition definitions for a specific study type.
 * Returns conditions where studyTypes is 'all' or includes the given study type.
 */
export function getConditionsForStudyType(studyType: StudyType): ConditionDefinition[] {
  return CONDITION_DEFINITIONS.filter(
    (c) => c.studyTypes === 'all' || c.studyTypes.includes(studyType)
  )
}

/**
 * Get conditions grouped by tier for a specific study type.
 * Returns an object with essential, quality, and advanced arrays.
 */
export function getConditionsByTier(
  studyType: StudyType
): Record<ConditionTier, ConditionDefinition[]> {
  const conditions = getConditionsForStudyType(studyType)
  return {
    essential: conditions.filter((c) => c.tier === 'essential'),
    quality: conditions.filter((c) => c.tier === 'quality'),
    advanced: conditions.filter((c) => c.tier === 'advanced'),
  }
}

/**
 * Get a single condition definition by type.
 * Returns undefined if the condition doesn't exist or isn't available for the study type.
 */
export function getConditionDefinition(
  studyType: StudyType,
  conditionType: string
): ConditionDefinition | undefined {
  return getConditionsForStudyType(studyType).find((c) => c.type === conditionType)
}

/**
 * Check if a condition type is valid for a specific study type.
 */
export function isConditionValidForStudyType(studyType: StudyType, conditionType: string): boolean {
  return getConditionsForStudyType(studyType).some((c) => c.type === conditionType)
}

/**
 * Get all available condition types as a flat array of type strings.
 * Useful for type validation.
 */
export function getAllConditionTypes(): string[] {
  return CONDITION_DEFINITIONS.map((c) => c.type)
}
