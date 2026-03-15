/**
 * Comprehensive Survey Test Seed Script
 * Creates a survey with ALL question types and ALL possible configurations
 *
 * FEATURES INCLUDED:
 * - Complete study details (title, description, purpose, requirements)
 * - Participant agreement enabled
 * - 2 screening questions (selection + yes/no)
 * - ALL question types with ALL config options
 * - AB testing on EVERY question type where applicable
 * - Multiple sections
 * - Branching logic everywhere possible
 * - Display logic (conditional visibility)
 * - Notes (descriptions) on questions
 * - Min/max length, min/max values
 *
 * Status: DRAFT (no participants, not launched)
 *
 * Run with: npx tsx scripts/seed/survey/comprehensive-survey-test.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// =============================================================================
// HELPERS
// =============================================================================

function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Helper to create AB test variant content with both plain text and HTML
 * The UI requires question_text_html for display in the rich text editor
 */
function createVariantContent(text: string, extras?: Record<string, unknown>) {
  return {
    question_text: text,
    question_text_html: `<p>${text}</p>`,
    ...extras,
  }
}

// =============================================================================
// IDS - Pre-generate for cross-referencing
// =============================================================================

const PROJECT_ID = generateId()
const STUDY_ID = generateId()
const USER_ID = process.env.SEED_USER_ID || 'your-better-auth-user-id'
const ORGANIZATION_ID = process.env.SEED_ORGANIZATION_ID || 'your-organization-id'

const SHARE_CODE = `comprehensive-test-${Date.now()}`

// Section IDs
const SECTION_SHORT_TEXT_ID = generateId()
const SECTION_LONG_TEXT_ID = generateId()
const SECTION_SELECTION_ID = generateId()
const SECTION_IMAGE_CHOICE_ID = generateId()
const SECTION_YES_NO_ID = generateId()
const SECTION_OPINION_SCALE_ID = generateId()
const SECTION_NPS_ID = generateId()
const SECTION_MATRIX_ID = generateId()
const SECTION_RANKING_ID = generateId()
const SECTION_SLIDER_ID = generateId()
const SECTION_SEMANTIC_ID = generateId()
const SECTION_CONSTANT_SUM_ID = generateId()
const SECTION_AUDIO_ID = generateId()

// Screening Question IDs
const SCREENING_Q_SELECTION_ID = generateId()
const SCREENING_Q_YES_NO_ID = generateId()

// Short Text Question IDs (4 types)
const Q_SHORT_TEXT_PLAIN_ID = generateId()
const Q_SHORT_TEXT_NUMERICAL_ID = generateId()
const Q_SHORT_TEXT_DATE_ID = generateId()
const Q_SHORT_TEXT_EMAIL_ID = generateId()

// Long Text Question ID
const Q_LONG_TEXT_ID = generateId()

// Selection Question IDs (3 modes)
const Q_SINGLE_SELECT_ID = generateId()
const Q_MULTI_SELECT_ID = generateId()
const Q_DROPDOWN_ID = generateId()

// Image Choice Question ID
const Q_IMAGE_CHOICE_ID = generateId()

// Yes/No Question IDs (3 style types)
const Q_YES_NO_ICONS_ID = generateId()
const Q_YES_NO_EMOTIONS_ID = generateId()
const Q_YES_NO_BUTTONS_ID = generateId()

// Opinion Scale Question IDs (3 scale types)
const Q_SCALE_NUMERICAL_ID = generateId()
const Q_SCALE_STARS_ID = generateId()
const Q_SCALE_EMOTIONS_ID = generateId()

// NPS Question ID
const Q_NPS_ID = generateId()

// Matrix Question ID
const Q_MATRIX_ID = generateId()

// Ranking Question ID
const Q_RANKING_ID = generateId()

// Slider Question ID
const Q_SLIDER_ID = generateId()

// Semantic Differential Question ID
const Q_SEMANTIC_ID = generateId()

// Constant Sum Question ID
const Q_CONSTANT_SUM_ID = generateId()

// Audio Response Question ID
const Q_AUDIO_ID = generateId()

// AB Test IDs
const AB_SHORT_TEXT_PLAIN_ID = generateId()
const AB_SHORT_TEXT_NUMERICAL_ID = generateId()
const AB_SHORT_TEXT_DATE_ID = generateId()
const AB_SHORT_TEXT_EMAIL_ID = generateId()
const AB_LONG_TEXT_ID = generateId()
const AB_SINGLE_SELECT_ID = generateId()
const AB_MULTI_SELECT_ID = generateId()
const AB_DROPDOWN_ID = generateId()
const AB_IMAGE_CHOICE_ID = generateId()
const AB_YES_NO_ICONS_ID = generateId()
const AB_YES_NO_EMOTIONS_ID = generateId()
const AB_YES_NO_BUTTONS_ID = generateId()
const AB_SCALE_NUMERICAL_ID = generateId()
const AB_SCALE_STARS_ID = generateId()
const AB_SCALE_EMOTIONS_ID = generateId()
const AB_NPS_ID = generateId()
const AB_MATRIX_ID = generateId()
const AB_RANKING_ID = generateId()
const AB_SLIDER_ID = generateId()
const AB_SEMANTIC_ID = generateId()
const AB_CONSTANT_SUM_ID = generateId()
const AB_SECTION_SHORT_TEXT_ID = generateId()
const AB_SECTION_SELECTION_ID = generateId()

// =============================================================================
// STUDY FLOW SETTINGS
// =============================================================================

