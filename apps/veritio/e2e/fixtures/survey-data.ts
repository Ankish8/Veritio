/**
 * Comprehensive Survey Test Data Fixtures
 *
 * Covers all 12 question types and advanced features
 */

import { nanoid } from 'nanoid'

// ─────────────────────────────────────────────────────────────────────────────
// Question Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const QUESTION_TYPES = [
  'single_line_text',
  'multi_line_text',
  'multiple_choice',
  'image_choice',
  'yes_no',
  'opinion_scale',
  'nps',
  'matrix',
  'ranking',
  'slider',
  'semantic_differential',
  'constant_sum',
  'audio_response',
] as const

export type QuestionType = (typeof QUESTION_TYPES)[number]

// ─────────────────────────────────────────────────────────────────────────────
// Single Line Text Question Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const singleLineTextQuestions = {
  basic: {
    type: 'single_line_text',
    question: 'What is your name?',
    inputType: 'text',
    placeholder: 'Enter your name',
    isRequired: true,
  },
  numerical: {
    type: 'single_line_text',
    question: 'What is your age?',
    inputType: 'numerical',
    placeholder: 'Enter your age',
    minValue: 18,
    maxValue: 100,
    isRequired: true,
  },
  email: {
    type: 'single_line_text',
    question: 'What is your email address?',
    inputType: 'email',
    placeholder: 'name@example.com',
    isRequired: true,
  },
  date: {
    type: 'single_line_text',
    question: 'What is your birth date?',
    inputType: 'date',
    minDate: '1900-01-01',
    maxDate: '2010-12-31',
    isRequired: false,
  },
  withValidation: {
    type: 'single_line_text',
    question: 'Enter a short bio (10-100 characters)',
    inputType: 'text',
    minLength: 10,
    maxLength: 100,
    isRequired: true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi Line Text Question Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const multiLineTextQuestions = {
  basic: {
    type: 'multi_line_text',
    question: 'Please describe your experience in detail.',
    placeholder: 'Write your thoughts here...',
    isRequired: true,
  },
  withLimits: {
    type: 'multi_line_text',
    question: 'What improvements would you suggest? (50-500 characters)',
    placeholder: 'Your suggestions...',
    minLength: 50,
    maxLength: 500,
    isRequired: true,
  },
  optional: {
    type: 'multi_line_text',
    question: 'Any additional comments? (Optional)',
    placeholder: 'Optional feedback...',
    isRequired: false,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Multiple Choice Question Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const multipleChoiceQuestions = {
  singleMode: {
    type: 'multiple_choice',
    question: 'What is your primary role?',
    mode: 'single',
    options: [
      { id: '1', label: 'Designer', score: 1 },
      { id: '2', label: 'Developer', score: 2 },
      { id: '3', label: 'Product Manager', score: 3 },
      { id: '4', label: 'Researcher', score: 4 },
    ],
    shuffle: false,
    allowOther: false,
    isRequired: true,
  },
  multiMode: {
    type: 'multiple_choice',
    question: 'Which tools do you use? (Select all that apply)',
    mode: 'multi',
    options: [
      { id: '1', label: 'Figma', score: 1 },
      { id: '2', label: 'Sketch', score: 1 },
      { id: '3', label: 'Adobe XD', score: 1 },
      { id: '4', label: 'Framer', score: 1 },
      { id: '5', label: 'InVision', score: 1 },
    ],
    shuffle: true,
    minSelections: 1,
    maxSelections: 3,
    isRequired: true,
  },
  dropdownMode: {
    type: 'multiple_choice',
    question: 'Select your country',
    mode: 'dropdown',
    placeholder: 'Choose a country',
    options: [
      { id: '1', label: 'United States' },
      { id: '2', label: 'United Kingdom' },
      { id: '3', label: 'Canada' },
      { id: '4', label: 'Australia' },
      { id: '5', label: 'Germany' },
    ],
    isRequired: true,
  },
  withOther: {
    type: 'multiple_choice',
    question: 'How did you hear about us?',
    mode: 'single',
    options: [
      { id: '1', label: 'Social Media' },
      { id: '2', label: 'Search Engine' },
      { id: '3', label: 'Friend/Colleague' },
      { id: '4', label: 'Advertisement' },
    ],
    allowOther: true,
    otherLabel: 'Other (please specify)',
    isRequired: true,
  },
  withScoring: {
    type: 'multiple_choice',
    question: 'Rate your experience level',
    mode: 'single',
    options: [
      { id: '1', label: 'Beginner', score: 1 },
      { id: '2', label: 'Intermediate', score: 2 },
      { id: '3', label: 'Advanced', score: 3 },
      { id: '4', label: 'Expert', score: 4 },
    ],
    isRequired: true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Image Choice Question Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const imageChoiceQuestions = {
  singleMode: {
    type: 'image_choice',
    question: 'Which design style do you prefer?',
    mode: 'single',
    gridColumns: 3,
    showLabels: true,
    options: [
      { id: '1', label: 'Minimalist', imageUrl: '/test/minimalist.jpg' },
      { id: '2', label: 'Modern', imageUrl: '/test/modern.jpg' },
      { id: '3', label: 'Classic', imageUrl: '/test/classic.jpg' },
    ],
    isRequired: true,
  },
  multiMode: {
    type: 'image_choice',
    question: 'Select your favorite colors (up to 3)',
    mode: 'multi',
    gridColumns: 4,
    showLabels: true,
    shuffle: true,
    minSelections: 1,
    maxSelections: 3,
    options: [
      { id: '1', label: 'Blue', imageUrl: '/test/blue.jpg' },
      { id: '2', label: 'Green', imageUrl: '/test/green.jpg' },
      { id: '3', label: 'Red', imageUrl: '/test/red.jpg' },
      { id: '4', label: 'Yellow', imageUrl: '/test/yellow.jpg' },
    ],
    isRequired: true,
  },
  withOther: {
    type: 'image_choice',
    question: 'Which icon set do you prefer?',
    mode: 'single',
    gridColumns: 2,
    showLabels: true,
    allowOther: true,
    otherLabel: 'None of these',
    options: [
      { id: '1', label: 'Flat Icons', imageUrl: '/test/flat.jpg' },
      { id: '2', label: '3D Icons', imageUrl: '/test/3d.jpg' },
    ],
    isRequired: true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Yes/No Question Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const yesNoQuestions = {
  buttons: {
    type: 'yes_no',
    question: 'Would you recommend our product to others?',
    styleType: 'buttons',
    yesLabel: 'Yes',
    noLabel: 'No',
    isRequired: true,
  },
  icons: {
    type: 'yes_no',
    question: 'Did you find what you were looking for?',
    styleType: 'icons',
    yesLabel: 'Yes, I found it',
    noLabel: 'No, I did not',
    isRequired: true,
  },
  emotions: {
    type: 'yes_no',
    question: 'Are you satisfied with the result?',
    styleType: 'emotions',
    yesLabel: 'Satisfied',
    noLabel: 'Not satisfied',
    isRequired: true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Opinion Scale Question Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const opinionScaleQuestions = {
  numerical5: {
    type: 'opinion_scale',
    question: 'How would you rate your overall experience?',
    scalePoints: 5,
    startAtZero: false,
    scaleType: 'numerical',
    leftLabel: 'Very Poor',
    middleLabel: 'Neutral',
    rightLabel: 'Excellent',
    isRequired: true,
  },
  numerical7: {
    type: 'opinion_scale',
    question: 'How strongly do you agree with this statement?',
    scalePoints: 7,
    startAtZero: false,
    scaleType: 'numerical',
    leftLabel: 'Strongly Disagree',
    middleLabel: 'Neither Agree nor Disagree',
    rightLabel: 'Strongly Agree',
    isRequired: true,
  },
  stars: {
    type: 'opinion_scale',
    question: 'Rate our customer service',
    scalePoints: 5,
    startAtZero: false,
    scaleType: 'stars',
    leftLabel: '1 Star',
    rightLabel: '5 Stars',
    isRequired: true,
  },
  emotions: {
    type: 'opinion_scale',
    question: 'How do you feel about this feature?',
    scalePoints: 5,
    startAtZero: false,
    scaleType: 'emotions',
    leftLabel: 'Very Unhappy',
    rightLabel: 'Very Happy',
    isRequired: true,
  },
  zeroStart: {
    type: 'opinion_scale',
    question: 'Rate from 0 to 10',
    scalePoints: 11,
    startAtZero: true,
    scaleType: 'numerical',
    leftLabel: '0 - Worst',
    rightLabel: '10 - Best',
    isRequired: true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// NPS Question Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const npsQuestions = {
  standard: {
    type: 'nps',
    question: 'How likely are you to recommend our product to a friend or colleague?',
    leftLabel: 'Not at all likely',
    rightLabel: 'Extremely likely',
    isRequired: true,
  },
  customLabels: {
    type: 'nps',
    question: 'How likely are you to recommend us?',
    leftLabel: '0 - Would never recommend',
    rightLabel: '10 - Would definitely recommend',
    isRequired: true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Matrix Question Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const matrixQuestions = {
  singlePerRow: {
    type: 'matrix',
    question: 'Rate each aspect of our service',
    allowMultiplePerRow: false,
    rows: [
      { id: 'r1', label: 'Speed' },
      { id: 'r2', label: 'Quality' },
      { id: 'r3', label: 'Value' },
      { id: 'r4', label: 'Support' },
    ],
    columns: [
      { id: 'c1', label: 'Poor' },
      { id: 'c2', label: 'Fair' },
      { id: 'c3', label: 'Good' },
      { id: 'c4', label: 'Excellent' },
    ],
    isRequired: true,
  },
  multiPerRow: {
    type: 'matrix',
    question: 'Which features do you use in each context? (Select all that apply)',
    allowMultiplePerRow: true,
    rows: [
      { id: 'r1', label: 'At Work' },
      { id: 'r2', label: 'At Home' },
      { id: 'r3', label: 'On Mobile' },
    ],
    columns: [
      { id: 'c1', label: 'Search' },
      { id: 'c2', label: 'Filter' },
      { id: 'c3', label: 'Export' },
      { id: 'c4', label: 'Share' },
    ],
    isRequired: true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Ranking Question Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const rankingQuestions = {
  basic: {
    type: 'ranking',
    question: 'Rank these features in order of importance (most important first)',
    items: [
      { id: '1', label: 'Speed' },
      { id: '2', label: 'Reliability' },
      { id: '3', label: 'Ease of Use' },
      { id: '4', label: 'Price' },
      { id: '5', label: 'Support' },
    ],
    randomOrder: false,
    isRequired: true,
  },
  randomized: {
    type: 'ranking',
    question: 'Rank these priorities',
    items: [
      { id: '1', label: 'Cost Savings' },
      { id: '2', label: 'Time Efficiency' },
      { id: '3', label: 'Quality Improvement' },
      { id: '4', label: 'User Satisfaction' },
    ],
    randomOrder: true,
    isRequired: true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Slider Question Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const sliderQuestions = {
  percentage: {
    type: 'slider',
    question: 'What percentage of your work involves this task?',
    minValue: 0,
    maxValue: 100,
    step: 5,
    leftLabel: '0%',
    middleLabel: '50%',
    rightLabel: '100%',
    showTicks: true,
    showValue: true,
    isRequired: true,
  },
  satisfaction: {
    type: 'slider',
    question: 'How satisfied are you on a scale of 1-10?',
    minValue: 1,
    maxValue: 10,
    step: 1,
    leftLabel: 'Not at all',
    rightLabel: 'Completely',
    showTicks: true,
    showValue: true,
    isRequired: true,
  },
  noTicks: {
    type: 'slider',
    question: 'Drag to indicate your preference',
    minValue: 0,
    maxValue: 100,
    step: 1,
    leftLabel: 'Low',
    rightLabel: 'High',
    showTicks: false,
    showValue: true,
    isRequired: true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Semantic Differential Question Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const semanticDifferentialQuestions = {
  usability: {
    type: 'semantic_differential',
    question: 'Rate the product on these dimensions',
    scalePoints: 7,
    showMiddleLabel: true,
    middleLabel: 'Neutral',
    showNumbers: false,
    presetId: 'usability',
    scales: [
      { id: 's1', leftLabel: 'Difficult', rightLabel: 'Easy', weight: 1 },
      { id: 's2', leftLabel: 'Confusing', rightLabel: 'Clear', weight: 1 },
      { id: 's3', leftLabel: 'Slow', rightLabel: 'Fast', weight: 1 },
      { id: 's4', leftLabel: 'Frustrating', rightLabel: 'Satisfying', weight: 1 },
    ],
    isRequired: true,
  },
  brand: {
    type: 'semantic_differential',
    question: 'How would you describe our brand?',
    scalePoints: 5,
    showMiddleLabel: true,
    middleLabel: 'Neutral',
    showNumbers: true,
    randomizeScales: true,
    presetId: 'brand_perception',
    scales: [
      { id: 's1', leftLabel: 'Traditional', rightLabel: 'Modern', weight: 1 },
      { id: 's2', leftLabel: 'Boring', rightLabel: 'Exciting', weight: 1 },
      { id: 's3', leftLabel: 'Unreliable', rightLabel: 'Reliable', weight: 1 },
    ],
    isRequired: true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Constant Sum Question Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const constantSumQuestions = {
  percentage: {
    type: 'constant_sum',
    question: 'Allocate 100 points across these priorities based on importance',
    totalPoints: 100,
    displayMode: 'inputs',
    showBars: true,
    randomOrder: false,
    items: [
      { id: '1', label: 'Quality', description: 'Product quality and reliability' },
      { id: '2', label: 'Price', description: 'Cost effectiveness' },
      { id: '3', label: 'Speed', description: 'Delivery and response time' },
      { id: '4', label: 'Support', description: 'Customer service' },
    ],
    isRequired: true,
  },
  sliders: {
    type: 'constant_sum',
    question: 'Distribute 100 points using sliders',
    totalPoints: 100,
    displayMode: 'sliders',
    showBars: true,
    randomOrder: true,
    items: [
      { id: '1', label: 'Feature A' },
      { id: '2', label: 'Feature B' },
      { id: '3', label: 'Feature C' },
    ],
    isRequired: true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Audio Response Question Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const audioResponseQuestions = {
  basic: {
    type: 'audio_response',
    question: 'Please describe your experience in your own words',
    maxDurationSeconds: 120,
    allowRerecord: true,
    transcriptionLanguage: 'en',
    showTranscriptPreview: true,
    isRequired: true,
  },
  short: {
    type: 'audio_response',
    question: 'In 30 seconds or less, what is your main feedback?',
    maxDurationSeconds: 30,
    minDurationSeconds: 5,
    allowRerecord: true,
    transcriptionLanguage: 'en',
    showTranscriptPreview: false,
    isRequired: true,
  },
  multilingual: {
    type: 'audio_response',
    question: 'Record your feedback in any language',
    maxDurationSeconds: 180,
    allowRerecord: true,
    transcriptionLanguage: 'multi',
    showTranscriptPreview: true,
    isRequired: false,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Branching Logic Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const branchingLogicScenarios = {
  choiceBased: {
    name: 'Choice-based Skip',
    description: 'Skip to different questions based on single choice answer',
    triggerQuestion: multipleChoiceQuestions.singleMode,
    rules: [
      { optionId: '1', target: 'skip_to_question', targetId: 'designer_followup' },
      { optionId: '2', target: 'skip_to_question', targetId: 'developer_followup' },
      { optionId: '3', target: 'skip_to_section', targetId: 'pm_section' },
      { optionId: '4', target: 'continue' },
    ],
  },
  numericBased: {
    name: 'Numeric-based Skip',
    description: 'Skip based on NPS score',
    triggerQuestion: npsQuestions.standard,
    rules: [
      { operator: 'less_than', value: 7, target: 'skip_to_question', targetId: 'improvement_feedback' },
      { operator: 'greater_than_or_equals', value: 9, target: 'skip_to_question', targetId: 'testimonial_request' },
    ],
  },
  textBased: {
    name: 'Text-based Skip',
    description: 'Skip based on whether text was answered',
    triggerQuestion: multiLineTextQuestions.optional,
    rules: [
      { condition: 'is_answered', target: 'skip_to_question', targetId: 'followup_question' },
      { condition: 'is_empty', target: 'skip_to_section', targetId: 'end_section' },
    ],
  },
  endSurvey: {
    name: 'Screening - End Survey',
    description: 'End survey for unqualified participants',
    triggerQuestion: yesNoQuestions.buttons,
    rules: [
      { answer: false, target: 'end_survey', redirectUrl: 'https://example.com/thank-you' },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Display Logic Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const displayLogicScenarios = {
  showOnEquals: {
    name: 'Show if equals',
    condition: {
      sourceQuestionId: 'role_question',
      operator: 'equals',
      value: 'Designer',
      action: 'show',
    },
  },
  hideOnContains: {
    name: 'Hide if contains',
    condition: {
      sourceQuestionId: 'tools_question',
      operator: 'contains',
      value: 'Figma',
      action: 'hide',
    },
  },
  showOnAnswered: {
    name: 'Show if answered',
    condition: {
      sourceQuestionId: 'optional_comment',
      operator: 'is_answered',
      action: 'show',
    },
  },
  showOnNumericRange: {
    name: 'Show if NPS >= 9',
    condition: {
      sourceQuestionId: 'nps_question',
      operator: 'greater_than_or_equals',
      value: 9,
      action: 'show',
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// A/B Testing Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const abTestingScenarios = {
  questionVariant: {
    name: 'Question Wording Test',
    entityType: 'question',
    variants: [
      { id: 'A', question: 'How satisfied are you with our product?' },
      { id: 'B', question: 'How would you rate your experience with our product?' },
    ],
    splitPercentage: 50,
  },
  sectionVariant: {
    name: 'Section Order Test',
    entityType: 'section',
    variants: [
      { id: 'A', sections: ['demographics', 'experience', 'feedback'] },
      { id: 'B', sections: ['feedback', 'experience', 'demographics'] },
    ],
    splitPercentage: 50,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const scoringScenarios = {
  sumScoring: {
    name: 'Experience Score (Sum)',
    aggregationType: 'sum',
    questions: [
      { questionId: 'q1', weight: 1 },
      { questionId: 'q2', weight: 2 },
      { questionId: 'q3', weight: 1 },
    ],
  },
  averageScoring: {
    name: 'Satisfaction Index (Average)',
    aggregationType: 'average',
    questions: [
      { questionId: 'satisfaction_1', weight: 1 },
      { questionId: 'satisfaction_2', weight: 1 },
      { questionId: 'satisfaction_3', weight: 1 },
    ],
  },
  classification: {
    name: 'User Segment Classification',
    type: 'classification',
    scoreVariable: 'experience_score',
    ranges: [
      { min: 0, max: 5, label: 'Beginner' },
      { min: 6, max: 10, label: 'Intermediate' },
      { min: 11, max: 15, label: 'Advanced' },
      { min: 16, max: 20, label: 'Expert' },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Section & Flow Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const sectionSettings = {
  onePerPage: {
    pageMode: 'one_per_page',
    showProgressBar: true,
    autoAdvance: true,
    randomizeQuestions: false,
    allowSkipQuestions: false,
  },
  allOnOne: {
    pageMode: 'all_on_one',
    showProgressBar: true,
    autoAdvance: false,
    randomizeQuestions: false,
    allowSkipQuestions: true,
  },
  randomized: {
    pageMode: 'one_per_page',
    showProgressBar: true,
    autoAdvance: false,
    randomizeQuestions: true,
    allowSkipQuestions: false,
  },
  withIntro: {
    showIntro: true,
    introTitle: 'Welcome to the Survey',
    introMessage: 'This survey will take approximately 5 minutes to complete.',
    pageMode: 'one_per_page',
    showProgressBar: true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Complete Survey Templates
// ─────────────────────────────────────────────────────────────────────────────

export function createCompleteSurvey(name?: string) {
  return {
    name: name || `E2E Test Survey ${nanoid(6)}`,
    description: 'Comprehensive survey for E2E testing',
    sections: [
      {
        name: 'Demographics',
        settings: sectionSettings.onePerPage,
        questions: [
          singleLineTextQuestions.basic,
          singleLineTextQuestions.email,
          multipleChoiceQuestions.dropdownMode,
        ],
      },
      {
        name: 'Experience',
        settings: sectionSettings.onePerPage,
        questions: [
          multipleChoiceQuestions.singleMode,
          opinionScaleQuestions.numerical5,
          npsQuestions.standard,
        ],
      },
      {
        name: 'Detailed Feedback',
        settings: sectionSettings.allOnOne,
        questions: [
          matrixQuestions.singlePerRow,
          rankingQuestions.basic,
          multiLineTextQuestions.basic,
        ],
      },
    ],
  }
}

export function createBranchingSurvey(name?: string) {
  return {
    name: name || `Branching Survey ${nanoid(6)}`,
    description: 'Survey with branching logic for E2E testing',
    hasSkipLogic: true,
    hasDisplayLogic: true,
  }
}

export function createScoredSurvey(name?: string) {
  return {
    name: name || `Scored Survey ${nanoid(6)}`,
    description: 'Survey with scoring for E2E testing',
    hasScoring: true,
    scoringVariables: ['experience_score', 'satisfaction_index'],
  }
}
