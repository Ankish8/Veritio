// =============================================================================
// Display Logic & Rules Type Definitions
// Controls conditional visibility of questions

// Display Logic Types
// Controls conditional visibility of questions
export type DisplayLogicOperator =
  // Universal operators
  | 'is_answered'
  | 'is_not_answered'
  // Single choice operators
  | 'is'
  | 'is_not'
  // Multi choice operators
  | 'includes_any'
  | 'includes_all'
  | 'includes_none'
  | 'selected_count_equals'
  | 'selected_count_gte'
  // Yes/No operators
  | 'is_yes'
  | 'is_no'
  // Numeric operators
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'between'
  // Text operators
  | 'contains'
  | 'not_contains'
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

export type DisplayLogicAction = 'show' | 'hide';
export const TASK_RESULT_QUESTION_ID = '__TASK_RESULT__'
export const TASK_DIRECT_SUCCESS_QUESTION_ID = '__TASK_DIRECT_SUCCESS__'
export const TASK_METRICS_PREFIX = '__TASK_METRIC__'

export interface TaskMetricsContext {
  outcome: 'success' | 'failure' | 'abandoned' | 'skipped'
  isDirect?: boolean
  clickCount: number
  misclickCount: number
  backtrackCount: number
  totalTimeMs: number
  timeToFirstClickMs: number
  pathTaken: string[]
  pathLength: number
}

export interface ComponentStateEvent {
  nodeId: string
  fromVariantId: string | null
  toVariantId: string
  isTimedChange: boolean
  timestamp: number
}

export interface ComponentStateSnapshot {
  [componentNodeId: string]: string
}

export interface ComponentStateSuccessCriteria {
  componentNodeId: string
  variantId: string
  variantName?: string
}

export type TaskMetricName =
  | 'clickCount'
  | 'misclickCount'
  | 'backtrackCount'
  | 'totalTimeMs'
  | 'timeToFirstClickMs'
  | 'pathLength'
  | 'pathTaken'

export function getTaskMetricQuestionId(metric: TaskMetricName): string {
  return `${TASK_METRICS_PREFIX}${metric}`
}

export function parseTaskMetricQuestionId(questionId: string): TaskMetricName | null {
  if (!questionId.startsWith(TASK_METRICS_PREFIX)) return null
  const metric = questionId.slice(TASK_METRICS_PREFIX.length) as TaskMetricName
  const validMetrics: TaskMetricName[] = [
    'clickCount',
    'misclickCount',
    'backtrackCount',
    'totalTimeMs',
    'timeToFirstClickMs',
    'pathLength',
    'pathTaken',
  ]
  return validMetrics.includes(metric) ? metric : null
}

/**
 * A single condition in display logic
 *
 * Special questionId values for post-task questions:
 * - TASK_RESULT_QUESTION_ID ('__TASK_RESULT__'): Task completion outcome
 *   Values: ['success', 'failure', 'abandoned', 'skipped']
 * - TASK_DIRECT_SUCCESS_QUESTION_ID ('__TASK_DIRECT_SUCCESS__'): Path optimality
 *   Values: ['direct', 'indirect']
 * - TASK_METRICS_PREFIX + metric ('__TASK_METRIC__misclickCount'): Numeric metrics
 *   Use with greater_than/less_than operators
 *   Metrics: clickCount, misclickCount, backtrackCount, totalTimeMs, timeToFirstClickMs, pathLength
 *
 * @see getTaskMetricQuestionId() helper to construct metric question IDs
 */
export interface DisplayLogicCondition {
  questionId: string; // Reference to another question or special task ID
  operator: DisplayLogicOperator;

  // Flexible value storage for different operators
  value?: string | number | boolean; // Single value (for equals, greater_than, etc.)
  values?: string[]; // Multiple values (for includes_any, is, etc.)

  // Range values (for 'between' operator)
  minValue?: number;
  maxValue?: number;

  // Matrix operators
  rowId?: string;    // Which row to check
  columnId?: string; // Which column to check (single)
  columnIds?: string[]; // Which columns to check (multi for row_includes)

  // Ranking operators
  itemId?: string;       // Item to check position of
  secondItemId?: string; // Second item for comparison (item_ranked_above)
  position?: number;     // Expected position (1-based)

  // Semantic differential operators
  scaleId?: string; // Which scale to check
}

export interface DisplayLogic {
  action: DisplayLogicAction;
  conditions: DisplayLogicCondition[];
  matchAll?: boolean; // true = AND all conditions, false = OR any condition
}
// Custom Sections Types
// User-created sections within Survey Questionnaire

export type CustomSectionParent = 'survey' | 'pre_study' | 'post_study';
export interface SurveyCustomSection {
  id: string;
  study_id: string;
  name: string;
  description?: string | null;
  position: number;
  parent_section: CustomSectionParent;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface SurveyCustomSectionInsert {
  study_id: string;
  name: string;
  description?: string | null;
  position?: number;
  parent_section?: CustomSectionParent;
  is_visible?: boolean;
}

export interface SurveyCustomSectionUpdate {
  name?: string;
  description?: string | null;
  position?: number;
  is_visible?: boolean;
}
