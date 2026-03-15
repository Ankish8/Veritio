// =============================================================================
// Question Type Definitions
// Enums, configs, question model, response values, and helpers

import type { DisplayLogic } from './rules-types'
import type {
  BranchingLogic,
  ScaleBranchingLogic,
  SurveyBranchingLogicUnion,
  AdvancedBranchingRules,
} from './branching-types'


/**
 * The supported question types
 *
 * ⚠️ DEPRECATED TYPES - DO NOT USE:
 * These types are NOT recognized by visualization components and will show "Visualization not available":
 * - 'radio' → Use 'multiple_choice' with config.mode: 'single'
 * - 'dropdown' → Use 'multiple_choice' with config.mode: 'dropdown'
 * - 'checkbox' → Use 'multiple_choice' with config.mode: 'multi'
 * - 'likert' → Use 'opinion_scale' with scalePoints and scaleType config
 */
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
  /** Maximum recording duration in seconds (30-300, default: 120) */
  maxDurationSeconds: number;
  /** Minimum recording duration in seconds (optional, 0-60) */
  minDurationSeconds?: number;
  /** Allow participant to re-record their answer (default: true) */
  allowRerecord: boolean;
  /** Transcription language - 'multi' supports code-switching (default: 'multi') */
  transcriptionLanguage?: AudioTranscriptionLanguage;
  /** Show transcript preview to participant after recording (default: false) */
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
  /** Recording ID (FK to recordings table) */
  recordingId: string;
  /** Unique response ID linking the recording to this question response */
  responseId: string;
  /** Recording duration in milliseconds */
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

// Type aliases for backward compatibility
// StudyFlowQuestionRow and StudyFlowResponseRow were renamed to
// StudyFlowQuestion and StudyFlowResponse respectively.
export type StudyFlowQuestionRow = StudyFlowQuestion
export type StudyFlowResponseRow = StudyFlowResponse
