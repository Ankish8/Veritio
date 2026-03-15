
import type {
  SurveyRule,
  SurveyVariable,
  RuleCondition,
  RuleConditions,
  ConditionGroup,
  RuleOperator,
  RuleEvaluationContext,
  RuleEvaluationResult,
  RulesEvaluationSummary,
  RuleAction,
  RuleTriggerType,
  VariableFormula,
  ScoreFormula,
  ClassificationFormula,
  CounterFormula,
  EndSurveyAction,
} from '../supabase/survey-rules-types';
import type {
  FlowSection,
  ResponseValue,
  SingleChoiceResponseValue,
  MultiChoiceResponseValue,
  ScaleResponseValue,
} from '../supabase/study-flow-types';

function calculateScore(
  formula: ScoreFormula,
  responses: Map<string, ResponseValue>
): number {
  const values: number[] = [];

  for (const component of formula.questions) {
    const response = responses.get(component.questionId);
    let value = formula.defaultValue ?? 0;

    if (response !== undefined) {
      // Check for custom value mapping first
      if (component.valueMapping && component.valueMapping.length > 0) {
        const mapping = findValueMapping(response, component.valueMapping);
        if (mapping !== null) {
          value = mapping;
        }
      } else {
        // Use raw numeric value
        value = extractNumericValue(response);
      }
    }

    // Apply weight
    values.push(value * component.weight);
  }

  // Aggregate
  if (values.length === 0) return formula.defaultValue ?? 0;

  switch (formula.aggregation) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'average':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return values.reduce((a, b) => a + b, 0);
  }
}
function findValueMapping(
  response: ResponseValue,
  mappings: ScoreFormula['questions'][0]['valueMapping']
): number | null {
  if (!mappings) return null;

  if (typeof response === 'object' && 'optionId' in response) {
    const match = mappings.find((m) => m.optionId === response.optionId);
    return match?.mappedValue ?? null;
  }

  if (typeof response === 'object' && 'value' in response) {
    const match = mappings.find((m) => m.scaleValue === response.value);
    return match?.mappedValue ?? null;
  }

  if (typeof response === 'string') {
    const match = mappings.find((m) => m.textValue === response);
    return match?.mappedValue ?? null;
  }

  return null;
}
function extractNumericValue(response: ResponseValue): number {
  if (typeof response === 'number') return response;

  if (typeof response === 'object' && 'value' in response) {
    return (response as ScaleResponseValue).value;
  }

  // For choice questions, could use index as value (not recommended)
  return 0;
}

function calculateClassification(
  formula: ClassificationFormula,
  variables: Map<string, number | string>
): string {
  const sourceValue = variables.get(formula.sourceVariable);

  if (typeof sourceValue !== 'number') {
    return formula.defaultLabel;
  }

  for (const range of formula.ranges) {
    if (sourceValue >= range.min && sourceValue <= range.max) {
      return range.label;
    }
  }

  return formula.defaultLabel;
}

function calculateCounter(
  formula: CounterFormula,
  responses: Map<string, ResponseValue>
): number {
  const response = responses.get(formula.questionId);
  if (response === undefined) return 0;

  if (typeof response === 'object' && 'optionIds' in response) {
    // Multi-choice: count how many of the specified values are selected
    return formula.countValues.filter((v) =>
      (response as MultiChoiceResponseValue).optionIds.includes(v)
    ).length;
  }

  if (typeof response === 'object' && 'optionId' in response) {
    // Single-choice: 1 if matches, 0 otherwise
    return formula.countValues.includes((response as SingleChoiceResponseValue).optionId)
      ? 1
      : 0;
  }

  return 0;
}

export function calculateVariable(
  formula: VariableFormula,
  responses: Map<string, ResponseValue>,
  variables: Map<string, number | string>
): number | string {
  switch (formula.type) {
    case 'score':
      return calculateScore(formula, responses);
    case 'classification':
      return calculateClassification(formula, variables);
    case 'counter':
      return calculateCounter(formula, responses);
    default:
      return 0;
  }
}

export function calculateAllVariables(
  variableDefinitions: SurveyVariable[],
  responses: Map<string, ResponseValue>
): Map<string, number | string> {
  const result = new Map<string, number | string>();

  // Sort by dependency: scores first, then classifications (which depend on scores)
  const sorted = [...variableDefinitions].sort((a, b) => {
    if (a.variable_type === 'classification' && b.variable_type !== 'classification') {
      return 1;
    }
    if (a.variable_type !== 'classification' && b.variable_type === 'classification') {
      return -1;
    }
    return 0;
  });

  for (const variable of sorted) {
    const value = calculateVariable(variable.config, responses, result);
    result.set(variable.name, value);
  }

  return result;
}

