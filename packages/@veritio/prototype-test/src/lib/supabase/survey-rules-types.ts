// =============================================================================
// SURVEY RULES TYPE DEFINITIONS
// Types for the Logic Pipeline / Rules Engine
// =============================================================================

import type { FlowSection, ResponseValue, SurveyCustomSection } from './study-flow-types';


export type RuleOperator =
  // Basic comparison
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  // Existence checks
  | 'is_answered'
  | 'is_not_answered'
  // Numeric comparison
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equals'
  | 'less_than_or_equals'
  | 'between'
  // Set operations
  | 'in_list'
  | 'not_in_list'
  // Variable comparison
  | 'variable_equals'
  | 'variable_greater'
  | 'variable_less';


export type ConditionSource =
  | { type: 'question'; questionId: string }
  | { type: 'variable'; variableName: string }
  | { type: 'section_complete'; section: FlowSection }
  | { type: 'custom_section_complete'; sectionId: string } // Custom section completion
  | { type: 'response_count'; section?: FlowSection };

export interface RuleCondition {
  id: string;
  source: ConditionSource;
  operator: RuleOperator;
  values?: (string | number)[]; // Comparison values (option IDs, text values, numbers)
  valueRange?: { min: number; max: number }; // For 'between' operator
}

export interface ConditionGroup {
  id: string;
  conditions: RuleCondition[];
  matchAll: boolean; // true = AND all conditions, false = OR any condition
}

export interface RuleConditions {
  groups: ConditionGroup[];
}


export type RuleActionType =
  | 'skip_to_question'
  | 'skip_to_section'
  | 'skip_to_custom_section' // Skip to a custom section within the survey
  | 'end_survey'
  | 'show_section'
  | 'hide_section'
  | 'show_custom_section' // Show a hidden custom section
  | 'hide_custom_section' // Hide a custom section
  | 'set_variable';

export interface SkipToQuestionAction {
  type: 'skip_to_question';
  config: {
    questionId: string;
    section?: FlowSection; // Inferred from question, optional
  };
}

export interface SkipToSectionAction {
  type: 'skip_to_section';
  config: {
    section: FlowSection;
  };
}

export interface EndSurveyAction {
  type: 'end_survey';
  config: {
    title: string;
    message: string;
    redirectUrl?: string;
    redirectDelay?: number; // Seconds before redirect
  };
}

export interface ShowSectionAction {
  type: 'show_section';
  config: {
    section: FlowSection;
  };
}

export interface HideSectionAction {
  type: 'hide_section';
  config: {
    section: FlowSection;
  };
}

export interface SkipToCustomSectionAction {
  type: 'skip_to_custom_section';
  config: {
    sectionId: string; // Custom section ID
    sectionName?: string; // For display purposes
  };
}

export interface ShowCustomSectionAction {
  type: 'show_custom_section';
  config: {
    sectionId: string;
    sectionName?: string;
  };
}

export interface HideCustomSectionAction {
  type: 'hide_custom_section';
  config: {
    sectionId: string;
    sectionName?: string;
  };
}

export interface SetVariableAction {
  type: 'set_variable';
  config: {
    variableName: string;
    formula: VariableFormula;
  };
}

export type RuleAction =
  | SkipToQuestionAction
  | SkipToSectionAction
  | SkipToCustomSectionAction
  | EndSurveyAction
  | ShowSectionAction
  | HideSectionAction
  | ShowCustomSectionAction
  | HideCustomSectionAction
  | SetVariableAction;


export type RuleTriggerType = 'on_answer' | 'on_section_complete' | 'on_question';

export interface OnAnswerTrigger {
  type: 'on_answer';
  config: Record<string, never>; // No config needed
}

export interface OnSectionCompleteTrigger {
  type: 'on_section_complete';
  config: {
    section: FlowSection;
  };
}

export interface OnQuestionTrigger {
  type: 'on_question';
  config: {
    questionId: string;
  };
}

export type RuleTrigger = OnAnswerTrigger | OnSectionCompleteTrigger | OnQuestionTrigger;


export interface SurveyRule {
  id: string;
  study_id: string;
  name: string;
  description?: string | null;
  position: number;
  is_enabled: boolean;
  conditions: RuleConditions;
  action_type: RuleActionType;
  action_config: RuleAction['config'];
  trigger_type: RuleTriggerType;
  trigger_config: RuleTrigger['config'];
  created_at: string;
  updated_at: string;
}

export interface SurveyRuleInsert {
  study_id: string;
  name: string;
  description?: string | null;
  position?: number;
  is_enabled?: boolean;
  conditions?: RuleConditions;
  action_type: RuleActionType;
  action_config: RuleAction['config'];
  trigger_type?: RuleTriggerType;
  trigger_config?: RuleTrigger['config'];
}

export interface SurveyRuleUpdate {
  name?: string;
  description?: string | null;
  position?: number;
  is_enabled?: boolean;
  conditions?: RuleConditions;
  action_type?: RuleActionType;
  action_config?: RuleAction['config'];
  trigger_type?: RuleTriggerType;
  trigger_config?: RuleTrigger['config'];
}


export type VariableType = 'score' | 'classification' | 'counter';

export interface ValueMapping {
  optionId?: string; // For choice questions
  scaleValue?: number; // For likert/nps
  textValue?: string; // For text matching
  mappedValue: number; // The score to assign
}

