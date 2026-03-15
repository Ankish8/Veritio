// =============================================================================
// Branching Logic Type Definitions
// Controls flow in screening questions and survey navigation

// Screening Branching Logic Types
// Controls flow in screening questions (reject/pass/next)

export type BranchTarget = 'next' | 'reject' | 'go_to_study';

export interface BranchingRule {
  optionId: string; // Which option triggers this branch
  target: BranchTarget;
  // Compound conditions - if set, ALL/ANY must be true for target to trigger
  conditions?: ScreeningCondition[];
  matchAll?: boolean; // true = AND all conditions, false = OR any condition (default: true)
}

export type ScreeningConditionOperator =
  | 'is' // equals
  | 'is_not' // not_equals
  | 'contains' // for checkbox multi-select
  | 'greater_than' // for likert/nps
  | 'less_than'; // for likert/nps
export interface ScreeningCondition {
  id: string;
  questionId: string; // Reference to another screening question
  operator: ScreeningConditionOperator;
  value: string | number | string[]; // Option ID(s) or numeric value
}

export interface BranchingLogic {
  rules: BranchingRule[];
  defaultTarget: BranchTarget; // What to do if no rule matches
}

export type ScaleComparison = 'equals' | 'less_than' | 'greater_than';

export interface ScaleBranchingRule {
  comparison: ScaleComparison;
  scaleValue: number;
  target: BranchTarget;
}

export interface ScaleBranchingLogic {
  rules: ScaleBranchingRule[];
  defaultTarget: BranchTarget;
}
// Survey Branching Logic Types
// Extended branching for survey questions (skip to question/section, end survey)

export type SurveyBranchTarget =
  | 'continue' // Continue to next question (default)
  | 'skip_to_question' // Skip to a specific question
  | 'skip_to_section' // Skip to a custom section
  | 'end_survey'; // End the survey early

export interface SurveyBranchingRule {
  optionId: string; // Which option triggers this branch
  target: SurveyBranchTarget;
  targetId?: string; // Question ID or section ID for skip targets
  // Advanced mode: additional conditions that must be met
  conditions?: AdvancedCondition[];
  matchAll?: boolean; // true = AND, false = OR (defaults to true)
}

export interface SurveyBranchingLogic {
  rules: SurveyBranchingRule[];
  defaultTarget: SurveyBranchTarget; // What to do if no rule matches
  defaultTargetId?: string; // For skip_to_question or skip_to_section defaults
}

export type SurveyNumericComparison = 'equals' | 'less_than' | 'greater_than' | 'less_than_or_equals' | 'greater_than_or_equals';

export interface SurveyNumericBranchingRule {
  comparison: SurveyNumericComparison;
  value: number;
  target: SurveyBranchTarget;
  targetId?: string;
}

export interface SurveyNumericBranchingLogic {
  type: 'numeric';
  rules: SurveyNumericBranchingRule[];
  defaultTarget: SurveyBranchTarget;
  defaultTargetId?: string;
}
// Text Question Branching Types
// Presence-based logic for text questions (answered/empty)

export type TextBranchCondition = 'is_answered' | 'is_empty';

export interface SurveyTextBranchingRule {
  id: string;
  condition: TextBranchCondition;
  target: SurveyBranchTarget;
  targetId?: string;
}

export interface SurveyTextBranchingLogic {
  type: 'text';
  rules: SurveyTextBranchingRule[];
  defaultTarget: SurveyBranchTarget;
  defaultTargetId?: string;
}
// Checkbox Grouping Types
// Enhanced logic for checkbox with option grouping (ANY/ALL)

export type OptionGroupMatchMode = 'any' | 'all';
export interface OptionGroup {
  id: string;
  optionIds: string[];
  matchMode: OptionGroupMatchMode; // 'any' = if ANY selected, 'all' = if ALL selected
  target: SurveyBranchTarget;
  targetId?: string;
}

