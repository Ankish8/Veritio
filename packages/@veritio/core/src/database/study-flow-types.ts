// =============================================================================
// STUDY FLOW TYPE DEFINITIONS
// Comprehensive types for the questionnaire and study flow system

// Enums and Basic Types
export type QuestionType =
  | 'single_line_text'
  | 'multi_line_text'
  | 'multiple_choice'  // Unified choice type (radio/checkbox/dropdown via mode)
  | 'image_choice'     // Visual selection from images in a grid layout
  | 'opinion_scale'    // Unified scale type (replaces likert)
  | 'yes_no'           // Binary choice with icons/emotions
  | 'nps'
  | 'matrix'
  | 'ranking'
  | 'slider'           // Continuous numeric slider (0-100 default)
  | 'semantic_differential' // Bipolar adjective rating scales (e.g., Difficult ↔ Easy)
  | 'constant_sum'     // Distribute fixed points across multiple items
  | 'audio_response';  // Verbal response with automatic transcription
export type FlowSection = 'screening' | 'pre_study' | 'post_study' | 'survey';
export type FlowStep =
  | 'welcome'
  | 'agreement'
  | 'screening'
  | 'identifier'
  | 'pre_study'
  | 'instructions'
  | 'activity'
  | 'survey'  // Survey questionnaire step (for survey study type)
  | 'post_study'
  | 'thank_you'
  | 'rejected'
  | 'closed'
  | 'early_end';  // Early survey termination (triggered by logic rules)
// Question Configuration Types
// Each question type has its own config shape
export type TextInputType = 'text' | 'numerical' | 'date' | 'email';
// AI Follow-up Probing Configuration
// Shared across all question types that support AI follow-up
export interface AiFollowupConfig {
  enabled: boolean;
  maxFollowups?: 1 | 2;       // default 2
  depthHint?: string;          // researcher guidance for follow-up direction
  triggerCondition?: 'always' | 'when_other' | 'specific_options';  // for choice questions
  triggerOptionIds?: string[];  // for 'specific_options' trigger condition
}

// Follow-up question type and config (Phase 3: AI chooses follow-up type)
export type FollowupQuestionType = 'text' | 'multiple_choice' | 'opinion_scale' | 'yes_no';

export interface FollowupQuestionConfig {
  options?: { id: string; label: string }[];  // for multiple_choice
  scalePoints?: number;                        // for opinion_scale
  leftLabel?: string;                          // for opinion_scale
  rightLabel?: string;                         // for opinion_scale
}

export interface TextQuestionConfig {
  inputType?: TextInputType;  // For single_line_text: text, numerical, date, email (default: text)
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  // Type-specific validation for numerical
  minValue?: number;
  maxValue?: number;
  // Type-specific validation for date
  minDate?: string;  // ISO date string
  maxDate?: string;  // ISO date string
  // AI follow-up probing
  aiFollowup?: AiFollowupConfig;
}
export interface ChoiceOption {
  id: string;
  label: string;
  value?: string; // Optional custom value, defaults to label
  score?: number; // Optional score value for this option (used with inline scoring)
}
export interface ImageChoiceOption {
  id: string;
  label: string;              // Used for alt text (auto-generated) and optional label display
  imageUrl?: string | null;   // URL to uploaded image in Supabase Storage
  imageFilename?: string | null; // Original filename for display in builder
  score?: number;             // Optional score value for this option (used with inline scoring)
}
export type ImageChoiceMode = 'single' | 'multi';
export type ImageChoiceGridColumns = 2 | 3 | 4;
// NEW Question Configuration Types
export type MultipleChoiceMode = 'single' | 'multi' | 'dropdown';
export interface MultipleChoiceQuestionConfig {
  mode: MultipleChoiceMode;  // 'single' = radio-style, 'multi' = checkbox-style, 'dropdown' = select menu
  options: ChoiceOption[];
  shuffle?: boolean;         // Randomize option order
  allowOther?: boolean;
  otherLabel?: string;
  // Only for 'multi' mode
  minSelections?: number;
  maxSelections?: number;
  // Only for 'dropdown' mode
  placeholder?: string;
  aiFollowup?: AiFollowupConfig;
}
export interface ImageChoiceQuestionConfig {
  mode: ImageChoiceMode;         // 'single' = radio-style, 'multi' = checkbox-style
  options: ImageChoiceOption[];
  gridColumns: ImageChoiceGridColumns;  // Grid layout: 2, 3, or 4 columns
  showLabels: boolean;           // Show text labels below images
  shuffle?: boolean;             // Randomize option order
  allowOther?: boolean;          // Allow "Other" option with text input (no image)
  otherLabel?: string;
  // Only for 'multi' mode
  minSelections?: number;
  maxSelections?: number;
}
export type OpinionScaleType = 'numerical' | 'stars' | 'emotions';
export interface OpinionScaleQuestionConfig {
  scalePoints: number;        // 5-11 range
  startAtZero?: boolean;      // false = 1-based (default), true = 0-based
  scaleType: OpinionScaleType;
  leftLabel?: string;         // e.g., "Bad" or "Strongly disagree"
  middleLabel?: string;       // e.g., "Okay" or "Neutral"
  rightLabel?: string;        // e.g., "Good" or "Strongly agree"
  aiFollowup?: AiFollowupConfig;
}
export type YesNoStyleType = 'icons' | 'emotions' | 'buttons';
export interface YesNoQuestionConfig {
  styleType: YesNoStyleType;
  yesLabel?: string;          // Default: "Yes"
  noLabel?: string;           // Default: "No"
  aiFollowup?: AiFollowupConfig;
}
export interface QuestionImage {
  url: string;
  alt?: string;
  filename?: string;
}
export interface NPSQuestionConfig {
  leftLabel?: string; // Default: "Not at all likely"
  rightLabel?: string; // Default: "Extremely likely"
  aiFollowup?: AiFollowupConfig;
}
export interface MatrixItem {
  id: string;
  label: string;
}
export interface MatrixQuestionConfig {
  rows: MatrixItem[];
  columns: MatrixItem[];
  allowMultiplePerRow?: boolean; // If true, checkboxes; if false, radio per row
}
export interface RankingItem {
  id: string;
  label: string;
}
export interface RankingQuestionConfig {
  items: RankingItem[];
  randomOrder?: boolean;
}
export type SliderStepSize = 1 | 5 | 10 | 25;
export interface SliderQuestionConfig {
  minValue: number;           // Minimum value (default: 0)
  maxValue: number;           // Maximum value (default: 100)
  step: SliderStepSize;       // Increment step (1, 5, 10, or 25)
  leftLabel?: string;         // Label for min end (e.g., "Not at all")
  middleLabel?: string;       // Optional label for middle
  rightLabel?: string;        // Label for max end (e.g., "Extremely")
  showTicks?: boolean;        // Show tick marks along the track
  showValue?: boolean;        // Show current value tooltip while dragging
  aiFollowup?: AiFollowupConfig;
}
export type SemanticDifferentialScalePoints = 5 | 7 | 9;
export interface SemanticDifferentialScale {
  id: string;
  leftLabel: string;          // Negative/left endpoint (e.g., "Difficult")
  rightLabel: string;         // Positive/right endpoint (e.g., "Easy")
  weight?: number;            // Optional weight for scoring (default: 1)
}
export type SemanticDifferentialPresetId =
  | 'usability'               // Usability evaluation (useful, easy, efficient, etc.)
  | 'aesthetics'              // Visual/aesthetic evaluation (beautiful, modern, professional)
  | 'brand_perception'        // Brand perception (trustworthy, innovative, friendly)
  | 'product_experience'      // Product experience (satisfying, intuitive, powerful)
  | 'custom';                 // User-defined scales