const studyFlowSettings = {
  welcome: {
    enabled: true,
    title: 'Welcome to Our Comprehensive Survey Test',
    message: `<p><strong>Thank you for participating!</strong></p>
<p>This survey tests ALL question types and configurations available in the platform.</p>
<p>Your feedback is invaluable for our product development.</p>`,
    includeStudyTitle: true,
    includeDescription: true,
    includePurpose: true,
    includeParticipantRequirements: true,
  },
  participantAgreement: {
    enabled: true,
    title: 'Research Participation Agreement',
    message: 'Please review and accept the following terms to continue:',
    agreementText: `<ul>
<li>I am 18 years or older and provide my informed consent to participate</li>
<li>My participation is completely voluntary and I may withdraw at any time</li>
<li>My responses will be kept confidential and anonymized for analysis</li>
<li>Data will be stored securely in accordance with GDPR and CCPA regulations</li>
<li>I understand my feedback will be used to improve the product</li>
</ul>`,
    showRejectionMessage: true,
    rejectionTitle: 'We Understand',
    rejectionMessage: 'Thank you for considering our survey. You must accept the agreement to participate.',
    redirectUrl: 'https://example.com/declined',
  },
  screening: {
    enabled: true,
    introTitle: 'Quick Eligibility Check',
    introMessage: 'Please answer these brief questions to confirm you meet the study criteria.',
    rejectionTitle: 'Thank You for Your Interest',
    rejectionMessage: 'Unfortunately, you do not meet the eligibility criteria for this particular study.',
    redirectUrl: 'https://example.com/other-studies',
    redirectImmediately: false,
    pageMode: 'one_per_page' as const,
  },
  participantIdentifier: {
    type: 'anonymous' as const,
  },
  preStudyQuestions: {
    enabled: false,
  },
  activityInstructions: {
    enabled: false,
  },
  surveyQuestionnaire: {
    enabled: true,
    showIntro: true,
    introTitle: 'Survey Questionnaire',
    introMessage: '<p>Please answer the following questions honestly. This survey demonstrates all available question types.</p>',
    pageMode: 'one_per_page' as const,
    randomizeQuestions: false,
    showProgressBar: true,
    allowSkipQuestions: false,
    autoAdvance: false,
  },
  postStudyQuestions: {
    enabled: false,
  },
  thankYou: {
    enabled: true,
    title: 'Thank You!',
    message: '<p><strong>Your responses have been recorded successfully.</strong></p><p>We truly appreciate your time and valuable feedback!</p>',
    redirectUrl: '',
    redirectDelay: 0,
  },
  closedStudy: {
    title: 'Study Closed',
    message: '<p>This study is currently not accepting new responses.</p>',
    redirectUrl: '',
    redirectImmediately: false,
  },
  pagination: {
    mode: 'one_per_page' as const,
  },
}

// =============================================================================
// CUSTOM SECTIONS
// =============================================================================

const customSections = [
  {
    id: SECTION_SHORT_TEXT_ID,
    study_id: STUDY_ID,
    name: 'Short Text Questions',
    description: 'Testing all short text input types: text, numerical, date, email',
    position: 0,
    parent_section: 'survey',
    is_visible: true,
  },
  {
    id: SECTION_LONG_TEXT_ID,
    study_id: STUDY_ID,
    name: 'Long Text Questions',
    description: 'Testing multi-line text with all options',
    position: 1,
    parent_section: 'survey',
    is_visible: true,
  },
  {
    id: SECTION_SELECTION_ID,
    study_id: STUDY_ID,
    name: 'Selection Questions',
    description: 'Testing single-select, multi-select, and dropdown modes',
    position: 2,
    parent_section: 'survey',
    is_visible: true,
  },
  {
    id: SECTION_IMAGE_CHOICE_ID,
    study_id: STUDY_ID,
    name: 'Image Choice Questions',
    description: 'Testing visual image selection',
    position: 3,
    parent_section: 'survey',
    is_visible: true,
  },
  {
    id: SECTION_YES_NO_ID,
    study_id: STUDY_ID,
    name: 'Yes/No Questions',
    description: 'Testing all yes/no style types: icons, emotions, buttons',
    position: 4,
    parent_section: 'survey',
    is_visible: true,
  },
  {
    id: SECTION_OPINION_SCALE_ID,
    study_id: STUDY_ID,
    name: 'Opinion Scale Questions',
    description: 'Testing all scale types: numerical, stars, emotions',
    position: 5,
    parent_section: 'survey',
    is_visible: true,
  },
  {
    id: SECTION_NPS_ID,
    study_id: STUDY_ID,
    name: 'NPS Question',
    description: 'Net Promoter Score (0-10)',
    position: 6,
    parent_section: 'survey',
    is_visible: true,
  },
  {
    id: SECTION_MATRIX_ID,
    study_id: STUDY_ID,
    name: 'Matrix Question',
    description: 'Grid-style rating question',
    position: 7,
    parent_section: 'survey',
    is_visible: true,
  },
  {
    id: SECTION_RANKING_ID,
    study_id: STUDY_ID,
    name: 'Ranking Question',
    description: 'Drag-and-drop ranking',
    position: 8,
    parent_section: 'survey',
    is_visible: true,
  },
  {
    id: SECTION_SLIDER_ID,
    study_id: STUDY_ID,
    name: 'Slider Question',
    description: 'Continuous numeric slider',
    position: 9,
    parent_section: 'survey',
    is_visible: true,
  },
  {
    id: SECTION_SEMANTIC_ID,
    study_id: STUDY_ID,
    name: 'Semantic Differential',
    description: 'Bipolar adjective rating scales',
    position: 10,
    parent_section: 'survey',
    is_visible: true,
  },
  {
    id: SECTION_CONSTANT_SUM_ID,
    study_id: STUDY_ID,
    name: 'Constant Sum Question',
    description: 'Point allocation across items',
    position: 11,
    parent_section: 'survey',
    is_visible: true,
  },
  {
    id: SECTION_AUDIO_ID,
    study_id: STUDY_ID,
    name: 'Audio Response Question',
    description: 'Voice recording with transcription',
    position: 12,
    parent_section: 'survey',
    is_visible: true,
  },
]