function getSourceValue(
  source: RuleCondition['source'],
  context: RuleEvaluationContext
): ResponseValue | number | string | boolean | undefined {
  switch (source.type) {
    case 'question':
      return context.responses.get(source.questionId);

    case 'variable':
      return context.variables.get(source.variableName);

    case 'section_complete':
      return context.completedSections.has(source.section);

    case 'response_count':
      if (source.section) {
        // Count responses in specific section (would need question->section mapping)
        return context.responses.size; // Simplified for now
      }
      return context.responses.size;

    default:
      return undefined;
  }
}
export function evaluateCondition(
  condition: RuleCondition,
  context: RuleEvaluationContext
): boolean {
  const { source, operator, values = [], valueRange } = condition;
  const sourceValue = getSourceValue(source, context);

  // Handle existence checks
  if (operator === 'is_answered') {
    return sourceValue !== undefined;
  }
  if (operator === 'is_not_answered') {
    return sourceValue === undefined;
  }

  // No value - other operators require a value
  if (sourceValue === undefined) {
    return false;
  }

  // Handle section_complete source (boolean)
  if (typeof sourceValue === 'boolean') {
    const expected = values[0] === 'true' || String(values[0]) === 'true';
    return operator === 'equals' ? sourceValue === expected : sourceValue !== expected;
  }

  // Handle different value types
  if (typeof sourceValue === 'string') {
    return evaluateStringCondition(operator, sourceValue, values as string[]);
  }

  if (typeof sourceValue === 'number') {
    return evaluateNumericCondition(operator, sourceValue, values, valueRange);
  }

  if (Array.isArray(sourceValue)) {
    return evaluateArrayCondition(operator, sourceValue, values as string[]);
  }

  if (typeof sourceValue === 'object') {
    return evaluateObjectCondition(operator, sourceValue as ResponseValue, values, valueRange);
  }

  return false;
}

function evaluateStringCondition(
  operator: RuleOperator,
  value: string,
  comparisonValues: string[]
): boolean {
  const normalized = value.toLowerCase().trim();
  const normalizedComparisons = comparisonValues.map((v) => String(v).toLowerCase().trim());

  switch (operator) {
    case 'equals':
      return normalizedComparisons.includes(normalized);
    case 'not_equals':
      return !normalizedComparisons.includes(normalized);
    case 'contains':
      return normalizedComparisons.some((v) => normalized.includes(v));
    case 'not_contains':
      return !normalizedComparisons.some((v) => normalized.includes(v));
    case 'in_list':
      return normalizedComparisons.includes(normalized);
    case 'not_in_list':
      return !normalizedComparisons.includes(normalized);
    default:
      return false;
  }
}

function evaluateNumericCondition(
  operator: RuleOperator,
  value: number,
  comparisonValues: (string | number)[],
  valueRange?: { min: number; max: number }
): boolean {
  const compNum = Number(comparisonValues[0]);

  switch (operator) {
    case 'equals':
    case 'variable_equals':
      return value === compNum;
    case 'not_equals':
      return value !== compNum;
    case 'greater_than':
    case 'variable_greater':
      return value > compNum;
    case 'less_than':
    case 'variable_less':
      return value < compNum;
    case 'greater_than_or_equals':
      return value >= compNum;
    case 'less_than_or_equals':
      return value <= compNum;
    case 'between':
      if (valueRange) {
        return value >= valueRange.min && value <= valueRange.max;
      }
      return false;
    case 'in_list':
      return comparisonValues.map(Number).includes(value);
    case 'not_in_list':
      return !comparisonValues.map(Number).includes(value);
    default:
      return false;
  }
}

function evaluateArrayCondition(
  operator: RuleOperator,
  values: string[],
  comparisonValues: string[]
): boolean {
  switch (operator) {
    case 'contains':
      return comparisonValues.some((v) => values.includes(v));
    case 'not_contains':
      return !comparisonValues.some((v) => values.includes(v));
    case 'equals':
      return (
        values.length === comparisonValues.length &&
        comparisonValues.every((v) => values.includes(v))
      );
    case 'not_equals':
      return !(
        values.length === comparisonValues.length &&
        comparisonValues.every((v) => values.includes(v))
      );
    default:
      return false;
  }
}