export interface SemanticDifferentialQuestionConfig {
  scalePoints: SemanticDifferentialScalePoints;  // 5, 7, or 9 points
  scales: SemanticDifferentialScale[];           // Array of bipolar scales (2-10)
  showMiddleLabel?: boolean;     // Show label at center point (default: true)
  middleLabel?: string;          // Middle/neutral label (default: "Neutral")
  randomizeScales?: boolean;     // Randomize scale order (default: false)
  showNumbers?: boolean;         // Show numeric values on scale (default: false)
  presetId?: SemanticDifferentialPresetId;  // Template used (for reference)
}
export interface ConstantSumItem {
  id: string;
  label: string;
  description?: string;  // Optional helper text shown below the label
}
export type ConstantSumDisplayMode = 'inputs' | 'sliders';
export interface ConstantSumQuestionConfig {
  items: ConstantSumItem[];              // 2-10 items to allocate points across
  totalPoints: number;                   // Total points to distribute (default: 100)
  displayMode: ConstantSumDisplayMode;   // 'inputs' or 'sliders'
  showBars: boolean;                     // Show proportional allocation bars (default: true)
  randomOrder?: boolean;                 // Randomize item order (default: false)
}
export type AudioTranscriptionLanguage =
  | 'multi'   // Code-switching support (default)
  | 'en'      // English
  | 'es'      // Spanish
  | 'fr'      // French
  | 'de'      // German
  | 'hi'      // Hindi
  | 'ja'      // Japanese
  | 'ko'      // Korean
  | 'zh'      // Chinese
  | 'pt'      // Portuguese
  | 'it'      // Italian
  | 'nl'      // Dutch
  | 'ru';     // Russian
export interface AudioResponseQuestionConfig {
  maxDurationSeconds: number;
  minDurationSeconds?: number;
  allowRerecord: boolean;
  transcriptionLanguage?: AudioTranscriptionLanguage;
  showTranscriptPreview?: boolean;
}
export type QuestionConfig =
  | TextQuestionConfig
  | MultipleChoiceQuestionConfig
  | ImageChoiceQuestionConfig
  | OpinionScaleQuestionConfig
  | YesNoQuestionConfig
  | NPSQuestionConfig
  | MatrixQuestionConfig
  | RankingQuestionConfig
  | SliderQuestionConfig
  | SemanticDifferentialQuestionConfig
  | ConstantSumQuestionConfig
  | AudioResponseQuestionConfig;
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

const VALID_TASK_METRICS: Set<string> = new Set<string>([
  'clickCount', 'misclickCount', 'backtrackCount',
  'totalTimeMs', 'timeToFirstClickMs', 'pathLength', 'pathTaken',
])

