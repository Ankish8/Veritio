// DUPLICATION NOTE: This file is nearly identical to
// apps/veritio/src/lib/study-flow/rule-validation.ts (which has more comments).
// Consider consolidating into a shared package when resolving pre-existing type errors.

/**
 * Rule Validation Module
 *
 * Validates survey rules for logical correctness, detects conflicts,
 * and checks for issues like circular skips, invalid references, etc.
 */

import type {
  SurveyRule,
  SurveyVariable,
  RuleValidationIssue,
  RuleValidationIssueType,
  RulesValidationResult,
  RuleConditions,
  ConditionSource,
} from '../supabase/survey-rules-types';
import type { StudyFlowQuestion, FlowSection } from '../supabase/study-flow-types';
// Types

interface ValidationContext {
  rules: SurveyRule[];
  variables: SurveyVariable[];
  questions: StudyFlowQuestion[];
  questionIds: Set<string>;
  variableNames: Set<string>;
  questionOrder: Map<string, number>; // questionId -> order index
}
// Main Validation Function
export function validateRules(
  rules: SurveyRule[],
  variables: SurveyVariable[],
  questions: StudyFlowQuestion[]
): RulesValidationResult {
  const context: ValidationContext = {
    rules,
    variables,
    questions,
    questionIds: new Set(questions.map((q) => q.id)),
    variableNames: new Set(variables.map((v) => v.name)),
    questionOrder: new Map(questions.map((q, i) => [q.id, i])),
  };

  const issues: RuleValidationIssue[] = [];

  // Run all validators
  issues.push(...checkInvalidQuestionReferences(context));
  issues.push(...checkInvalidVariableReferences(context));
  issues.push(...checkEmptyConditions(context));
  issues.push(...checkShowHideConflicts(context));
  issues.push(...checkCircularSkips(context));
  issues.push(...checkBackwardSkips(context));
  issues.push(...checkUnreachableRules(context));
  issues.push(...checkVariableCircularDependencies(context));

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return {
    isValid: errorCount === 0,
    errorCount,
    warningCount,
    issues,
  };
}
export function validateSingleRule(
  rule: SurveyRule,
  allRules: SurveyRule[],
  variables: SurveyVariable[],
  questions: StudyFlowQuestion[]
): RuleValidationIssue[] {
  const context: ValidationContext = {
    rules: allRules,
    variables,
    questions,
    questionIds: new Set(questions.map((q) => q.id)),
    variableNames: new Set(variables.map((v) => v.name)),
    questionOrder: new Map(questions.map((q, i) => [q.id, i])),
  };

  const issues: RuleValidationIssue[] = [];

  // Check this specific rule
  issues.push(...checkRuleQuestionReferences(rule, context));
  issues.push(...checkRuleVariableReferences(rule, context));

  if (rule.conditions.groups.length === 0) {
    issues.push(createIssue(
      'empty_conditions',
      'warning',
      `Rule "${rule.name}" has no conditions and will always run`,
      rule.id,
      rule.name,
      'Add conditions to control when this rule fires'
    ));
  }

  return issues;
}
// Individual Validators
function checkInvalidQuestionReferences(ctx: ValidationContext): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];

  for (const rule of ctx.rules) {
    issues.push(...checkRuleQuestionReferences(rule, ctx));
  }

  return issues;
}

function checkRuleQuestionReferences(
  rule: SurveyRule,
  ctx: ValidationContext
): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];

  // Check condition sources
  for (const group of rule.conditions.groups) {
    for (const condition of group.conditions) {
      if (condition.source.type === 'question') {
        if (!ctx.questionIds.has(condition.source.questionId)) {
          issues.push(createIssue(
            'invalid_question_ref',
            'error',
            `Rule "${rule.name}" references a question that doesn't exist`,
            rule.id,
            rule.name,
            'Select a valid question or remove this condition'
          ));
        }
      }
    }
  }

  // Check trigger
  if (rule.trigger_type === 'on_question') {
    const config = rule.trigger_config as { questionId?: string };
    if (config.questionId && !ctx.questionIds.has(config.questionId)) {
      issues.push(createIssue(
        'invalid_question_ref',
        'error',
        `Rule "${rule.name}" triggers on a question that doesn't exist`,
        rule.id,
        rule.name,
        'Select a valid question for the trigger'
      ));
    }
  }

  // Check action
  if (rule.action_type === 'skip_to_question') {
    const config = rule.action_config as { questionId?: string };
    if (config.questionId && !ctx.questionIds.has(config.questionId)) {
      issues.push(createIssue(
        'invalid_question_ref',
        'error',
        `Rule "${rule.name}" skips to a question that doesn't exist`,
        rule.id,
        rule.name,
        'Select a valid target question'
      ));
    }
  }

  return issues;
}
function checkInvalidVariableReferences(ctx: ValidationContext): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];

  for (const rule of ctx.rules) {
    issues.push(...checkRuleVariableReferences(rule, ctx));
  }

  return issues;
}