function evaluateObjectCondition(
  operator: RuleOperator,
  response: ResponseValue,
  comparisonValues: (string | number)[],
  valueRange?: { min: number; max: number }
): boolean {
  // Single choice (radio/dropdown)
  if (typeof response === 'object' && 'optionId' in response) {
    const selectedId = (response as SingleChoiceResponseValue).optionId;
    switch (operator) {
      case 'equals':
      case 'in_list':
        return comparisonValues.includes(selectedId);
      case 'not_equals':
      case 'not_in_list':
        return !comparisonValues.includes(selectedId);
      default:
        return false;
    }
  }

  // Multi choice (checkbox)
  if (typeof response === 'object' && 'optionIds' in response) {
    const selectedIds = (response as MultiChoiceResponseValue).optionIds;
    switch (operator) {
      case 'contains':
        return comparisonValues.some((v) => selectedIds.includes(String(v)));
      case 'not_contains':
        return !comparisonValues.some((v) => selectedIds.includes(String(v)));
      case 'equals':
        return (
          selectedIds.length === comparisonValues.length &&
          comparisonValues.every((v) => selectedIds.includes(String(v)))
        );
      case 'not_equals':
        return !(
          selectedIds.length === comparisonValues.length &&
          comparisonValues.every((v) => selectedIds.includes(String(v)))
        );
      default:
        return false;
    }
  }

  // Slider (raw number)
  if (typeof response === 'number') {
    return evaluateNumericCondition(operator, response, comparisonValues, valueRange);
  }

  // Scale (likert/nps)
  if (typeof response === 'object' && 'value' in response) {
    const scaleValue = (response as ScaleResponseValue).value;
    return evaluateNumericCondition(operator, scaleValue, comparisonValues, valueRange);
  }

  // Matrix - treat as answered for now
  return true;
}
export function evaluateConditionGroup(
  group: ConditionGroup,
  context: RuleEvaluationContext
): boolean {
  if (group.conditions.length === 0) return true;

  const results = group.conditions.map((condition) =>
    evaluateCondition(condition, context)
  );

  return group.matchAll
    ? results.every((r) => r) // AND
    : results.some((r) => r); // OR
}
export function evaluateConditions(
  conditions: RuleConditions,
  context: RuleEvaluationContext
): boolean {
  // No groups = conditions always met
  if (conditions.groups.length === 0) return true;

  // Any group matching = conditions met (OR between groups)
  return conditions.groups.some((group) =>
    evaluateConditionGroup(group, context)
  );
}

export function shouldRuleFire(
  rule: SurveyRule,
  triggerType: RuleTriggerType,
  triggerContext: { questionId?: string; section?: FlowSection }
): boolean {
  if (!rule.is_enabled) return false;

  switch (rule.trigger_type) {
    case 'on_answer':
      // Fires on any answer
      return triggerType === 'on_answer';

    case 'on_question':
      // Fires only when specific question is answered
      if (triggerType !== 'on_answer') return false;
      const config = rule.trigger_config as { questionId: string };
      return config.questionId === triggerContext.questionId;

    case 'on_section_complete':
      // Fires when specific section is completed
      if (triggerType !== 'on_section_complete') return false;
      const sectionConfig = rule.trigger_config as { section: FlowSection };
      return sectionConfig.section === triggerContext.section;

    default:
      return false;
  }
}

function buildAction(rule: SurveyRule): RuleAction {
  return {
    type: rule.action_type,
    config: rule.action_config,
  } as RuleAction;
}
export function evaluateRule(
  rule: SurveyRule,
  context: RuleEvaluationContext
): RuleEvaluationResult {
  const conditionsMet = evaluateConditions(rule.conditions, context);

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    conditionsMet,
    action: conditionsMet ? buildAction(rule) : undefined,
  };
}