export function parseTaskMetricQuestionId(questionId: string): TaskMetricName | null {
  if (!questionId.startsWith(TASK_METRICS_PREFIX)) return null
  const metric = questionId.slice(TASK_METRICS_PREFIX.length)
  return VALID_TASK_METRICS.has(metric) ? (metric as TaskMetricName) : null
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
// Branching Logic Types
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
// Union Type for All Survey Branching Logic
export type SurveyBranchingLogicUnion =
  | SurveyBranchingLogic          // Choice questions (radio, dropdown, checkbox simple)
  | SurveyNumericBranchingLogic   // NPS, Likert, Rating
  | SurveyTextBranchingLogic      // Text questions (presence-based)
  | SurveyGroupedBranchingLogic   // Enhanced checkbox with grouping
  | EnhancedSurveyBranchingLogic; // Full condition-based branching (NEW)
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
// Study Flow Question Model
// The main question entity stored in the database
export interface StudyFlowQuestion {
  id: string;
  study_id: string;
  section: FlowSection;
  position: number;
  question_type: QuestionType;
  question_text: string;
  question_text_html?: string | null;
  description?: string | null; // Optional notes/helper text shown below question
  is_required: boolean;
  config: QuestionConfig;
  image?: QuestionImage | null;  // Optional image displayed above question text
  display_logic?: DisplayLogic | null;
  branching_logic?: BranchingLogic | ScaleBranchingLogic | null;
  // Survey-specific fields
  custom_section_id?: string | null; // Reference to custom section this question belongs to
  survey_branching_logic?: SurveyBranchingLogicUnion | null; // Inline branching for survey questions
  advanced_branching_rules?: AdvancedBranchingRules | null; // Cross-question conditions
  created_at: string;
  updated_at: string;
}
export interface StudyFlowQuestionInsert {
  study_id: string;
  section: FlowSection;
  position?: number;
  question_type: QuestionType;
  question_text: string;
  question_text_html?: string | null;
  description?: string | null;
  is_required?: boolean;
  config?: QuestionConfig;
  image?: QuestionImage | null;
  display_logic?: DisplayLogic | null;
  branching_logic?: BranchingLogic | ScaleBranchingLogic | null;
  // Survey-specific fields
  custom_section_id?: string | null;
  survey_branching_logic?: SurveyBranchingLogicUnion | null;
  advanced_branching_rules?: AdvancedBranchingRules | null;
}
// Response Value Types
// Different shapes for different question types
export type TextResponseValue = string;
export interface SingleChoiceResponseValue {
  optionId: string;
  otherText?: string; // If "other" was selected
}
export interface MultiChoiceResponseValue {
  optionIds: string[];
  otherText?: string;
}
export interface ScaleResponseValue {
  value: number;
}
export interface MatrixResponseValue {
  [rowId: string]: string | string[]; // columnId or array of columnIds
}
export type RankingResponseValue = string[];
export type YesNoResponseValue = boolean;
export type OpinionScaleResponseValue = number;
export type SliderResponseValue = number;
export interface SemanticDifferentialResponseValue {
  [scaleId: string]: number;  // Centered value (e.g., -3 to +3)
}
export interface ConstantSumResponseValue {
  [itemId: string]: number;  // Points allocated to each item
}
export interface AudioResponseValue {
  recordingId: string;
  responseId: string;
  durationMs: number;
}
export type ResponseValue =
  | TextResponseValue
  | SingleChoiceResponseValue
  | MultiChoiceResponseValue
  | ScaleResponseValue
  | MatrixResponseValue
  | RankingResponseValue
  | YesNoResponseValue
  | OpinionScaleResponseValue
  | SliderResponseValue
  | SemanticDifferentialResponseValue
  | ConstantSumResponseValue
  | AudioResponseValue;
// Study Flow Response Model
// Participant answers stored in the database
export interface StudyFlowResponse {
  id: string;
  participant_id: string;
  question_id: string;
  study_id: string;
  response_value: ResponseValue;
  response_time_ms?: number | null;
  created_at: string;
}
export interface StudyFlowResponseInsert {
  participant_id: string;
  question_id: string;
  study_id: string;
  response_value: ResponseValue;
  response_time_ms?: number;
}
// Study Flow Settings Types
// Configuration for each section of the study flow
export interface WelcomeSettings {
  enabled: boolean;
  title: string;
  message: string; // HTML content
  // Include from Details tab toggles
  includeStudyTitle?: boolean;
  includeDescription?: boolean;
  includePurpose?: boolean;
  includeParticipantRequirements?: boolean;
  // Incentive display settings
  showIncentive?: boolean; // Toggle to show incentive card
  incentiveMessage?: string; // Editable message with {incentive} placeholder
}
export interface ParticipantAgreementSettings {
  enabled: boolean;
  title: string;
  message: string; // Intro text
  agreementText: string; // The actual agreement to accept (HTML)
  showRejectionMessage?: boolean; // Whether to show rejection message settings (default: true for backwards compat)
  rejectionTitle: string;
  rejectionMessage: string;
  redirectUrl?: string;
}
export type ParticipantIdentifierType = 'anonymous' | 'demographic_profile';
export type DemographicFieldType =
  // Basic Demographics
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'gender'
  | 'ageRange'
  | 'location'
  | 'maritalStatus'
  | 'householdSize'
  // Professional / Work Details
  | 'employmentStatus'
  | 'jobTitle'
  | 'industry'
  | 'companySize'
  | 'yearsOfExperience'
  | 'department'
  // Technology & Usage Context
  | 'primaryDevice'
  | 'operatingSystem'
  | 'browserPreference'
  | 'techProficiency'
  // Education & Background
  | 'educationLevel'
  | 'occupationType'
  | 'locationType'
  | 'timeZone'
  // Research Participation
  | 'priorExperience'
  | 'followUpWillingness'
  | 'researchAvailability'
  | 'contactConsent'
  | 'yearsUsingProduct'
  | 'productUsageFrequency'
  // Accessibility & Inclusivity
  | 'accessibilityNeeds'
  | 'preferredLanguage'
  | 'assistiveTechnology'
  | 'digitalComfort';
export interface DemographicFieldConfig {
  enabled: boolean;
  required: boolean;
  label?: string;
  mappedToScreeningQuestionId?: string | null; // For smart mapping from screening questions
}
export interface GenderOptions {
  options: string[]; // e.g., ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other']
}
export interface AgeRangeOptions {
  ranges: string[]; // e.g., ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+']
}
export interface LocationFieldConfig {
  startLevel: 'country' | 'state' | 'city'; // Where the cascade begins
  defaultCountry?: string | null; // ISO country code (for state/city start levels)
  defaultState?: string | null; // State ISO code (for city start level)
}
export interface MaritalStatusOptions {
  options: string[]; // e.g., ['Single', 'Married', 'Divorced', 'Widowed', 'Separated', 'Prefer not to say']
}
export interface HouseholdSizeOptions {
  options: string[]; // e.g., ['1', '2', '3', '4', '5', '6+']
}
export interface EmploymentStatusOptions {
  options: string[]; // e.g., ['Student', 'Employed', 'Self-employed', 'Unemployed', 'Retired', 'Prefer not to say']
}
export interface IndustryOptions {
  options: string[]; // e.g., ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', etc.]
}
export interface CompanySizeOptions {
  options: string[]; // e.g., ['1-10', '11-50', '51-200', '201-1000', '1000+']
}
export interface YearsOfExperienceOptions {
  options: string[]; // e.g., ['0-1', '1-3', '3-5', '5-10', '10-15', '15+']
}
export interface DepartmentOptions {
  options: string[]; // e.g., ['Design', 'Engineering', 'Marketing', 'Sales', 'Product', 'Operations', etc.]
}
export interface PrimaryDeviceOptions {
  options: string[]; // e.g., ['Mobile', 'Desktop', 'Tablet', 'Smart TV', 'Other']
}
export interface OperatingSystemOptions {
  options: string[]; // e.g., ['Windows', 'macOS', 'iOS', 'Android', 'Linux', 'ChromeOS', 'Other']
}
export interface BrowserPreferenceOptions {
  options: string[]; // e.g., ['Chrome', 'Safari', 'Firefox', 'Edge', 'Brave', 'Arc', 'Opera', 'Other']
}
export interface TechProficiencyOptions {
  options: string[]; // e.g., ['Beginner', 'Intermediate', 'Advanced', 'Expert']
}
export interface EducationLevelOptions {
  options: string[]; // e.g., ['High school or equivalent', "Bachelor's degree", "Master's degree", etc.]
}
export interface OccupationTypeOptions {
  options: string[]; // e.g., ['Student', 'Full-time employee', 'Freelancer/Contractor', 'Business owner', etc.]
}
export interface LocationTypeOptions {
  options: string[]; // e.g., ['Urban', 'Suburban', 'Rural']
}
export interface TimeZoneOptions {
  options: string[]; // e.g., ['UTC-12:00', 'UTC-11:00', ... 'UTC+14:00', 'Prefer not to say']
}
export interface PriorExperienceOptions {
  options: string[]; // e.g., ['First time participating', 'Participated 1-2 times', 'Regular participant']
}
export interface FollowUpWillingnessOptions {
  options: string[]; // e.g., ['Yes, very interested', 'Yes, possibly', 'Maybe later', 'No thank you']
}
export interface ResearchAvailabilityOptions {
  options: string[]; // e.g., ['Weekday mornings', 'Weekday afternoons', 'Weekends', 'Flexible/Any time']
}
export interface ContactConsentOptions {
  options: string[]; // e.g., ['Yes contact me for future studies', 'Only for this study', 'No do not contact']
}
export interface YearsUsingProductOptions {
  options: string[]; // e.g., ['First time user', 'Less than 6 months', '1-2 years', '5+ years']
}
export interface ProductUsageFrequencyOptions {
  options: string[]; // e.g., ['Multiple times per day', 'Daily', 'Weekly', 'Monthly', 'Rarely']
}
export interface AccessibilityNeedsOptions {
  options: string[]; // e.g., ['None', 'Visual impairment', 'Hearing impairment', 'Motor impairment', etc.]
}
export interface PreferredLanguageOptions {
  options: string[]; // e.g., ['English', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese', etc.]
}
export interface AssistiveTechnologyOptions {
  options: string[]; // e.g., ['None', 'Screen reader', 'Voice control', 'Keyboard-only navigation', etc.]
}
export interface DigitalComfortOptions {
  options: string[]; // e.g., ['Very comfortable', 'Comfortable', 'Neutral', 'Uncomfortable', 'Very uncomfortable']
}
export interface DemographicField {
  id: string;
  type: 'predefined' | 'custom';
  position: number;
  enabled: boolean;
  required: boolean;

  // For predefined fields
  fieldType?: DemographicFieldType;
  label?: string; // Optional custom label override

  // For custom fields
  questionText?: string;
  placeholder?: string;

  // Screening question mapping (for smart auto-population)
  mappedToScreeningQuestionId?: string | null;

  // Layout control - how much horizontal space this field should occupy
  width?: 'full' | 'half'; // Default: 'half'
}
export interface DemographicSection {
  id: string;
  name: string;
  position: number;
  fields: DemographicField[];
  title?: string; // Section title shown to participants
  description?: string; // Section description/instructions
}
export interface DemographicProfileSettings {
  sections: DemographicSection[];
  title?: string; // Form heading, default: "Participant Information"
  description?: string; // Brief description shown under the title
  enableAutoPopulation?: boolean; // Global toggle for smart auto-population

  // Options configurations for predefined fields
  genderOptions: GenderOptions;
  ageRangeOptions: AgeRangeOptions;
  locationConfig: LocationFieldConfig;
  maritalStatusOptions: MaritalStatusOptions;
  householdSizeOptions: HouseholdSizeOptions;
  employmentStatusOptions: EmploymentStatusOptions;
  industryOptions: IndustryOptions;
  companySizeOptions: CompanySizeOptions;
  yearsOfExperienceOptions: YearsOfExperienceOptions;
  departmentOptions: DepartmentOptions;
  // Technology & Usage Context
  primaryDeviceOptions: PrimaryDeviceOptions;
  operatingSystemOptions: OperatingSystemOptions;
  browserPreferenceOptions: BrowserPreferenceOptions;
  techProficiencyOptions: TechProficiencyOptions;
  // Education & Background
  educationLevelOptions: EducationLevelOptions;
  occupationTypeOptions: OccupationTypeOptions;
  locationTypeOptions: LocationTypeOptions;
  timeZoneOptions: TimeZoneOptions;
  // Research Participation
  priorExperienceOptions: PriorExperienceOptions;
  followUpWillingnessOptions: FollowUpWillingnessOptions;
  researchAvailabilityOptions: ResearchAvailabilityOptions;
  contactConsentOptions: ContactConsentOptions;
  yearsUsingProductOptions: YearsUsingProductOptions;
  productUsageFrequencyOptions: ProductUsageFrequencyOptions;
  // Accessibility & Inclusivity
  accessibilityNeedsOptions: AccessibilityNeedsOptions;
  preferredLanguageOptions: PreferredLanguageOptions;
  assistiveTechnologyOptions: AssistiveTechnologyOptions;
  digitalComfortOptions: DigitalComfortOptions;
}
export interface ParticipantDemographicData {
  // Basic Demographics
  email?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  ageRange?: string;
  location?: {
    country?: string; // Country name (e.g., "United States")
    countryCode?: string; // ISO code (e.g., "US")
    state?: string; // State name (e.g., "California")
    stateCode?: string; // ISO code (e.g., "CA")
    city?: string; // City name (e.g., "San Francisco")
  };
  maritalStatus?: string; // e.g., "Married"
  householdSize?: string; // e.g., "4"

  // Professional / Work Details
  employmentStatus?: string; // e.g., "Employed"
  jobTitle?: string; // e.g., "Senior Product Designer"
  industry?: string; // e.g., "Technology"
  companySize?: string; // e.g., "51-200"
  yearsOfExperience?: string; // e.g., "5-10"
  department?: string; // e.g., "Engineering"

  // Technology & Usage Context
  primaryDevice?: string; // e.g., "Desktop"
  operatingSystem?: string; // e.g., "macOS"
  browserPreference?: string; // e.g., "Chrome"
  techProficiency?: string; // e.g., "Advanced"

  // Education & Background
  educationLevel?: string; // e.g., "Bachelor's degree"
  occupationType?: string; // e.g., "Full-time employee"
  locationType?: string; // e.g., "Urban"
  timeZone?: string; // e.g., "UTC-08:00 (PST)"

  // Research Participation
  priorExperience?: string; // e.g., "Participated 1-2 times"
  followUpWillingness?: string; // e.g., "Yes, very interested"
  researchAvailability?: string; // e.g., "Weekday evenings"
  contactConsent?: string; // e.g., "Yes contact me for future studies"
  yearsUsingProduct?: string; // e.g., "1-2 years"
  productUsageFrequency?: string; // e.g., "Daily"

  // Accessibility & Inclusivity
  accessibilityNeeds?: string; // e.g., "None"
  preferredLanguage?: string; // e.g., "English"
  assistiveTechnology?: string; // e.g., "Screen reader"
  digitalComfort?: string; // e.g., "Very comfortable"

  // Custom fields (dynamic)
  [key: string]: string | number | boolean | null | undefined | Record<string, string>; // Allow custom field data

  _sources?: Record<string, string>; // Track data provenance (where each field came from)
}
export interface FieldMappingSuggestion {
  screeningQuestionId: string;
  screeningQuestionText: string;
  demographicField: DemographicFieldType;
  confidence: 'high' | 'medium' | 'low';
  reason: string; // Why this mapping was suggested
}
export type ParticipantDisplayField =
  | 'none'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'fullName';
export interface ParticipantDisplaySettings {
  primaryField: ParticipantDisplayField;
  secondaryField: ParticipantDisplayField;
}
export interface ParticipantIdentifierSettings {
  type: ParticipantIdentifierType;
  demographicProfile?: DemographicProfileSettings; // For 'demographic_profile' type
  displaySettings?: ParticipantDisplaySettings;
}
export interface ScreeningSettings {
  enabled: boolean;
  introTitle?: string;
  introMessage?: string;
  rejectionTitle: string;
  rejectionMessage: string;
  redirectUrl?: string;
  redirectImmediately?: boolean;
  pageMode?: 'one_per_page' | 'all_on_one'; // Default: 'one_per_page'
}
export interface QuestionsSectionSettings {
  enabled: boolean;
  showIntro?: boolean; // Default: true - whether to show the intro message
  introTitle?: string;
  introMessage?: string;
  pageMode?: 'one_per_page' | 'all_on_one'; // Default: 'one_per_page'
  randomizeQuestions?: boolean; // Default: false
  autoAdvance?: boolean; // Default: false - auto-advance after selection (only in one_per_page mode)
}
export interface SurveyQuestionnaireSettings {
  enabled: boolean;
  showIntro?: boolean; // Default: true - whether to show the intro message
  introTitle?: string;
  introMessage?: string;
  pageMode?: 'one_per_page' | 'all_on_one'; // Default: 'one_per_page'
  randomizeQuestions?: boolean; // Default: false
  showProgressBar?: boolean; // Default: true
  allowSkipQuestions?: boolean; // Default: false
  autoAdvance?: boolean; // Default: false - auto-advance after selection (only in one_per_page mode)
}
export interface ActivityInstructionsSettings {
  enabled: boolean;
  title: string;
  part1: string; // Instructions shown before first card sorted
  part2?: string; // Instructions shown after first card sorted (optional)
}
export interface ThankYouSettings {
  enabled: boolean;
  title: string;
  message: string;
  redirectUrl?: string;
  redirectDelay?: number; // Seconds before redirect (0 = no redirect)
  // Incentive confirmation settings
  showIncentive?: boolean; // Toggle to show incentive confirmation
  incentiveMessage?: string; // Editable message with {incentive} placeholder
}
export interface ClosedStudySettings {
  title: string;
  message: string;
  redirectUrl?: string;
  redirectImmediately: boolean;
}
export interface PaginationSettings {
  mode: 'progressive' | 'one_per_page';
}
export interface StudyFlowSettings {
  welcome: WelcomeSettings;
  participantAgreement: ParticipantAgreementSettings;
  screening: ScreeningSettings;
  participantIdentifier: ParticipantIdentifierSettings;
  preStudyQuestions: QuestionsSectionSettings;
  activityInstructions: ActivityInstructionsSettings;
  surveyQuestionnaire?: SurveyQuestionnaireSettings; // For survey study type
  postStudyQuestions: QuestionsSectionSettings;
  thankYou: ThankYouSettings;
  closedStudy: ClosedStudySettings;
  pagination?: PaginationSettings; // Survey pagination mode (progressive reveal vs one-per-page)
}
// Extended Settings Types
// Updated card sort and tree test settings with study flow
export type ThinkAloudPromptPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export interface ThinkAloudSettings {
  enabled: boolean
  showEducation: boolean
  silenceThresholdSeconds: number
  audioLevelThreshold: number
  promptPosition: ThinkAloudPromptPosition
  customPrompts?: string[]
}
export interface SessionRecordingSettings {
  enabled: boolean
  captureMode: 'audio' | 'screen_audio' | 'screen_audio_webcam'
  recordingScope: 'session' | 'task'
  privacyNotice?: string[]
  transcriptionLanguage?: string
  thinkAloud?: ThinkAloudSettings
}
export interface ExtendedCardSortSettings {
  // Original card sort settings
  mode: 'open' | 'closed' | 'hybrid';
  randomizeCards: boolean;
  allowSkip: boolean;
  showProgress: boolean;
  maxCategories?: number;

  // Card options (new features from Optimal Workshop)
  showTooltipDescriptions?: boolean;
  allowCardImages?: boolean;
  allowComments?: boolean;
  showCardOrderIndicators?: boolean;
  showUnsortedIndicator?: boolean;
  requireAllCardsSorted?: boolean;
  cardSubset?: number; // Show each participant X cards

  // Category options (for closed/hybrid)
  allowCategoryDescriptions?: boolean;
  addCategoryLimits?: boolean;
  randomizeCategoryOrder?: boolean;
  requireCategoriesNamed?: boolean;

  // Session recording settings
  sessionRecordingSettings?: SessionRecordingSettings;

  // Study flow configuration
  studyFlow?: StudyFlowSettings;

  // Legacy/alias properties for backwards compatibility
  randomizeCategories?: boolean; // Alias for randomizeCategoryOrder
  showCardImages?: boolean; // Alias for allowCardImages
  showCardDescriptions?: boolean; // Alias for showTooltipDescriptions
  showCategoryDescriptions?: boolean; // Alias for allowCategoryDescriptions
  includeUnclearCategory?: boolean; // Include unclear/unsure category
}
export interface TaskFeedbackSettings {
  pageMode: 'one_per_page' | 'all_on_one';
}
export interface ExtendedTreeTestSettings {
  // Original tree test settings
  randomizeTasks: boolean;
  showBreadcrumbs: boolean;
  allowBack: boolean;
  showTaskProgress: boolean;
  allowSkipTasks?: boolean;
  dontRandomizeFirstTask?: boolean;
  answerButtonText?: string;

  // Task feedback settings (applies to all tasks)
  taskFeedback?: TaskFeedbackSettings;

  // Legacy property for backwards compatibility
  taskFeedbackPageMode?: 'one_per_page' | 'all_on_one';

  // Session recording settings
  sessionRecordingSettings?: SessionRecordingSettings;

  // Study flow configuration
  studyFlow?: StudyFlowSettings;
}
export interface ExtendedSurveySettings {
  // Survey-specific settings
  showOneQuestionPerPage: boolean;  // true = one per page, false = all on one page
  randomizeQuestions: boolean;
  showProgressBar: boolean;
  allowSkipQuestions: boolean;

  // Study flow configuration
  studyFlow?: StudyFlowSettings;
}
export type PrototypeScaleMode = '100%' | 'fit' | 'fill' | 'width';
export type TaskInstructionPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
export interface ExtendedPrototypeTestSettings {
  // Prototype test settings
  randomizeTasks?: boolean;
  allowSkipTasks?: boolean;
  showTaskProgress?: boolean;
  dontRandomizeFirstTask?: boolean;
  clickableAreaFlashing?: boolean;
  tasksEndAutomatically?: boolean;
  allowFailureResponse?: boolean;
  showEachParticipantTasks?: 'all' | number;
  taskInstructionPosition?: TaskInstructionPosition;
  scalePrototype?: PrototypeScaleMode | boolean;
  trackHesitation?: boolean;
  trackNonClickEvents?: boolean;

  // Task feedback settings (applies to all tasks)
  taskFeedback?: TaskFeedbackSettings;

  // Legacy property for backwards compatibility
  taskFeedbackPageMode?: 'one_per_page' | 'all_on_one';

  // Session recording settings
  sessionRecordingSettings?: SessionRecordingSettings;

  // Study flow configuration
  studyFlow?: StudyFlowSettings;
}
export type FirstImpressionDisplayMode = 'fit' | 'fill' | 'actual' | 'hidpi';
export type FirstImpressionDesignAssignmentMode = 'random_single' | 'sequential_all';
export type FirstImpressionQuestionDisplayMode = 'one_per_page' | 'all_on_page';
export interface FirstImpressionDesign {
  id: string;
  study_id: string;
  name?: string | null;
  position: number;
  image_url?: string | null;
  original_filename?: string | null;
  source_type: 'upload' | 'figma';
  figma_file_key?: string | null;
  figma_node_id?: string | null;
  width?: number | null;
  height?: number | null;
  mobile_image_url?: string | null;
  mobile_width?: number | null;
  mobile_height?: number | null;
  display_mode: FirstImpressionDisplayMode;
  background_color: string;
  weight: number; // 0-100 for A/B testing weight
  is_practice: boolean;
  questions: FirstImpressionDesignQuestion[];
  created_at: string;
  updated_at: string;
}
export interface FirstImpressionDesignQuestion {
  id: string;
  question_type: QuestionType;
  question_text: string;
  question_text_html?: string | null;
  description?: string | null;
  is_required: boolean;
  config: QuestionConfig;
  image?: QuestionImage | null;
  position: number;
}
export interface ExtendedFirstImpressionSettings {
  // Exposure settings
  exposureDurationMs: number; // 5000-20000 (5-20 seconds)
  countdownDurationMs: number; // 0-5000 (0-5 seconds)
  showTimerToParticipant: boolean; // Whether to show remaining time
  showProgressIndicator: boolean; // Whether to show design progress (e.g., "1 of 3")

  // Display settings (global - applies to all designs)
  displayMode: FirstImpressionDisplayMode; // How images are scaled/positioned
  backgroundColor: string; // Background color when image doesn't fill screen

  // Question display settings
  questionDisplayMode: FirstImpressionQuestionDisplayMode;
  randomizeQuestions: boolean;
  autoAdvanceQuestions: boolean; // Auto-advance after answering single-select questions

  // Design assignment settings
  designAssignmentMode: FirstImpressionDesignAssignmentMode;
  allowPracticeDesign: boolean; // Whether first design can be marked as practice

  // Practice round instructions (shown before the practice design)
  practiceInstructions?: {
    title: string;
    content: string; // HTML content
  };

  // Task feedback settings (applies to per-design questions)
  taskFeedback?: TaskFeedbackSettings;

  // Session recording settings
  sessionRecordingSettings?: SessionRecordingSettings;

  // Study flow configuration
  studyFlow?: StudyFlowSettings;
}
export const DEFAULT_FIRST_IMPRESSION_SETTINGS: ExtendedFirstImpressionSettings = {
  exposureDurationMs: 5000, // 5 seconds
  countdownDurationMs: 3000, // 3 second countdown
  showTimerToParticipant: true,
  showProgressIndicator: true,
  displayMode: 'fit', // Default to fit (contain) mode
  backgroundColor: '#ffffff', // White background
  questionDisplayMode: 'one_per_page',
  randomizeQuestions: false,
  autoAdvanceQuestions: false, // Disabled by default - better UX for most users
  designAssignmentMode: 'random_single',
  allowPracticeDesign: false,
};
export const DEFAULT_PRACTICE_INSTRUCTIONS = {
  title: 'Practice Round',
  content: `<p>Before we begin, let's do a quick practice round to help you understand how this works.</p>
<p><strong>Here's what will happen:</strong></p>
<ul>
<li>You'll see a design image for a few seconds</li>
<li>Then you'll answer some questions about your first impressions</li>
<li>Don't worry about memorizing details — just pay attention to how the design makes you feel</li>
</ul>
<p>This practice round <strong>won't count</strong> toward the study results. It's just to help you get comfortable with the task.</p>`,
};
// Answer Piping Types
// Dynamic text replacement in questions based on previous answers
export interface PipingReference {
  type: 'id' | 'title';
  questionId?: string;
  questionTitle?: string;
  raw: string;
}
// A/B Testing Types
// Split testing for questions and sections
export interface ABTestVariant {
  id: string;
  study_id: string;
  entity_type: 'question' | 'section';
  entity_id: string;
  variant_a_content: StudyFlowQuestion | SurveyCustomSection;
  variant_b_content: StudyFlowQuestion | SurveyCustomSection;
  split_percentage: number;
  is_enabled: boolean;
  created_at: string;
}
export interface ParticipantVariantAssignment {
  id: string;
  participant_id: string;
  ab_test_variant_id: string;
  assigned_variant: 'A' | 'B';
  assigned_at: string | null;
}
export interface ABTestStatistics {
  variant_a_count: number;
  variant_b_count: number;
  variant_a_completion_rate?: number;
  variant_b_completion_rate?: number;
  p_value?: number;
  confidence_interval?: [number, number];
  is_significant: boolean;
}
// Helper Types
export interface QuestionTypeInfo {
  type: QuestionType;
  label: string;
  description: string;
  icon: string; // Icon name
  supportsDisplayLogic: boolean;
  supportsBranchingLogic: boolean;
}

/**
 * All question types with their metadata
 * Note: Deprecated types (radio, checkbox, likert) are not included in this array
 * but are still supported for backwards compatibility with existing questions
 */
export const QUESTION_TYPES: QuestionTypeInfo[] = [
  {
    type: 'single_line_text',
    label: 'Short text',
    description: 'Text, numbers, dates, or emails.',
    icon: 'text',
    supportsDisplayLogic: true,
    supportsBranchingLogic: true,
  },
  {
    type: 'multi_line_text',
    label: 'Long text',
    description: 'Longer, detailed text response.',
    icon: 'align-left',
    supportsDisplayLogic: true,
    supportsBranchingLogic: true,
  },
  {
    type: 'multiple_choice',
    label: 'Selection',
    description: 'Single-select, multi-select, or dropdown from a list of options.',
    icon: 'list-checks',
    supportsDisplayLogic: true,
    supportsBranchingLogic: true,
  },
  {
    type: 'image_choice',
    label: 'Image Choice',
    description: 'Select from images arranged in a visual grid.',
    icon: 'images',
    supportsDisplayLogic: true,
    supportsBranchingLogic: true,
  },
  {
    type: 'yes_no',
    label: 'Yes / No',
    description: 'Simple binary choice with icons or emotions.',
    icon: 'check-circle',
    supportsDisplayLogic: true,
    supportsBranchingLogic: true,
  },
  {
    type: 'opinion_scale',
    label: 'Opinion Scale',
    description: 'Rate on a customizable scale (5-11 points).',
    icon: 'sliders-horizontal',
    supportsDisplayLogic: true,
    supportsBranchingLogic: true,
  },
  {
    type: 'nps',
    label: 'Net Promoter Score',
    description: 'Ask how likely they are to recommend (0-10 scale).',
    icon: 'gauge',
    supportsDisplayLogic: true,
    supportsBranchingLogic: true,
  },
  {
    type: 'matrix',
    label: 'Matrix',
    description: 'Rate multiple items in a grid format.',
    icon: 'grid-3x3',
    supportsDisplayLogic: true,
    supportsBranchingLogic: false,
  },
  {
    type: 'ranking',
    label: 'Ranking',
    description: 'Rank items in order of preference.',
    icon: 'list-ordered',
    supportsDisplayLogic: true,
    supportsBranchingLogic: false,
  },
  {
    type: 'slider',
    label: 'Slider',
    description: 'Drag to select a value on a continuous scale.',
    icon: 'sliders',
    supportsDisplayLogic: true,
    supportsBranchingLogic: true,
  },
  {
    type: 'semantic_differential',
    label: 'Semantic Differential',
    description: 'Rate between bipolar adjectives (e.g., Difficult ↔ Easy).',
    icon: 'arrow-left-right',
    supportsDisplayLogic: true,
    supportsBranchingLogic: true,  // Per-scale logic supported
  },
  {
    type: 'constant_sum',
    label: 'Constant Sum',
    description: 'Distribute points across items to show relative importance.',
    icon: 'pie-chart',
    supportsDisplayLogic: true,
    supportsBranchingLogic: false,  // No branching in v1
  },
  {
    type: 'audio_response',
    label: 'Audio Response',
    description: 'Capture verbal answers with automatic transcription.',
    icon: 'mic',
    supportsDisplayLogic: true,
    supportsBranchingLogic: false,  // No branching for audio responses
  },
];
export function getDefaultQuestionConfig(type: QuestionType): QuestionConfig {
  switch (type) {
    case 'single_line_text':
      return {
        inputType: 'text',
        placeholder: '',
        maxLength: undefined,
        minLength: undefined
      };
    case 'multi_line_text':
      return { placeholder: '', maxLength: undefined, minLength: undefined };

    case 'multiple_choice':
      return {
        mode: 'single',
        options: [{ id: crypto.randomUUID(), label: '' }],
        shuffle: false,
        allowOther: false,
      };

    case 'image_choice':
      return {
        mode: 'single',
        options: [
          { id: crypto.randomUUID(), label: '', imageUrl: null, imageFilename: null },
          { id: crypto.randomUUID(), label: '', imageUrl: null, imageFilename: null },
        ],
        gridColumns: 3,
        showLabels: true,
        shuffle: false,
        allowOther: false,
      };

    case 'yes_no':
      return {
        styleType: 'icons',
        yesLabel: 'Yes',
        noLabel: 'No',
      };

    case 'opinion_scale':
      return {
        scalePoints: 5,
        startAtZero: false,
        scaleType: 'stars',
        leftLabel: 'Strongly disagree',
        middleLabel: 'Neutral',
        rightLabel: 'Strongly agree',
      };

    case 'nps':
      return {
        leftLabel: 'Not at all likely',
        rightLabel: 'Extremely likely',
      };

    case 'matrix':
      return {
        rows: [
          { id: crypto.randomUUID(), label: '' },
          { id: crypto.randomUUID(), label: '' },
          { id: crypto.randomUUID(), label: '' },
        ],
        columns: [
          { id: crypto.randomUUID(), label: '' },
          { id: crypto.randomUUID(), label: '' },
          { id: crypto.randomUUID(), label: '' },
        ],
        allowMultiplePerRow: false,
      };

    case 'ranking':
      return {
        items: [
          { id: crypto.randomUUID(), label: '' },
          { id: crypto.randomUUID(), label: '' },
          { id: crypto.randomUUID(), label: '' },
        ],
        randomOrder: false,
      };

    case 'slider':
      return {
        minValue: 0,
        maxValue: 100,
        step: 1,
        leftLabel: '',
        middleLabel: '',
        rightLabel: '',
        showTicks: false,
        showValue: true,
      };

    case 'semantic_differential':
      return {
        scalePoints: 7,
        scales: [
          { id: crypto.randomUUID(), leftLabel: 'Difficult', rightLabel: 'Easy' },
          { id: crypto.randomUUID(), leftLabel: 'Confusing', rightLabel: 'Clear' },
          { id: crypto.randomUUID(), leftLabel: 'Unappealing', rightLabel: 'Appealing' },
        ],
        showMiddleLabel: true,
        middleLabel: 'Neutral',
        randomizeScales: false,
        showNumbers: false,
        presetId: 'usability',
      };

    case 'constant_sum':
      return {
        items: [
          { id: crypto.randomUUID(), label: '' },
          { id: crypto.randomUUID(), label: '' },
          { id: crypto.randomUUID(), label: '' },
        ],
        totalPoints: 100,
        displayMode: 'inputs',
        showBars: true,
        randomOrder: false,
      };

    case 'audio_response':
      return {
        maxDurationSeconds: 120,        // 2 minutes default
        minDurationSeconds: undefined,  // No minimum by default
        allowRerecord: true,            // Allow re-recording
        transcriptionLanguage: 'multi', // Code-switching support
        showTranscriptPreview: false,   // Don't show transcript to participant
      };
  }
}
// Resume/Partial Response Types
// For saving and restoring participant progress
export interface ResumeTokenData {
  token: string;
  email?: string;
  expires_at: string;
  last_activity_at: string;
}
export interface SurveyProgressState {
  study_id: string;
  participant_id: string;
  session_token: string;
  current_step: FlowStep;
  current_question_index: number;
  responses: Record<string, ResponseValue>;
  last_saved: number; // timestamp
  expires_at: number; // timestamp
}
export function getSurveyProgressKey(studyCode: string, participantId: string): string {
  return `survey_progress_${studyCode}_${participantId}`;
}
// Component State Types (Figma Interactive Components)
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
  componentName?: string
}