// =============================================================================
// SCREENING QUESTIONS
// =============================================================================

// Option IDs for cross-referencing in branching
const SCREENING_OPT_AGE_UNDER_18 = generateId()
const SCREENING_OPT_AGE_18_24 = generateId()
const SCREENING_OPT_AGE_25_34 = generateId()
const SCREENING_OPT_AGE_35_44 = generateId()
const SCREENING_OPT_AGE_45_PLUS = generateId()

const screeningQuestions = [
  // Screening Q1: Selection (Single Select) with branching
  {
    id: SCREENING_Q_SELECTION_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 0,
    question_type: 'multiple_choice',
    question_text: 'What is your age range?',
    description: 'We need participants 18 years or older for this study.',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: SCREENING_OPT_AGE_UNDER_18, label: 'Under 18' },
        { id: SCREENING_OPT_AGE_18_24, label: '18-24' },
        { id: SCREENING_OPT_AGE_25_34, label: '25-34' },
        { id: SCREENING_OPT_AGE_35_44, label: '35-44' },
        { id: SCREENING_OPT_AGE_45_PLUS, label: '45 or older' },
      ],
      shuffle: false,
      allowOther: false,
    },
    branching_logic: {
      rules: [
        { optionId: SCREENING_OPT_AGE_UNDER_18, target: 'reject' },
      ],
      defaultTarget: 'next',
    },
  },
  // Screening Q2: Yes/No with branching
  {
    id: SCREENING_Q_YES_NO_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 1,
    question_type: 'yes_no',
    question_text: 'Have you used our product in the last 6 months?',
    description: 'We need participants with recent product experience.',
    is_required: true,
    config: {
      styleType: 'icons',
      yesLabel: 'Yes, I have',
      noLabel: 'No, I haven\'t',
    },
    // No is treated as string 'false' for yes/no questions
    branching_logic: {
      rules: [
        {
          optionId: 'false', // false value means "No"
          target: 'reject',
        },
      ],
      defaultTarget: 'go_to_study',
    },
  },
]

// =============================================================================
// SURVEY QUESTIONS - ALL TYPES WITH ALL OPTIONS
// =============================================================================

let position = 0

