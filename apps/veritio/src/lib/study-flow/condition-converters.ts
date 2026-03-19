/**
 * Condition Converters
 *
 * Converts between ScreeningCondition and AdvancedCondition formats.
 * These allow the unified CompoundConditionBuilder to work with both types.
 */

import type {
  ScreeningCondition,
  ScreeningConditionOperator,
  AdvancedCondition,
  AdvancedConditionOperator,
} from '../supabase/study-flow-types';

const operatorToAdvanced: Record<ScreeningConditionOperator, AdvancedConditionOperator> = {
  is: 'equals',
  is_not: 'not_equals',
  contains: 'contains',
  greater_than: 'greater_than',
  less_than: 'less_than',
};

const operatorToScreening: Partial<Record<AdvancedConditionOperator, ScreeningConditionOperator>> = {
  equals: 'is',
  not_equals: 'is_not',
  contains: 'contains',
  greater_than: 'greater_than',
  less_than: 'less_than',
};

export function screeningToAdvanced(condition: ScreeningCondition): AdvancedCondition {
  const advancedOperator = operatorToAdvanced[condition.operator];

  return {
    id: condition.id,
    source: 'question',
    questionId: condition.questionId,
    operator: advancedOperator,
    ...(Array.isArray(condition.value)
      ? { values: condition.value.map(String) }
      : { value: condition.value }),
  };
}

export function advancedToScreening(condition: AdvancedCondition): ScreeningCondition | null {
  if (condition.source !== 'question' || !condition.questionId) {
    return null;
  }

  const screeningOperator = operatorToScreening[condition.operator];
  if (!screeningOperator) {
    return null;
  }

  let value: string | number | string[];
  if (condition.values && condition.values.length > 0) {
    value = condition.values;
  } else if (condition.value !== undefined) {
    value = condition.value;
  } else {
    value = '';
  }

  return {
    id: condition.id,
    questionId: condition.questionId,
    operator: screeningOperator,
    value,
  };
}

export function screeningConditionsToAdvanced(
  conditions: ScreeningCondition[]
): AdvancedCondition[] {
  return conditions.map(screeningToAdvanced);
}

export function advancedConditionsToScreening(
  conditions: AdvancedCondition[]
): ScreeningCondition[] {
  return conditions
    .map(advancedToScreening)
    .filter((c): c is ScreeningCondition => c !== null);
}