export function filterRulesByTrigger(
  rules: SurveyRule[],
  triggerType: RuleTriggerType,
  triggerContext: { questionId?: string; section?: FlowSection }
): SurveyRule[] {
  return rules.filter((rule) =>
    shouldRuleFire(rule, triggerType, triggerContext)
  );
}
export function evaluateAllRules(
  rules: SurveyRule[],
  variables: SurveyVariable[],
  context: RuleEvaluationContext,
  triggerType: RuleTriggerType = 'on_answer',
  triggerContext: { questionId?: string; section?: FlowSection } = {}
): RulesEvaluationSummary {
  const summary: RulesEvaluationSummary = {
    sectionsToShow: new Set(),
    sectionsToHide: new Set(),
    customSectionsToShow: new Set(),
    customSectionsToHide: new Set(),
    variables: new Map(context.variables),
    executedRules: [],
  };

  // Calculate variables first
  const calculatedVars = calculateAllVariables(variables, context.responses);
  for (const [name, value] of calculatedVars) {
    summary.variables.set(name, value);
  }

  // Create updated context with calculated variables
  const evalContext: RuleEvaluationContext = {
    ...context,
    variables: summary.variables,
  };

  // Filter and sort rules by position
  const applicableRules = filterRulesByTrigger(rules, triggerType, triggerContext).sort(
    (a, b) => a.position - b.position
  );

  // Evaluate each rule
  for (const rule of applicableRules) {
    const result = evaluateRule(rule, evalContext);
    summary.executedRules.push(result);

    if (!result.conditionsMet || !result.action) continue;

    // Process action
    switch (result.action.type) {
      case 'skip_to_question':
        // First skip wins
        if (!summary.skipToQuestion) {
          summary.skipToQuestion = {
            questionId: result.action.config.questionId,
            section: result.action.config.section || context.currentSection,
          };
        }
        break;

      case 'skip_to_section':
        // First skip wins
        if (!summary.skipToSection) {
          summary.skipToSection = result.action.config.section;
        }
        break;

      case 'end_survey':
        // First end wins
        if (!summary.endSurvey) {
          summary.endSurvey = result.action.config as EndSurveyAction['config'];
        }
        break;

      case 'show_section':
        summary.sectionsToShow.add(result.action.config.section);
        break;

      case 'hide_section':
        summary.sectionsToHide.add(result.action.config.section);
        break;

      case 'skip_to_custom_section':
        // First skip wins
        if (!summary.skipToCustomSection) {
          summary.skipToCustomSection = { sectionId: result.action.config.sectionId };
        }
        break;

      case 'show_custom_section':
        summary.customSectionsToShow.add(result.action.config.sectionId);
        break;

      case 'hide_custom_section':
        summary.customSectionsToHide.add(result.action.config.sectionId);
        break;

      case 'set_variable':
        // Calculate and store variable
        const formula = result.action.config.formula;
        const value = calculateVariable(formula, context.responses, summary.variables);
        summary.variables.set(result.action.config.variableName, value);
        break;
    }
  }

  return summary;
}

export function createEmptyContext(
  currentSection: FlowSection = 'survey'
): RuleEvaluationContext {
  return {
    responses: new Map(),
    variables: new Map(),
    completedSections: new Set(),
    completedCustomSections: new Set(),
    currentSection,
    currentQuestionId: null,
    currentCustomSectionId: null,
    lastAnsweredQuestionId: null,
  };
}

export function createContextFromState(
  responses: Map<string, { value: ResponseValue }>,
  currentSection: FlowSection,
  currentQuestionId: string | null,
  lastAnsweredQuestionId: string | null,
  completedSections: FlowSection[]
): RuleEvaluationContext {
  // Convert responses to just values
  const responseValues = new Map<string, ResponseValue>();
  for (const [id, data] of responses) {
    responseValues.set(id, data.value);
  }

  return {
    responses: responseValues,
    variables: new Map(),
    completedSections: new Set(completedSections),
    completedCustomSections: new Set(),
    currentSection,
    currentQuestionId,
    currentCustomSectionId: null,
    lastAnsweredQuestionId,
  };
}

export function describeRule(rule: SurveyRule): string {
  const conditionCount = rule.conditions.groups.reduce(
    (sum, g) => sum + g.conditions.length,
    0
  );

  const actionDescMap: Record<string, string> = {
    skip_to_question: 'Skip to question',
    skip_to_section: 'Skip to section',
    skip_to_custom_section: 'Skip to custom section',
    end_survey: 'End survey',
    show_section: 'Show section',
    show_custom_section: 'Show custom section',
    hide_custom_section: 'Hide custom section',
    hide_section: 'Hide section',
    set_variable: 'Set variable',
  };
  const actionDesc = actionDescMap[rule.action_type] || rule.action_type;

  return `If ${conditionCount} condition(s) met → ${actionDesc}`;
}