function checkRuleVariableReferences(
  rule: SurveyRule,
  ctx: ValidationContext
): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];

  // Check condition sources
  for (const group of rule.conditions.groups) {
    for (const condition of group.conditions) {
      if (condition.source.type === 'variable') {
        if (!ctx.variableNames.has(condition.source.variableName)) {
          issues.push(createIssue(
            'invalid_variable_ref',
            'error',
            `Rule "${rule.name}" references variable "${condition.source.variableName}" which doesn't exist`,
            rule.id,
            rule.name,
            'Create the variable first or select a different one'
          ));
        }
      }
    }
  }

  // Check set_variable action
  if (rule.action_type === 'set_variable') {
    const config = rule.action_config as { variableName?: string };
    if (config.variableName && !ctx.variableNames.has(config.variableName)) {
      issues.push(createIssue(
        'invalid_variable_ref',
        'error',
        `Rule "${rule.name}" sets variable "${config.variableName}" which doesn't exist`,
        rule.id,
        rule.name,
        'Create the variable first'
      ));
    }
  }

  return issues;
}
function checkEmptyConditions(ctx: ValidationContext): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];

  for (const rule of ctx.rules) {
    if (rule.is_enabled && rule.conditions.groups.length === 0) {
      // Not an error for end_survey actions (common pattern)
      if (rule.action_type === 'end_survey') {
        continue;
      }

      issues.push(createIssue(
        'empty_conditions',
        'warning',
        `Rule "${rule.name}" has no conditions and will always run when triggered`,
        rule.id,
        rule.name,
        'Add conditions to control when this rule fires, or disable it if intentional'
      ));
    }
  }

  return issues;
}
function checkShowHideConflicts(ctx: ValidationContext): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];

  const showSections = new Map<FlowSection, SurveyRule[]>();
  const hideSections = new Map<FlowSection, SurveyRule[]>();

  for (const rule of ctx.rules) {
    if (!rule.is_enabled) continue;

    if (rule.action_type === 'show_section') {
      const config = rule.action_config as { section?: FlowSection };
      if (config.section) {
        const existing = showSections.get(config.section) || [];
        showSections.set(config.section, [...existing, rule]);
      }
    }

    if (rule.action_type === 'hide_section') {
      const config = rule.action_config as { section?: FlowSection };
      if (config.section) {
        const existing = hideSections.get(config.section) || [];
        hideSections.set(config.section, [...existing, rule]);
      }
    }
  }

  // Check for conflicts
  for (const [section, showRules] of showSections) {
    const hideRules = hideSections.get(section);
    if (hideRules && hideRules.length > 0) {
      const allRules = [...showRules, ...hideRules];
      issues.push({
        id: crypto.randomUUID(),
        type: 'show_hide_conflict',
        severity: 'warning',
        message: `Section "${section}" has conflicting show/hide rules`,
        ruleId: showRules[0].id,
        ruleName: showRules[0].name,
        relatedRuleIds: allRules.map((r) => r.id),
        suggestedFix: 'Review conditions to ensure only one action applies at a time',
      });
    }
  }

  return issues;
}
function checkCircularSkips(ctx: ValidationContext): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];

  // Build a skip graph: question/section -> [target questions/sections]
  const skipGraph = new Map<string, Set<string>>();

  for (const rule of ctx.rules) {
    if (!rule.is_enabled) continue;

    // Get source (what triggers the skip)
    const sources: string[] = [];
    for (const group of rule.conditions.groups) {
      for (const condition of group.conditions) {
        if (condition.source.type === 'question') {
          sources.push(`q:${condition.source.questionId}`);
        }
      }
    }

    if (rule.trigger_type === 'on_question') {
      const config = rule.trigger_config as { questionId?: string };
      if (config.questionId) {
        sources.push(`q:${config.questionId}`);
      }
    }

    // Get target
    let target: string | null = null;
    if (rule.action_type === 'skip_to_question') {
      const config = rule.action_config as { questionId?: string };
      if (config.questionId) {
        target = `q:${config.questionId}`;
      }
    } else if (rule.action_type === 'skip_to_section') {
      const config = rule.action_config as { section?: string };
      if (config.section) {
        target = `s:${config.section}`;
      }
    }

    // Add edges
    if (target) {
      for (const source of sources) {
        const existing = skipGraph.get(source) || new Set();
        existing.add(target);
        skipGraph.set(source, existing);
      }
    }
  }

  // Detect cycles using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(node: string, path: string[]): string[] | null {
    if (recursionStack.has(node)) {
      return path;
    }
    if (visited.has(node)) {
      return null;
    }

    visited.add(node);
    recursionStack.add(node);

    const neighbors = skipGraph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        const cycle = hasCycle(neighbor, [...path, neighbor]);
        if (cycle) {
          return cycle;
        }
      }
    }

    recursionStack.delete(node);
    return null;
  }

  for (const node of skipGraph.keys()) {
    if (!visited.has(node)) {
      const cycle = hasCycle(node, [node]);
      if (cycle) {
        issues.push({
          id: crypto.randomUUID(),
          type: 'circular_skip',
          severity: 'error',
          message: `Circular skip detected: ${cycle.join(' → ')}`,
          ruleId: ctx.rules[0]?.id || '',
          ruleName: 'Multiple rules',
          suggestedFix: 'Break the cycle by removing or modifying one of the skip rules',
        });
        break; // Only report one cycle
      }
    }
  }

  return issues;
}
function checkBackwardSkips(ctx: ValidationContext): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];

  for (const rule of ctx.rules) {
    if (!rule.is_enabled) continue;
    if (rule.action_type !== 'skip_to_question') continue;

    const config = rule.action_config as { questionId?: string };
    if (!config.questionId) continue;

    const targetOrder = ctx.questionOrder.get(config.questionId);
    if (targetOrder === undefined) continue;

    // Check if any source question comes after the target
    for (const group of rule.conditions.groups) {
      for (const condition of group.conditions) {
        if (condition.source.type === 'question') {
          const sourceOrder = ctx.questionOrder.get(condition.source.questionId);
          if (sourceOrder !== undefined && sourceOrder > targetOrder) {
            issues.push(createIssue(
              'backward_skip',
              'warning',
              `Rule "${rule.name}" skips backward to an earlier question`,
              rule.id,
              rule.name,
              'This may cause participants to see questions multiple times'
            ));
            break;
          }
        }
      }
    }
  }

  return issues;
}
function checkUnreachableRules(ctx: ValidationContext): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];

  let foundUnconditionalEnd = false;
  let endRuleName = '';

  // Rules are processed in order
  const sortedRules = [...ctx.rules].sort((a, b) => a.position - b.position);

  for (const rule of sortedRules) {
    if (!rule.is_enabled) continue;

    if (foundUnconditionalEnd) {
      issues.push(createIssue(
        'unreachable_rule',
        'warning',
        `Rule "${rule.name}" may never run because "${endRuleName}" ends the survey unconditionally`,
        rule.id,
        rule.name,
        'Reorder rules or add conditions to the end_survey rule'
      ));
    }

    // Check if this is an unconditional end_survey
    if (
      rule.action_type === 'end_survey' &&
      rule.conditions.groups.length === 0 &&
      rule.trigger_type === 'on_answer'
    ) {
      foundUnconditionalEnd = true;
      endRuleName = rule.name;
    }
  }

  return issues;
}
function checkVariableCircularDependencies(ctx: ValidationContext): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];

  // Build dependency graph for classification variables
  const depGraph = new Map<string, string[]>();

  for (const variable of ctx.variables) {
    if (variable.config.type === 'classification') {
      const sourceVar = variable.config.sourceVariable;
      if (sourceVar) {
        depGraph.set(variable.name, [sourceVar]);
      }
    }
  }

  // Check for self-reference
  for (const variable of ctx.variables) {
    if (variable.config.type === 'classification') {
      if (variable.config.sourceVariable === variable.name) {
        issues.push({
          id: crypto.randomUUID(),
          type: 'variable_circular_dep',
          severity: 'error',
          message: `Variable "${variable.name}" references itself`,
          ruleId: '', // Variables aren't rules
          ruleName: `Variable: ${variable.name}`,
          suggestedFix: 'Select a different source variable',
        });
      }
    }
  }

  // Check for longer cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(varName: string): boolean {
    if (recursionStack.has(varName)) return true;
    if (visited.has(varName)) return false;

    visited.add(varName);
    recursionStack.add(varName);

    const deps = depGraph.get(varName) || [];
    for (const dep of deps) {
      if (hasCycle(dep)) return true;
    }

    recursionStack.delete(varName);
    return false;
  }

  for (const varName of depGraph.keys()) {
    if (!visited.has(varName) && hasCycle(varName)) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'variable_circular_dep',
        severity: 'error',
        message: `Circular dependency detected in variable definitions`,
        ruleId: '',
        ruleName: `Variable: ${varName}`,
        suggestedFix: 'Break the circular reference between classification variables',
      });
      break;
    }
  }

  return issues;
}
// Helpers

function createIssue(
  type: RuleValidationIssueType,
  severity: 'error' | 'warning',
  message: string,
  ruleId: string,
  ruleName: string,
  suggestedFix?: string
): RuleValidationIssue {
  return {
    id: crypto.randomUUID(),
    type,
    severity,
    message,
    ruleId,
    ruleName,
    suggestedFix,
  };
}
export function getIssueTypeLabel(type: RuleValidationIssueType): string {
  const labels: Record<RuleValidationIssueType, string> = {
    circular_skip: 'Circular Skip',
    show_hide_conflict: 'Show/Hide Conflict',
    invalid_question_ref: 'Invalid Question',
    invalid_variable_ref: 'Invalid Variable',
    unreachable_rule: 'Unreachable Rule',
    backward_skip: 'Backward Skip',
    variable_circular_dep: 'Circular Dependency',
    empty_conditions: 'No Conditions',
  };
  return labels[type];
}