export interface SurveyGroupedBranchingLogic {
  type: 'grouped';
  groups: OptionGroup[];
  individualRules: SurveyBranchingRule[]; // Options not in any group
  defaultTarget: SurveyBranchTarget;
  defaultTargetId?: string;
}
// Advanced Branching Types
// Cross-question conditions with AND/OR logic

export type AdvancedConditionSource = 'question' | 'variable';

export type AdvancedConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'is_answered'
  | 'is_not_answered'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equals'
  | 'less_than_or_equals';

export interface AdvancedCondition {
  id: string;
  source: AdvancedConditionSource;
  questionId?: string; // Reference to another question
  variableName?: string; // For variable-based conditions
  operator: AdvancedConditionOperator;
  value?: string | number; // The value to compare against
  values?: string[]; // For multi-value operators like 'contains'
}
export interface AdvancedBranch {
  id: string;
  conditions: AdvancedCondition[];
  matchAll: boolean; // true = AND all conditions, false = OR any condition
  target: SurveyBranchTarget;
  targetId?: string;
}
export interface AdvancedBranchingRules {
  branches: AdvancedBranch[];
  enabled: boolean;
}
// Enhanced Branching Types
// Full condition-based branching with all display logic operators

export type EnhancedBranchingOperator =
  // Text operators
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'not_equals'
  | 'is_empty'
  | 'is_not_empty'
  // Numerical text operators (inputType: 'numerical')
  | 'number_equals'
  | 'number_not_equals'
  | 'number_greater_than'
  | 'number_less_than'
  | 'number_between'
  // Date text operators (inputType: 'date')
  | 'date_is'
  | 'date_before'
  | 'date_after'
  | 'date_between'
  // Email text operators (inputType: 'email')
  | 'email_domain_is'
  | 'email_domain_contains'
  // Presence operators
  | 'is_answered'
  | 'is_not_answered'
  // Numeric operators
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equals'
  | 'less_than_or_equals'
  | 'between'
  // Choice operators
  | 'is'
  | 'is_not'
  | 'is_yes'
  | 'is_no'
  // Multi-select operators
  | 'includes_any'
  | 'includes_all'
  | 'includes_none'
  | 'selected_count_equals'
  | 'selected_count_gte'
  // Matrix operators
  | 'row_equals'
  | 'row_includes'
  | 'any_row_equals'
  // Ranking operators
  | 'item_ranked_at'
  | 'item_in_top'
  | 'item_ranked_above'
  // Constant sum operators
  | 'item_equals'
  | 'item_greater_than'
  | 'item_less_than'
  // Semantic differential operators
  | 'scale_equals'
  | 'scale_greater_than'
  | 'scale_less_than'
  | 'average_greater_than'
  | 'average_less_than';

export interface EnhancedBranchingRule {
  id: string;
  // Operator for the condition
  operator: EnhancedBranchingOperator;

  // Flexible value storage for different operators
  value?: string | number | boolean;
  values?: string[];

  // Range values (for 'between' operator)
  minValue?: number;
  maxValue?: number;

  // Matrix operators
  rowId?: string;
  columnId?: string;
  columnIds?: string[];

  // Ranking operators
  itemId?: string;
  secondItemId?: string;
  position?: number;

  // Semantic differential operators
  scaleId?: string;

  // Target (where to go when condition matches)
  target: SurveyBranchTarget;
  targetId?: string;
}

export interface EnhancedSurveyBranchingLogic {
  type: 'enhanced';
  rules: EnhancedBranchingRule[];
  defaultTarget: SurveyBranchTarget;
  defaultTargetId?: string;
}

export type SurveyBranchingLogicUnion =
  | SurveyBranchingLogic          // Choice questions (radio, dropdown, checkbox simple)
  | SurveyNumericBranchingLogic   // NPS, Likert, Rating
  | SurveyTextBranchingLogic      // Text questions (presence-based)
  | SurveyGroupedBranchingLogic   // Enhanced checkbox with grouping
  | EnhancedSurveyBranchingLogic; // Full condition-based branching (NEW)