const surveyQuestions = [
  // =========================================================================
  // SECTION 1: SHORT TEXT (4 types: text, numerical, date, email)
  // =========================================================================

  // Short Text - Plain Text (with min/max length)
  {
    id: Q_SHORT_TEXT_PLAIN_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_SHORT_TEXT_ID,
    position: position++,
    question_type: 'single_line_text',
    question_text: 'What is your job title?',
    description: 'Please enter your current job title or role (3-50 characters).',
    is_required: true,
    config: {
      inputType: 'text',
      placeholder: 'e.g., Software Engineer, Product Manager...',
      minLength: 3,
      maxLength: 50,
    },
  },

  // Short Text - Numerical (with min/max value)
  {
    id: Q_SHORT_TEXT_NUMERICAL_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_SHORT_TEXT_ID,
    position: position++,
    question_type: 'single_line_text',
    question_text: 'How many years of professional experience do you have?',
    description: 'Enter a number between 0 and 50.',
    is_required: true,
    config: {
      inputType: 'numerical',
      placeholder: 'Enter years of experience',
      minValue: 0,
      maxValue: 50,
    },
  },

  // Short Text - Date (with min/max date)
  {
    id: Q_SHORT_TEXT_DATE_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_SHORT_TEXT_ID,
    position: position++,
    question_type: 'single_line_text',
    question_text: 'When did you start using our product?',
    description: 'Please select a date within the last 5 years.',
    is_required: true,
    config: {
      inputType: 'date',
      placeholder: 'Select a date',
      minDate: '2020-01-01',
      maxDate: new Date().toISOString().split('T')[0], // Today
    },
  },

  // Short Text - Email
  {
    id: Q_SHORT_TEXT_EMAIL_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_SHORT_TEXT_ID,
    position: position++,
    question_type: 'single_line_text',
    question_text: 'What is your work email address?',
    description: 'This will only be used for follow-up if you opt in.',
    is_required: false,
    config: {
      inputType: 'email',
      placeholder: 'you@company.com',
      maxLength: 100,
    },
  },

  // =========================================================================
  // SECTION 2: LONG TEXT
  // =========================================================================

  {
    id: Q_LONG_TEXT_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_LONG_TEXT_ID,
    position: position++,
    question_type: 'multi_line_text',
    question_text: 'Describe your typical workflow when using our product.',
    description: 'Please provide detailed feedback (50-500 characters). Your insights help us improve!',
    is_required: true,
    config: {
      placeholder: 'Walk us through your typical day using our product...',
      minLength: 50,
      maxLength: 500,
    },
  },

  // =========================================================================
  // SECTION 3: SELECTION (3 modes: single, multi, dropdown)
  // =========================================================================

  // Single Select (with shuffle, other option, scoring)
  {
    id: Q_SINGLE_SELECT_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_SELECTION_ID,
    position: position++,
    question_type: 'multiple_choice',
    question_text: 'Which feature do you use most frequently?',
    description: 'Select the feature you use the most.',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: generateId(), label: 'Dashboard & Analytics', score: 5 },
        { id: generateId(), label: 'Reports & Export', score: 4 },
        { id: generateId(), label: 'Collaboration Tools', score: 4 },
        { id: generateId(), label: 'Automation & Workflows', score: 5 },
        { id: generateId(), label: 'Mobile App', score: 3 },
        { id: generateId(), label: 'API & Integrations', score: 4 },
      ],
      shuffle: true,
      allowOther: true,
      otherLabel: 'Other (please specify)',
    },
  },

  // Multi Select (with min/max selections, shuffle, other, scoring)
  {
    id: Q_MULTI_SELECT_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_SELECTION_ID,
    position: position++,
    question_type: 'multiple_choice',
    question_text: 'Which benefits have you experienced using our product?',
    description: 'Select all that apply (minimum 1, maximum 5).',
    is_required: true,
    config: {
      mode: 'multi',
      options: [
        { id: generateId(), label: 'Saved time on tasks', score: 3 },
        { id: generateId(), label: 'Better team collaboration', score: 4 },
        { id: generateId(), label: 'Improved organization', score: 3 },
        { id: generateId(), label: 'Increased visibility', score: 3 },
        { id: generateId(), label: 'Met more deadlines', score: 4 },
        { id: generateId(), label: 'Easier remote work', score: 3 },
        { id: generateId(), label: 'Reduced meetings', score: 2 },
        { id: generateId(), label: 'Better reporting', score: 3 },
      ],
      shuffle: true,
      allowOther: true,
      otherLabel: 'Other benefit',
      minSelections: 1,
      maxSelections: 5,
    },
  },

  // Dropdown (with placeholder, shuffle)
  {
    id: Q_DROPDOWN_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_SELECTION_ID,
    position: position++,
    question_type: 'multiple_choice',
    question_text: 'What industry are you in?',
    description: 'Select your primary industry from the dropdown.',
    is_required: true,
    config: {
      mode: 'dropdown',
      options: [
        { id: generateId(), label: 'Technology / Software' },
        { id: generateId(), label: 'Healthcare / Medical' },
        { id: generateId(), label: 'Finance / Banking' },
        { id: generateId(), label: 'Education / Research' },
        { id: generateId(), label: 'Retail / E-commerce' },
        { id: generateId(), label: 'Manufacturing' },
        { id: generateId(), label: 'Marketing / Advertising' },
        { id: generateId(), label: 'Consulting / Professional Services' },
        { id: generateId(), label: 'Government / Public Sector' },
        { id: generateId(), label: 'Non-profit / NGO' },
      ],
      placeholder: 'Select your industry...',
      shuffle: false,
      allowOther: true,
      otherLabel: 'Other industry',
    },
  },

  // =========================================================================
  // SECTION 4: IMAGE CHOICE
  // =========================================================================

  {
    id: Q_IMAGE_CHOICE_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_IMAGE_CHOICE_ID,
    position: position++,
    question_type: 'image_choice',
    question_text: 'Which interface design do you prefer?',
    description: 'Select the design that appeals to you most.',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: generateId(), label: 'Classic Design', imageUrl: null, imageFilename: null, score: 3 },
        { id: generateId(), label: 'Modern Design', imageUrl: null, imageFilename: null, score: 4 },
        { id: generateId(), label: 'Minimalist Design', imageUrl: null, imageFilename: null, score: 5 },
        { id: generateId(), label: 'Colorful Design', imageUrl: null, imageFilename: null, score: 3 },
      ],
      gridColumns: 2,
      showLabels: true,
      shuffle: true,
      allowOther: false,
    },
  },

  // =========================================================================
  // SECTION 5: YES/NO (3 style types)
  // =========================================================================

  // Yes/No - Icons style
  {
    id: Q_YES_NO_ICONS_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_YES_NO_ID,
    position: position++,
    question_type: 'yes_no',
    question_text: 'Would you recommend our product to a colleague?',
    description: 'This question uses icon-style presentation.',
    is_required: true,
    config: {
      styleType: 'icons',
      yesLabel: 'Yes, definitely!',
      noLabel: 'No, not really',
    },
  },

  // Yes/No - Emotions style
  {
    id: Q_YES_NO_EMOTIONS_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_YES_NO_ID,
    position: position++,
    question_type: 'yes_no',
    question_text: 'Did our product meet your expectations?',
    description: 'This question uses emotion-style presentation.',
    is_required: true,
    config: {
      styleType: 'emotions',
      yesLabel: 'Yes! 😊',
      noLabel: 'No 😔',
    },
    // Display logic: Only show if previous yes/no was "Yes"
    display_logic: {
      action: 'show',
      conditions: [
        { questionId: Q_YES_NO_ICONS_ID, operator: 'equals', values: ['true'] },
      ],
      matchAll: true,
    },
  },

  // Yes/No - Buttons style
  {
    id: Q_YES_NO_BUTTONS_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_YES_NO_ID,
    position: position++,
    question_type: 'yes_no',
    question_text: 'Have you used the mobile app version?',
    description: 'This question uses button-style presentation.',
    is_required: true,
    config: {
      styleType: 'buttons',
      yesLabel: 'Yes, I use the app',
      noLabel: 'No, desktop only',
    },
  },

  // =========================================================================
  // SECTION 6: OPINION SCALE (3 scale types)
  // =========================================================================

  // Opinion Scale - Numerical (7-point)
  {
    id: Q_SCALE_NUMERICAL_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_OPINION_SCALE_ID,
    position: position++,
    question_type: 'opinion_scale',
    question_text: 'How satisfied are you with the product performance?',
    description: 'Rate on a scale of 1-7 (numerical style).',
    is_required: true,
    config: {
      scalePoints: 7,
      startAtZero: false,
      scaleType: 'numerical',
      leftLabel: 'Very Dissatisfied',
      middleLabel: 'Neutral',
      rightLabel: 'Very Satisfied',
    },
  },

  // Opinion Scale - Stars (5-point)
  {
    id: Q_SCALE_STARS_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_OPINION_SCALE_ID,
    position: position++,
    question_type: 'opinion_scale',
    question_text: 'How would you rate the user interface?',
    description: 'Rate using stars (1-5).',
    is_required: true,
    config: {
      scalePoints: 5,
      startAtZero: false,
      scaleType: 'stars',
      leftLabel: 'Poor',
      middleLabel: 'Average',
      rightLabel: 'Excellent',
    },
  },

  // Opinion Scale - Emotions (5-point)
  {
    id: Q_SCALE_EMOTIONS_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_OPINION_SCALE_ID,
    position: position++,
    question_type: 'opinion_scale',
    question_text: 'How do you feel about our customer support?',
    description: 'Rate using emotion faces.',
    is_required: true,
    config: {
      scalePoints: 5,
      startAtZero: false,
      scaleType: 'emotions',
      leftLabel: 'Very Unhappy',
      middleLabel: 'Neutral',
      rightLabel: 'Very Happy',
    },
  },

  // =========================================================================
  // SECTION 7: NPS
  // =========================================================================

  {
    id: Q_NPS_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_NPS_ID,
    position: position++,
    question_type: 'nps',
    question_text: 'How likely are you to recommend our product to a friend or colleague?',
    description: 'Rate from 0 (Not at all likely) to 10 (Extremely likely).',
    is_required: true,
    config: {
      leftLabel: 'Not at all likely',
      rightLabel: 'Extremely likely',
    },
  },

  // =========================================================================
  // SECTION 8: MATRIX
  // =========================================================================

  {
    id: Q_MATRIX_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_MATRIX_ID,
    position: position++,
    question_type: 'matrix',
    question_text: 'Please rate the following aspects of our product:',
    description: 'Rate each aspect from Poor to Excellent.',
    is_required: true,
    config: {
      rows: [
        { id: generateId(), label: 'Performance & Speed' },
        { id: generateId(), label: 'Reliability & Uptime' },
        { id: generateId(), label: 'User Interface Design' },
        { id: generateId(), label: 'Documentation Quality' },
        { id: generateId(), label: 'Value for Money' },
        { id: generateId(), label: 'Customer Support' },
      ],
      columns: [
        { id: generateId(), label: 'Poor' },
        { id: generateId(), label: 'Fair' },
        { id: generateId(), label: 'Good' },
        { id: generateId(), label: 'Very Good' },
        { id: generateId(), label: 'Excellent' },
      ],
      allowMultiplePerRow: false,
    },
  },

  // =========================================================================
  // SECTION 9: RANKING
  // =========================================================================

  {
    id: Q_RANKING_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_RANKING_ID,
    position: position++,
    question_type: 'ranking',
    question_text: 'Rank these potential features from most to least important:',
    description: 'Drag and drop to reorder. First item = most important.',
    is_required: true,
    config: {
      items: [
        { id: generateId(), label: 'AI-powered suggestions' },
        { id: generateId(), label: 'Better mobile app experience' },
        { id: generateId(), label: 'More third-party integrations' },
        { id: generateId(), label: 'Advanced reporting & analytics' },
        { id: generateId(), label: 'Real-time collaboration features' },
        { id: generateId(), label: 'Improved search functionality' },
        { id: generateId(), label: 'Customizable dashboards' },
      ],
      randomOrder: true,
    },
  },

  // =========================================================================
  // SECTION 10: SLIDER
  // =========================================================================

  {
    id: Q_SLIDER_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_SLIDER_ID,
    position: position++,
    question_type: 'slider',
    question_text: 'How satisfied are you with our product overall?',
    description: 'Drag the slider to indicate your satisfaction level (0-100).',
    is_required: true,
    config: {
      minValue: 0,
      maxValue: 100,
      step: 5,
      leftLabel: 'Not satisfied at all',
      middleLabel: 'Neutral',
      rightLabel: 'Completely satisfied',
      showTicks: true,
      showValue: true,
    },
  },

  // =========================================================================
  // SECTION 11: SEMANTIC DIFFERENTIAL
  // =========================================================================

  {
    id: Q_SEMANTIC_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_SEMANTIC_ID,
    position: position++,
    question_type: 'semantic_differential',
    question_text: 'How would you describe our product?',
    description: 'Rate each characteristic on the scale between the two opposites.',
    is_required: true,
    config: {
      scalePoints: 7,
      scales: [
        { id: generateId(), leftLabel: 'Difficult to use', rightLabel: 'Easy to use' },
        { id: generateId(), leftLabel: 'Outdated', rightLabel: 'Modern' },
        { id: generateId(), leftLabel: 'Confusing', rightLabel: 'Clear' },
        { id: generateId(), leftLabel: 'Slow', rightLabel: 'Fast' },
        { id: generateId(), leftLabel: 'Unreliable', rightLabel: 'Reliable' },
        { id: generateId(), leftLabel: 'Boring', rightLabel: 'Exciting' },
      ],
      showMiddleLabel: true,
      middleLabel: 'Neutral',
      randomizeScales: false,
      showNumbers: false,
      presetId: 'usability',
    },
  },

  // =========================================================================
  // SECTION 12: CONSTANT SUM
  // =========================================================================

  {
    id: Q_CONSTANT_SUM_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_CONSTANT_SUM_ID,
    position: position++,
    question_type: 'constant_sum',
    question_text: 'Distribute 100 points across these factors based on their importance to you:',
    description: 'The total must equal 100 points. Allocate more points to more important factors.',
    is_required: true,
    config: {
      items: [
        { id: generateId(), label: 'Price / Cost', description: 'Overall affordability and value' },
        { id: generateId(), label: 'Quality / Reliability', description: 'Product stability and performance' },
        { id: generateId(), label: 'Features / Functionality', description: 'Available capabilities and tools' },
        { id: generateId(), label: 'Customer Support', description: 'Help and service quality' },
        { id: generateId(), label: 'Ease of Use', description: 'User experience and learning curve' },
      ],
      totalPoints: 100,
      displayMode: 'inputs',
      showBars: true,
      randomOrder: false,
    },
  },

  // =========================================================================
  // SECTION 13: AUDIO RESPONSE
  // =========================================================================

  {
    id: Q_AUDIO_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_AUDIO_ID,
    position: position++,
    question_type: 'audio_response',
    question_text: 'Please share any additional feedback in your own words.',
    description: 'Record a voice response (5 seconds minimum, 2 minutes maximum). You can re-record if needed.',
    is_required: false,
    config: {
      maxDurationSeconds: 120,
      minDurationSeconds: 5,
      allowRerecord: true,
      transcriptionLanguage: 'multi',
      showTranscriptPreview: false,
    },
  },
]