export interface ScoreComponent {
  questionId: string;
  weight: number; // Multiplier (default 1)
  valueMapping?: ValueMapping[]; // Optional custom mapping
  // If no mapping: use raw numeric value (likert/nps) or option index (choice)
}

export interface ScoreFormula {
  type: 'score';
  questions: ScoreComponent[];
  aggregation: 'sum' | 'average' | 'min' | 'max';
  defaultValue?: number; // Value when question not answered (default 0)
}

export interface ClassificationRange {
  min: number;
  max: number;
  label: string;
}

export interface ClassificationFormula {
  type: 'classification';
  sourceVariable: string; // Reference to another variable
  ranges: ClassificationRange[];
  defaultLabel: string;
}

export interface CounterFormula {
  type: 'counter';
  questionId: string;
  countValues: string[]; // Option IDs or values to count
}

export type VariableFormula = ScoreFormula | ClassificationFormula | CounterFormula;


export interface SurveyVariable {
  id: string;
  study_id: string;
  name: string;
  description?: string | null;
  variable_type: VariableType;
  config: VariableFormula; // Stored as 'config' in DB
  created_at: string;
  updated_at: string;
}

export interface SurveyVariableInsert {
  study_id: string;
  name: string;
  description?: string | null;
  variable_type: VariableType;
  config: VariableFormula;
}

export interface SurveyVariableUpdate {
  name?: string;
  description?: string | null;
  variable_type?: VariableType;
  config?: VariableFormula;
}


export interface RuleEvaluationContext {
  responses: Map<string, ResponseValue>;
  variables: Map<string, number | string>;
  completedSections: Set<FlowSection>;
  completedCustomSections: Set<string>; // Custom section IDs
  currentSection: FlowSection;
  currentCustomSectionId: string | null; // Current custom section (if any)
  currentQuestionId: string | null;
  lastAnsweredQuestionId: string | null;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  conditionsMet: boolean;
  action?: RuleAction;
  computedVariables?: Record<string, number | string>;
}

export interface RulesEvaluationSummary {
  // Navigation actions (first match wins)
  skipToQuestion?: { questionId: string; section: FlowSection };
  skipToSection?: FlowSection;
  skipToCustomSection?: { sectionId: string; sectionName?: string };
  endSurvey?: EndSurveyAction['config'];

  // Section visibility (accumulated from all matching rules)
  sectionsToShow: Set<FlowSection>;
  sectionsToHide: Set<FlowSection>;

  // Custom section visibility (accumulated from all matching rules)
  customSectionsToShow: Set<string>; // Custom section IDs
  customSectionsToHide: Set<string>; // Custom section IDs

  // Variables (accumulated from all matching rules)
  variables: Map<string, number | string>;

  // Debugging info
  executedRules: RuleEvaluationResult[];
}


export type ActionConfigFor<T extends RuleActionType> = Extract<
  RuleAction,
  { type: T }
>['config'];

export type TriggerConfigFor<T extends RuleTriggerType> = Extract<
  RuleTrigger,
  { type: T }
>['config'];

export const EMPTY_CONDITIONS: RuleConditions = { groups: [] };

export function createDefaultRule(studyId: string, position: number): SurveyRuleInsert {
  return {
    study_id: studyId,
    name: `Rule ${position + 1}`,
    position,
    is_enabled: true,
    conditions: EMPTY_CONDITIONS,
    action_type: 'skip_to_question',
    action_config: { questionId: '' },
    trigger_type: 'on_answer',
    trigger_config: {},
  };
}

export function createEmptyCondition(): RuleCondition {
  return {
    id: crypto.randomUUID(),
    source: { type: 'question', questionId: '' },
    operator: 'equals',
    values: [],
  };
}

export function createEmptyConditionGroup(): ConditionGroup {
  return {
    id: crypto.randomUUID(),
    conditions: [createEmptyCondition()],
    matchAll: true,
  };
}


export type RuleValidationIssueType =
  | 'circular_skip'         // A→B→A skip loop
  | 'show_hide_conflict'    // Same section shown AND hidden
  | 'invalid_question_ref'  // Question ID doesn't exist
  | 'invalid_variable_ref'  // Variable name doesn't exist
  | 'unreachable_rule'      // Rule after unconditional end_survey
  | 'backward_skip'         // Skip to earlier question
  | 'variable_circular_dep' // Variable depends on itself
  | 'empty_conditions';     // Rule with no conditions (always fires)

export interface RuleValidationIssue {
  id: string;
  type: RuleValidationIssueType;
  severity: 'error' | 'warning';
  message: string;
  ruleId: string;
  ruleName: string;
  relatedRuleIds?: string[];
  suggestedFix?: string;
}

export interface RulesValidationResult {
  isValid: boolean; // true if no errors (warnings are allowed)
  errorCount: number;
  warningCount: number;
  issues: RuleValidationIssue[];
}


export interface TemplatePlaceholder {
  id: string;
  label: string;
  description?: string;
  type: 'question' | 'section' | 'variable' | 'text' | 'number';
  required: boolean;
  defaultValue?: string | number;
}

export type TemplateCategory = 'screening' | 'branching' | 'visibility' | 'scoring';

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  placeholders: TemplatePlaceholder[];
  createRule: (values: Record<string, string | number>) => Omit<SurveyRuleInsert, 'study_id'>;
}
