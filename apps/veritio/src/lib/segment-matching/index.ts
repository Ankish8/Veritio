/**
 * Segment Matching Library
 *
 * Pure functions for filtering participants based on segment conditions.
 * Supports both V1 (flat array) and V2 (grouped with OR logic) condition formats.
 *
 * Usage:
 * - matchesCondition: Check single condition against participant
 * - matchesConditionGroup: Check group of conditions (AND logic)
 * - matchesConditionsV2: Check V2 conditions (OR between groups, AND within groups)
 * - calculateMatchingParticipants: Batch process participants
 */

export {
  matchesCondition,
  matchesConditionGroup,
  matchesConditionsV2,
  calculateMatchingParticipants,
  type ResponseData,
} from './matchers'