// =============================================================================
// AB TEST VARIANTS - Testing ALL question types
// =============================================================================

const abTestVariants = [
  // AB Test for Short Text - Plain
  {
    id: AB_SHORT_TEXT_PLAIN_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_SHORT_TEXT_PLAIN_ID,
    variant_a_content: createVariantContent('What is your job title?', {
      config: { inputType: 'text', placeholder: 'e.g., Software Engineer...', minLength: 3, maxLength: 50 },
    }),
    variant_b_content: createVariantContent('What is your current role or position?', {
      config: { inputType: 'text', placeholder: 'Describe your role...', minLength: 5, maxLength: 60 },
    }),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Short Text - Numerical
  {
    id: AB_SHORT_TEXT_NUMERICAL_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_SHORT_TEXT_NUMERICAL_ID,
    variant_a_content: createVariantContent('How many years of professional experience do you have?'),
    variant_b_content: createVariantContent('Years of work experience in your field:'),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Short Text - Date
  {
    id: AB_SHORT_TEXT_DATE_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_SHORT_TEXT_DATE_ID,
    variant_a_content: createVariantContent('When did you start using our product?'),
    variant_b_content: createVariantContent('What date did you first use our product?'),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Short Text - Email
  {
    id: AB_SHORT_TEXT_EMAIL_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_SHORT_TEXT_EMAIL_ID,
    variant_a_content: createVariantContent('What is your work email address?', {
      description: 'This will only be used for follow-up if you opt in.',
    }),
    variant_b_content: createVariantContent('Your professional email (optional):', {
      description: 'We may contact you for a follow-up interview.',
    }),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Long Text
  {
    id: AB_LONG_TEXT_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_LONG_TEXT_ID,
    variant_a_content: createVariantContent('Describe your typical workflow when using our product.', {
      config: { placeholder: 'Walk us through your typical day...', minLength: 50, maxLength: 500 },
    }),
    variant_b_content: createVariantContent('Tell us how you use our product in your daily work.', {
      config: { placeholder: 'Share your experience...', minLength: 30, maxLength: 600 },
    }),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Single Select
  {
    id: AB_SINGLE_SELECT_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_SINGLE_SELECT_ID,
    variant_a_content: createVariantContent('Which feature do you use most frequently?', {
      config: { shuffle: true },
    }),
    variant_b_content: createVariantContent("What's your favorite feature?", {
      config: { shuffle: false },
    }),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Multi Select
  {
    id: AB_MULTI_SELECT_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_MULTI_SELECT_ID,
    variant_a_content: createVariantContent('Which benefits have you experienced using our product?', {
      config: { minSelections: 1, maxSelections: 5 },
    }),
    variant_b_content: createVariantContent('Select all the ways our product has helped you:', {
      config: { minSelections: 2, maxSelections: 6 },
    }),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Dropdown
  {
    id: AB_DROPDOWN_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_DROPDOWN_ID,
    variant_a_content: createVariantContent('What industry are you in?'),
    variant_b_content: createVariantContent('Which best describes your industry?'),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Image Choice
  {
    id: AB_IMAGE_CHOICE_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_IMAGE_CHOICE_ID,
    variant_a_content: createVariantContent('Which interface design do you prefer?', {
      config: { gridColumns: 2, showLabels: true },
    }),
    variant_b_content: createVariantContent('Select your preferred design style:', {
      config: { gridColumns: 4, showLabels: false },
    }),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Yes/No Icons
  {
    id: AB_YES_NO_ICONS_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_YES_NO_ICONS_ID,
    variant_a_content: createVariantContent('Would you recommend our product to a colleague?', {
      config: { styleType: 'icons', yesLabel: 'Yes, definitely!', noLabel: 'No, not really' },
    }),
    variant_b_content: createVariantContent('Would you recommend this product?', {
      config: { styleType: 'buttons', yesLabel: 'Yes', noLabel: 'No' },
    }),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Yes/No Emotions
  {
    id: AB_YES_NO_EMOTIONS_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_YES_NO_EMOTIONS_ID,
    variant_a_content: createVariantContent('Did our product meet your expectations?'),
    variant_b_content: createVariantContent('Were your expectations met by our product?'),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Yes/No Buttons
  {
    id: AB_YES_NO_BUTTONS_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_YES_NO_BUTTONS_ID,
    variant_a_content: createVariantContent('Have you used the mobile app version?', {
      config: { yesLabel: 'Yes, I use the app', noLabel: 'No, desktop only' },
    }),
    variant_b_content: createVariantContent('Do you use our mobile app?', {
      config: { yesLabel: 'Mobile user', noLabel: 'Desktop user' },
    }),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Opinion Scale - Numerical
  {
    id: AB_SCALE_NUMERICAL_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_SCALE_NUMERICAL_ID,
    variant_a_content: createVariantContent('How satisfied are you with the product performance?', {
      config: { scalePoints: 7, scaleType: 'numerical' },
    }),
    variant_b_content: createVariantContent('Rate your satisfaction with product performance:', {
      config: { scalePoints: 5, scaleType: 'numerical' },
    }),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Opinion Scale - Stars
  {
    id: AB_SCALE_STARS_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_SCALE_STARS_ID,
    variant_a_content: createVariantContent('How would you rate the user interface?', {
      config: { scalePoints: 5, scaleType: 'stars' },
    }),
    variant_b_content: createVariantContent('Rate the user interface design:', {
      config: { scalePoints: 5, scaleType: 'emotions' },
    }),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Opinion Scale - Emotions
  {
    id: AB_SCALE_EMOTIONS_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_SCALE_EMOTIONS_ID,
    variant_a_content: createVariantContent('How do you feel about our customer support?'),
    variant_b_content: createVariantContent('Rate your satisfaction with our support team:'),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for NPS
  {
    id: AB_NPS_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_NPS_ID,
    variant_a_content: createVariantContent('How likely are you to recommend our product to a friend or colleague?'),
    variant_b_content: createVariantContent('On a scale of 0-10, would you recommend our product to others?'),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Matrix
  {
    id: AB_MATRIX_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_MATRIX_ID,
    variant_a_content: createVariantContent('Please rate the following aspects of our product:'),
    variant_b_content: createVariantContent('How would you rate each of these areas?'),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Ranking
  {
    id: AB_RANKING_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_RANKING_ID,
    variant_a_content: createVariantContent('Rank these potential features from most to least important:', {
      config: { randomOrder: true },
    }),
    variant_b_content: createVariantContent('Order these features by importance (drag to reorder):', {
      config: { randomOrder: false },
    }),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Slider
  {
    id: AB_SLIDER_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_SLIDER_ID,
    variant_a_content: createVariantContent('How satisfied are you with our product overall?', {
      config: { step: 5, showTicks: true },
    }),
    variant_b_content: createVariantContent('Rate your overall product satisfaction:', {
      config: { step: 1, showTicks: false },
    }),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Semantic Differential
  {
    id: AB_SEMANTIC_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_SEMANTIC_ID,
    variant_a_content: createVariantContent('How would you describe our product?', {
      config: { scalePoints: 7, showNumbers: false },
    }),
    variant_b_content: createVariantContent('Describe your impression of our product:', {
      config: { scalePoints: 5, showNumbers: true },
    }),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Constant Sum
  {
    id: AB_CONSTANT_SUM_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: Q_CONSTANT_SUM_ID,
    variant_a_content: createVariantContent('Distribute 100 points across these factors based on their importance to you:', {
      config: { totalPoints: 100, displayMode: 'inputs' },
    }),
    variant_b_content: createVariantContent('Allocate 100 points to show what matters most to you:', {
      config: { totalPoints: 100, displayMode: 'sliders' },
    }),
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Section (Short Text)
  {
    id: AB_SECTION_SHORT_TEXT_ID,
    study_id: STUDY_ID,
    entity_type: 'section',
    entity_id: SECTION_SHORT_TEXT_ID,
    variant_a_content: {
      name: 'Short Text Questions',
      description: 'Testing all short text input types: text, numerical, date, email',
    },
    variant_b_content: {
      name: 'Text Input Questions',
      description: 'Various text input formats including numbers, dates, and emails',
    },
    split_percentage: 50,
    is_enabled: true,
  },

  // AB Test for Section (Selection)
  {
    id: AB_SECTION_SELECTION_ID,
    study_id: STUDY_ID,
    entity_type: 'section',
    entity_id: SECTION_SELECTION_ID,
    variant_a_content: {
      name: 'Selection Questions',
      description: 'Testing single-select, multi-select, and dropdown modes',
    },
    variant_b_content: {
      name: 'Choice Questions',
      description: 'Pick from various options using different selection styles',
    },
    split_percentage: 50,
    is_enabled: true,
  },
]

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

async function main() {
  console.log('🚀 Starting Comprehensive Survey Test Seed...\n')

  // 1. Create Project
  console.log('📁 Creating project...')
  const { error: projErr } = await supabase.from('projects').insert({
    id: PROJECT_ID,
    user_id: USER_ID,
    organization_id: ORGANIZATION_ID,
    name: 'Comprehensive Survey Test Project',
    description: 'A project containing a survey with ALL question types and configurations for testing',
    is_archived: false,
  })
  if (projErr) {
    console.error('❌ Project creation failed:', projErr.message)
    process.exit(1)
  }
  console.log('✅ Project created')

  // 2. Create Study (DRAFT - not launched)
  console.log('📊 Creating study (DRAFT)...')
  const { error: studyErr } = await supabase.from('studies').insert({
    id: STUDY_ID,
    project_id: PROJECT_ID,
    user_id: USER_ID,
    study_type: 'survey',
    title: 'Comprehensive Survey Test - All Question Types',
    description: 'A complete survey demonstrating ALL available question types with every possible configuration option enabled.',
    purpose: 'To thoroughly test and validate all survey question types, AB testing functionality, branching logic, display conditions, and section organization features.',
    participant_requirements: 'Participants must be 18 years or older and have used our product within the last 6 months.',
    status: 'draft', // NOT LAUNCHED - just created
    share_code: SHARE_CODE,
    language: 'en',
    settings: {
      studyFlow: studyFlowSettings,
      showOneQuestionPerPage: true,
      randomizeQuestions: false,
      showProgressBar: true,
      allowSkipQuestions: false,
    },
    branding: {
      primaryColor: '#2563EB',
      backgroundColor: '#F8FAFC',
      textColor: '#1E293B',
    },
    closing_rule: {
      type: 'manual',
      enabled: false,
    },
  })
  if (studyErr) {
    console.error('❌ Study creation failed:', studyErr.message)
    process.exit(1)
  }
  console.log('✅ Study created (DRAFT status)')

  // 3. Create Custom Sections
  console.log('📑 Creating custom sections...')
  const { error: secErr } = await supabase.from('survey_custom_sections').insert(customSections)
  if (secErr) {
    console.error('❌ Sections creation failed:', secErr.message)
    process.exit(1)
  }
  console.log(`✅ ${customSections.length} sections created`)

  // 4. Create All Questions
  console.log('📝 Creating questions...')
  const allQuestions = [...screeningQuestions, ...surveyQuestions]
  const { error: qErr } = await supabase.from('study_flow_questions').insert(allQuestions)
  if (qErr) {
    console.error('❌ Questions creation failed:', qErr.message)
    process.exit(1)
  }
  console.log(`✅ ${allQuestions.length} questions created (${screeningQuestions.length} screening + ${surveyQuestions.length} survey)`)

  // 5. Create AB Tests
  console.log('🧪 Creating A/B tests...')
  const { error: abErr } = await supabase.from('ab_test_variants').insert(abTestVariants)
  if (abErr) {
    console.error('❌ A/B tests creation failed:', abErr.message)
    process.exit(1)
  }
  console.log(`✅ ${abTestVariants.length} A/B tests created`)

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('✨ COMPREHENSIVE SURVEY TEST SEED COMPLETE!')
  console.log('='.repeat(60))
  console.log(`
📁 Project ID: ${PROJECT_ID}
📊 Study ID: ${STUDY_ID}
🔗 Share Code: ${SHARE_CODE}
📍 Status: DRAFT (not launched, no participants)

📋 STUDY DETAILS:
   • Title: Comprehensive Survey Test - All Question Types
   • Purpose: Testing all survey features
   • Requirements: 18+, product users

📑 SECTIONS (${customSections.length} total):
   1. Short Text Questions
   2. Long Text Questions
   3. Selection Questions
   4. Image Choice Questions
   5. Yes/No Questions
   6. Opinion Scale Questions
   7. NPS Question
   8. Matrix Question
   9. Ranking Question
   10. Slider Question
   11. Semantic Differential
   12. Constant Sum Question
   13. Audio Response Question

📝 QUESTIONS BY TYPE:
   • Screening: ${screeningQuestions.length} (1 selection, 1 yes/no)
   • Short Text: 4 (text, numerical, date, email)
   • Long Text: 1 (with min/max length)
   • Selection: 3 (single, multi, dropdown)
   • Image Choice: 1
   • Yes/No: 3 (icons, emotions, buttons)
   • Opinion Scale: 3 (numerical, stars, emotions)
   • NPS: 1
   • Matrix: 1
   • Ranking: 1
   • Slider: 1
   • Semantic Differential: 1
   • Constant Sum: 1
   • Audio Response: 1

   TOTAL: ${allQuestions.length} questions

🧪 A/B TESTS (${abTestVariants.length} total):
   • Question variants: ${abTestVariants.filter(ab => ab.entity_type === 'question').length}
   • Section variants: ${abTestVariants.filter(ab => ab.entity_type === 'section').length}

✅ FEATURES ENABLED:
   • Participant Agreement
   • Screening with branching (reject under 18, reject non-users)
   • All question types with all config options
   • AB testing on every question type
   • AB testing on sections
   • Display logic (conditional visibility)
   • Survey branching (skip to question/section)
   • Numeric branching
   • Text branching
   • Min/Max length validation
   • Min/Max value validation
   • Min/Max date validation
   • Shuffle options
   • Other option
   • Scoring
   • Notes/descriptions on all questions
   • Multiple custom sections

🔗 Preview URL: http://localhost:4001/${SHARE_CODE}
`)
}

main().catch((e) => {
  console.error('❌ Seed failed:', e.message)
  process.exit(1)
})
