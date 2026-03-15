/**
 * ULTIMATE Comprehensive Survey Seed Script
 * Creates an enterprise-level survey study with EVERY feature:
 *
 * FEATURES INCLUDED:
 * - Complete study flow (welcome, agreement, screening, identifier, thank you)
 * - ALL 8 question types with variations
 * - Pre-study AND post-study questions (enabled)
 * - Answer piping ({Q:id} syntax)
 * - Display logic (conditional visibility)
 * - Survey branching logic (skip to question/section/end)
 * - Numeric branching (for scales/NPS)
 * - Text branching (is_answered/is_empty)
 * - Grouped branching (checkbox ANY/ALL)
 * - Advanced branching rules (cross-question conditions)
 * - Compound screening conditions
 * - A/B testing on questions
 * - Survey rules (logic pipeline)
 * - Survey variables (score, classification, counter)
 * - Custom sections
 * - 100 participants with varied responses
 *
 * Run with: npx tsx scripts/seed-ultimate-survey.ts
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

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function weightedRandom(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0)
  let random = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i]
    if (random <= 0) return i
  }
  return weights.length - 1
}

// =============================================================================
// IDS - Pre-generate for cross-referencing
// =============================================================================

const PROJECT_ID = generateId()
const STUDY_ID = generateId()
// Default dev user ID (better-auth)
const USER_ID = process.env.SEED_USER_ID || 'your-better-auth-user-id'
const SHARE_CODE = `ultimate-survey-${Date.now()}`

// Custom Sections
const SECTION_PRODUCT_ID = generateId()
const SECTION_SATISFACTION_ID = generateId()
const SECTION_FEEDBACK_ID = generateId()
const SECTION_ADVANCED_ID = generateId()

// Screening Question IDs
const SCREENING_Q1_ID = generateId() // Age (with rejection)
const SCREENING_Q2_ID = generateId() // Country dropdown
const SCREENING_Q3_ID = generateId() // Experience (compound condition)
const SCREENING_Q4_ID = generateId() // Product usage (with rejection)
const SCREENING_Q5_ID = generateId() // Opinion scale in screening

// Pre-Study Question IDs
const PRE_Q1_ID = generateId() // Expectations text
const PRE_Q2_ID = generateId() // Goals multiple choice

// Survey Question IDs (for cross-referencing)
const SURVEY_Q_SHORT_TEXT_ID = generateId()
const SURVEY_Q_LONG_TEXT_ID = generateId()
const SURVEY_Q_SINGLE_ID = generateId()
const SURVEY_Q_MULTI_ID = generateId()
const SURVEY_Q_DROPDOWN_ID = generateId()
const SURVEY_Q_YES_NO_ID = generateId()
const SURVEY_Q_CONDITIONAL_ID = generateId()
const SURVEY_Q_SCALE_STARS_ID = generateId()
const SURVEY_Q_SCALE_NUM_ID = generateId()
const SURVEY_Q_SCALE_EMOTIONS_ID = generateId()
const SURVEY_Q_NPS_ID = generateId()
const SURVEY_Q_MATRIX_ID = generateId()
const SURVEY_Q_RANKING_ID = generateId()
const SURVEY_Q_PIPED_ID = generateId() // Uses answer piping
const SURVEY_Q_BRANCH_SKIP_ID = generateId() // Has skip logic
const _SURVEY_Q_GROUPED_ID = generateId() // Grouped checkbox branching
const SURVEY_Q_ADVANCED_ID = generateId() // Advanced cross-question branching
const SURVEY_Q_FEEDBACK_ID = generateId()
const SURVEY_Q_FINAL_ID = generateId()

// Post-Study Question IDs
const POST_Q1_ID = generateId() // Follow-up interest
const POST_Q2_ID = generateId() // Additional feedback

// AB Test IDs
const AB_TEST_1_ID = generateId()
const AB_TEST_2_ID = generateId()
const AB_TEST_3_ID = generateId()

// Variable IDs
const VAR_SATISFACTION_ID = generateId()
const VAR_SEGMENT_ID = generateId()
const VAR_COUNTER_ID = generateId()

// Rule IDs
const RULE_1_ID = generateId()
const RULE_2_ID = generateId()
const RULE_3_ID = generateId()
const RULE_4_ID = generateId()

// =============================================================================
// STUDY FLOW SETTINGS (Complete configuration)
// =============================================================================

const studyFlowSettings = {
  welcome: {
    enabled: true,
    title: 'Welcome to Our Ultimate Product Survey',
    message: `<p><strong>Thank you for participating!</strong></p>
<p>This comprehensive survey will take 10-15 minutes. Your feedback directly shapes our product roadmap.</p>`,
    includeStudyTitle: true,
    includeDescription: true,
    includePurpose: true,
    includeParticipantRequirements: true,
  },
  participantAgreement: {
    enabled: true,
    title: 'Research Participation Agreement',
    message: 'Please review and accept the following terms:',
    agreementText: `<ul>
<li>I am 18+ years old and provide informed consent</li>
<li>My participation is voluntary and I may withdraw anytime</li>
<li>My responses are confidential and anonymized</li>
<li>Data is stored securely per GDPR/CCPA regulations</li>
</ul>`,
    showRejectionMessage: true,
    rejectionTitle: 'Thank You',
    rejectionMessage: 'You must accept the agreement to participate.',
    redirectUrl: 'https://example.com/declined',
  },
  screening: {
    enabled: true,
    introTitle: 'Quick Eligibility Check',
    introMessage: 'Please answer these brief questions to confirm eligibility (~1 minute).',
    rejectionTitle: 'Thank You for Your Interest',
    rejectionMessage: 'Unfortunately you don\'t meet the criteria for this study.',
    redirectUrl: 'https://example.com/other-studies',
    redirectImmediately: false,
  },
  participantIdentifier: {
    type: 'demographic_profile' as const,
    demographicProfile: {
      title: 'Tell Us About Yourself',
      description: 'This helps us understand our participants better.',
      enableAutoPopulation: true,
      sections: [
        {
          id: 'personal',
          name: 'Personal Info',
          position: 0,
          title: 'Personal Information',
          fields: [
            { id: 'email', type: 'predefined' as const, fieldType: 'email' as const, position: 0, enabled: true, required: true, mappedToScreeningQuestionId: null, width: 'full' as const },
            { id: 'firstName', type: 'predefined' as const, fieldType: 'firstName' as const, position: 1, enabled: true, required: true, mappedToScreeningQuestionId: null, width: 'half' as const },
            { id: 'lastName', type: 'predefined' as const, fieldType: 'lastName' as const, position: 2, enabled: true, required: true, mappedToScreeningQuestionId: null, width: 'half' as const },
            { id: 'gender', type: 'predefined' as const, fieldType: 'gender' as const, position: 3, enabled: true, required: false, mappedToScreeningQuestionId: null, width: 'half' as const },
            { id: 'ageRange', type: 'predefined' as const, fieldType: 'ageRange' as const, position: 4, enabled: true, required: true, mappedToScreeningQuestionId: SCREENING_Q1_ID, width: 'half' as const },
          ],
        },
        {
          id: 'work',
          name: 'Work',
          position: 1,
          title: 'Professional Background',
          fields: [
            { id: 'employmentStatus', type: 'predefined' as const, fieldType: 'employmentStatus' as const, position: 0, enabled: true, required: true, mappedToScreeningQuestionId: null, width: 'half' as const },
            { id: 'industry', type: 'predefined' as const, fieldType: 'industry' as const, position: 1, enabled: true, required: true, mappedToScreeningQuestionId: null, width: 'half' as const },
            { id: 'yearsOfExperience', type: 'predefined' as const, fieldType: 'yearsOfExperience' as const, position: 2, enabled: true, required: false, mappedToScreeningQuestionId: SCREENING_Q3_ID, width: 'half' as const },
            { id: 'techProficiency', type: 'predefined' as const, fieldType: 'techProficiency' as const, position: 3, enabled: true, required: true, mappedToScreeningQuestionId: null, width: 'half' as const },
          ],
        },
      ],
      genderOptions: { options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
      ageRangeOptions: { ranges: ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'] },
      locationConfig: { startLevel: 'country' as const, defaultCountry: null, defaultState: null },
      maritalStatusOptions: { options: ['Single', 'Married', 'Divorced', 'Prefer not to say'] },
      householdSizeOptions: { options: ['1', '2', '3', '4', '5+'] },
      employmentStatusOptions: { options: ['Employed full-time', 'Employed part-time', 'Self-employed', 'Student', 'Retired', 'Unemployed'] },
      industryOptions: { options: ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Other'] },
      companySizeOptions: { options: ['1-10', '11-50', '51-200', '201-1000', '1000+'] },
      yearsOfExperienceOptions: { options: ['<1 year', '1-3 years', '3-5 years', '5-10 years', '10+ years'] },
      departmentOptions: { options: ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'Other'] },
      primaryDeviceOptions: { options: ['Desktop', 'Mobile', 'Tablet'] },
      operatingSystemOptions: { options: ['Windows', 'macOS', 'iOS', 'Android', 'Linux'] },
      browserPreferenceOptions: { options: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other'] },
      techProficiencyOptions: { options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
      educationLevelOptions: { options: ['High school', 'Bachelor\'s', 'Master\'s', 'Doctorate'] },
      occupationTypeOptions: { options: ['Employee', 'Freelancer', 'Business owner', 'Student'] },
      locationTypeOptions: { options: ['Urban', 'Suburban', 'Rural'] },
      timeZoneOptions: { options: ['PST', 'MST', 'CST', 'EST', 'UTC', 'Other'] },
      priorExperienceOptions: { options: ['First time', '1-2 times', '3+ times'] },
      followUpWillingnessOptions: { options: ['Yes', 'Maybe', 'No'] },
      researchAvailabilityOptions: { options: ['Weekday mornings', 'Weekday evenings', 'Weekends', 'Flexible'] },
      contactConsentOptions: { options: ['Yes', 'No'] },
      yearsUsingProductOptions: { options: ['New user', '<6 months', '6-12 months', '1-2 years', '2+ years'] },
      productUsageFrequencyOptions: { options: ['Daily', 'Weekly', 'Monthly', 'Rarely'] },
      accessibilityNeedsOptions: { options: ['None', 'Visual', 'Hearing', 'Motor', 'Cognitive'] },
      preferredLanguageOptions: { options: ['English', 'Spanish', 'French', 'German', 'Other'] },
      assistiveTechnologyOptions: { options: ['None', 'Screen reader', 'Voice control', 'Other'] },
      digitalComfortOptions: { options: ['Very comfortable', 'Comfortable', 'Neutral', 'Uncomfortable'] },
    },
  },
  // PRE-STUDY QUESTIONS - ENABLED!
  preStudyQuestions: {
    enabled: true,
    showIntro: true,
    introTitle: 'Before We Begin',
    introMessage: 'A few quick questions about your expectations.',
    pageMode: 'one_per_page' as const,
    randomizeQuestions: false,
  },
  activityInstructions: {
    enabled: false,
  },
  // SURVEY QUESTIONNAIRE
  surveyQuestionnaire: {
    enabled: true,
    showIntro: true,
    introTitle: 'Product Experience Survey',
    introMessage: 'Please share your honest feedback about your experience.',
    pageMode: 'one_per_page' as const,
    randomizeQuestions: false,
    showProgressBar: true,
    allowSkipQuestions: false,
  },
  // POST-STUDY QUESTIONS - ENABLED!
  postStudyQuestions: {
    enabled: true,
    showIntro: true,
    introTitle: 'Almost Done!',
    introMessage: 'Just a couple more questions.',
    pageMode: 'one_per_page' as const,
    randomizeQuestions: false,
  },
  thankYou: {
    enabled: true,
    title: 'Thank You!',
    message: `<p><strong>Your feedback has been recorded.</strong></p>
<p>We truly appreciate your time. You'll receive a summary of findings once the study completes.</p>`,
    redirectUrl: 'https://example.com/thank-you',
    redirectDelay: 10,
  },
  closedStudy: {
    title: 'Study Closed',
    message: 'This study has reached its participant quota. Thank you for your interest!',
    redirectUrl: 'https://example.com/studies',
    redirectImmediately: false,
  },
  pagination: {
    mode: 'one_per_page' as const,
  },
}

// =============================================================================
// SCREENING QUESTIONS (with compound conditions and scale branching)
// =============================================================================

const screeningQuestions = [
  // Q1: Age - with rejection for under 18
  {
    id: SCREENING_Q1_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 0,
    question_type: 'multiple_choice',
    question_text: 'What is your age range?',
    description: 'We need participants 18+ for this study.',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'age_under18', label: 'Under 18' },
        { id: 'age_18_24', label: '18-24' },
        { id: 'age_25_34', label: '25-34' },
        { id: 'age_35_44', label: '35-44' },
        { id: 'age_45_54', label: '45-54' },
        { id: 'age_55plus', label: '55+' },
      ],
      shuffle: false,
    },
    branching_logic: {
      rules: [{ optionId: 'age_under18', target: 'reject' }],
      defaultTarget: 'next',
    },
  },
  // Q2: Country - dropdown
  {
    id: SCREENING_Q2_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 1,
    question_type: 'multiple_choice',
    question_text: 'Which country do you reside in?',
    is_required: true,
    config: {
      mode: 'dropdown',
      options: [
        { id: 'us', label: 'United States' },
        { id: 'uk', label: 'United Kingdom' },
        { id: 'ca', label: 'Canada' },
        { id: 'au', label: 'Australia' },
        { id: 'de', label: 'Germany' },
        { id: 'other', label: 'Other' },
      ],
      placeholder: 'Select your country',
    },
  },
  // Q3: Experience - with COMPOUND condition (reject if no exp AND under 25)
  {
    id: SCREENING_Q3_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 2,
    question_type: 'multiple_choice',
    question_text: 'How many years of professional experience do you have?',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'exp_none', label: 'No experience' },
        { id: 'exp_1_3', label: '1-3 years' },
        { id: 'exp_3_5', label: '3-5 years' },
        { id: 'exp_5_10', label: '5-10 years' },
        { id: 'exp_10plus', label: '10+ years' },
      ],
    },
    branching_logic: {
      rules: [
        {
          optionId: 'exp_none',
          target: 'reject',
          // COMPOUND CONDITION: Reject only if no experience AND young
          conditions: [
            {
              id: generateId(),
              questionId: SCREENING_Q1_ID,
              operator: 'is',
              value: 'age_18_24',
            },
          ],
          matchAll: true,
        },
      ],
      defaultTarget: 'next',
    },
  },
  // Q4: Product usage - reject if never used
  {
    id: SCREENING_Q4_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 3,
    question_type: 'multiple_choice',
    question_text: 'How long have you been using our product?',
    description: 'We need participants with some product experience.',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'never', label: 'Never used it' },
        { id: 'trial', label: 'Currently on trial' },
        { id: 'lt_6mo', label: 'Less than 6 months' },
        { id: '6mo_1yr', label: '6 months - 1 year' },
        { id: '1yr_plus', label: 'More than 1 year' },
      ],
    },
    branching_logic: {
      rules: [{ optionId: 'never', target: 'reject' }],
      defaultTarget: 'go_to_study',
    },
  },
  // Q5: Opinion scale IN SCREENING - with scale branching
  {
    id: SCREENING_Q5_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 4,
    question_type: 'opinion_scale',
    question_text: 'How interested are you in providing detailed feedback?',
    is_required: true,
    config: {
      scalePoints: 5,
      startAtZero: false,
      scaleType: 'numerical',
      leftLabel: 'Not interested',
      rightLabel: 'Very interested',
    },
    // SCALE BRANCHING in screening
    branching_logic: {
      rules: [
        { comparison: 'less_than', scaleValue: 2, target: 'reject' },
      ],
      defaultTarget: 'go_to_study',
    },
  },
]

// =============================================================================
// PRE-STUDY QUESTIONS
// =============================================================================

const preStudyQuestions = [
  {
    id: PRE_Q1_ID,
    study_id: STUDY_ID,
    section: 'pre_study',
    position: 0,
    question_type: 'multi_line_text',
    question_text: 'What are your main expectations from this survey?',
    description: 'This helps us understand what matters most to you.',
    is_required: true,
    config: {
      placeholder: 'Tell us what you hope to share...',
      maxLength: 500,
    },
  },
  {
    id: PRE_Q2_ID,
    study_id: STUDY_ID,
    section: 'pre_study',
    position: 1,
    question_type: 'multiple_choice',
    question_text: 'What is your primary goal when using our product?',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'productivity', label: 'Increase productivity' },
        { id: 'collaboration', label: 'Improve collaboration' },
        { id: 'organization', label: 'Better organization' },
        { id: 'reporting', label: 'Generate reports' },
        { id: 'other', label: 'Other' },
      ],
      allowOther: true,
      otherLabel: 'Please specify',
    },
  },
]

// =============================================================================
// CUSTOM SECTIONS
// =============================================================================

const customSections = [
  {
    id: SECTION_PRODUCT_ID,
    study_id: STUDY_ID,
    name: 'Product Experience',
    description: 'Questions about your overall product experience',
    position: 0,
    parent_section: 'survey',
    is_visible: true,
  },
  {
    id: SECTION_SATISFACTION_ID,
    study_id: STUDY_ID,
    name: 'Satisfaction Ratings',
    description: 'Rate different aspects of the product',
    position: 1,
    parent_section: 'survey',
    is_visible: true,
  },
  {
    id: SECTION_FEEDBACK_ID,
    study_id: STUDY_ID,
    name: 'Open Feedback',
    description: 'Share your thoughts and suggestions',
    position: 2,
    parent_section: 'survey',
    is_visible: true,
  },
  {
    id: SECTION_ADVANCED_ID,
    study_id: STUDY_ID,
    name: 'Advanced Features',
    description: 'Questions with advanced logic features',
    position: 3,
    parent_section: 'survey',
    is_visible: true,
  },
]

// =============================================================================
// SURVEY QUESTIONS - ALL TYPES WITH ADVANCED FEATURES
// =============================================================================

const surveyQuestions = [
  // === SECTION: Product Experience ===

  // Q1: Short text
  {
    id: SURVEY_Q_SHORT_TEXT_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_PRODUCT_ID,
    position: 0,
    question_type: 'single_line_text',
    question_text: 'In a few words, what is your primary use case for our product?',
    is_required: true,
    config: {
      inputType: 'text',
      placeholder: 'e.g., Project management, team collaboration...',
      maxLength: 100,
      minLength: 3,
    },
  },
  // Q2: Long text with TEXT BRANCHING (is_answered)
  {
    id: SURVEY_Q_LONG_TEXT_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_PRODUCT_ID,
    position: 1,
    question_type: 'multi_line_text',
    question_text: 'Describe your typical workflow when using our product.',
    is_required: false,
    config: {
      placeholder: 'Walk us through a typical day...',
      maxLength: 1000,
    },
    // TEXT BRANCHING: Skip to feedback if not answered
    branching_logic: {
      type: 'text',
      rules: [
        {
          id: generateId(),
          condition: 'is_empty',
          target: 'skip_to_question',
          targetId: SURVEY_Q_SINGLE_ID,
        },
      ],
      defaultTarget: 'continue',
    },
  },
  // Q3: Single select with shuffle
  {
    id: SURVEY_Q_SINGLE_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_PRODUCT_ID,
    position: 2,
    question_type: 'multiple_choice',
    question_text: 'Which feature do you use most frequently?',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'feat_dashboard', label: 'Dashboard & Analytics', score: 5 },
        { id: 'feat_reports', label: 'Reports & Export', score: 4 },
        { id: 'feat_collab', label: 'Collaboration Tools', score: 4 },
        { id: 'feat_automation', label: 'Automation & Workflows', score: 5 },
        { id: 'feat_mobile', label: 'Mobile App', score: 3 },
      ],
      shuffle: true,
      allowOther: true,
      otherLabel: 'Other feature',
    },
    // SURVEY BRANCHING: Skip to satisfaction if automation selected
    branching_logic: {
      rules: [
        {
          optionId: 'feat_automation',
          target: 'skip_to_section',
          targetId: SECTION_SATISFACTION_ID,
        },
      ],
      defaultTarget: 'continue',
    },
  },
  // Q4: Multi-select with min/max and GROUPED BRANCHING
  {
    id: SURVEY_Q_MULTI_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_PRODUCT_ID,
    position: 3,
    question_type: 'multiple_choice',
    question_text: 'Which benefits have you experienced? (Select all that apply)',
    is_required: true,
    config: {
      mode: 'multi',
      options: [
        { id: 'ben_time', label: 'Saved time' },
        { id: 'ben_collab', label: 'Better collaboration' },
        { id: 'ben_org', label: 'Better organization' },
        { id: 'ben_visibility', label: 'Increased visibility' },
        { id: 'ben_deadlines', label: 'Met more deadlines' },
        { id: 'ben_remote', label: 'Easier remote work' },
      ],
      shuffle: true,
      minSelections: 1,
      maxSelections: 4,
    },
    // GROUPED BRANCHING: If ANY of productivity group selected, skip to satisfaction
    branching_logic: {
      type: 'grouped',
      groups: [
        {
          id: generateId(),
          optionIds: ['ben_time', 'ben_deadlines'],
          matchMode: 'any',
          target: 'continue',
        },
      ],
      individualRules: [],
      defaultTarget: 'continue',
    },
  },
  // Q5: Dropdown
  {
    id: SURVEY_Q_DROPDOWN_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_PRODUCT_ID,
    position: 4,
    question_type: 'multiple_choice',
    question_text: 'How often do you use our product?',
    is_required: true,
    config: {
      mode: 'dropdown',
      options: [
        { id: 'freq_daily', label: 'Multiple times per day' },
        { id: 'freq_once', label: 'Once a day' },
        { id: 'freq_weekly', label: 'Few times a week' },
        { id: 'freq_monthly', label: 'Few times a month' },
        { id: 'freq_rarely', label: 'Rarely' },
      ],
      placeholder: 'Select frequency',
    },
  },
  // Q6: Yes/No with icons
  {
    id: SURVEY_Q_YES_NO_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_PRODUCT_ID,
    position: 5,
    question_type: 'yes_no',
    question_text: 'Have you recommended our product to others?',
    is_required: true,
    config: {
      styleType: 'icons',
      yesLabel: 'Yes, I have!',
      noLabel: 'Not yet',
    },
  },
  // Q7: CONDITIONAL question (display logic based on yes/no)
  {
    id: SURVEY_Q_CONDITIONAL_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_PRODUCT_ID,
    position: 6,
    question_type: 'single_line_text',
    question_text: 'How did they react when you recommended it?',
    is_required: false,
    config: {
      inputType: 'text',
      placeholder: 'Tell us about their reaction...',
    },
    // DISPLAY LOGIC: Only show if recommended = Yes
    display_logic: {
      action: 'show',
      conditions: [
        { questionId: SURVEY_Q_YES_NO_ID, operator: 'equals', values: ['true'] },
      ],
      matchAll: true,
    },
  },

  // === SECTION: Satisfaction Ratings ===

  // Q8: Opinion scale - Stars
  {
    id: SURVEY_Q_SCALE_STARS_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_SATISFACTION_ID,
    position: 7,
    question_type: 'opinion_scale',
    question_text: 'How would you rate your overall experience?',
    is_required: true,
    config: {
      scalePoints: 5,
      startAtZero: false,
      scaleType: 'stars',
      leftLabel: 'Poor',
      middleLabel: 'Okay',
      rightLabel: 'Excellent',
    },
    // NUMERIC BRANCHING: Skip to feedback if rating < 3
    branching_logic: {
      type: 'numeric',
      rules: [
        {
          comparison: 'less_than',
          value: 3,
          target: 'skip_to_section',
          targetId: SECTION_FEEDBACK_ID,
        },
      ],
      defaultTarget: 'continue',
    },
  },
  // Q9: Opinion scale - Numerical (7-point)
  {
    id: SURVEY_Q_SCALE_NUM_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_SATISFACTION_ID,
    position: 8,
    question_type: 'opinion_scale',
    question_text: 'How satisfied are you with the ease of use?',
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
  // Q10: Opinion scale - Emotions
  {
    id: SURVEY_Q_SCALE_EMOTIONS_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_SATISFACTION_ID,
    position: 9,
    question_type: 'opinion_scale',
    question_text: 'How do you feel about our customer support?',
    is_required: true,
    config: {
      scalePoints: 5,
      startAtZero: false,
      scaleType: 'emotions',
      leftLabel: 'Very Unhappy',
      rightLabel: 'Very Happy',
    },
  },
  // Q11: NPS
  {
    id: SURVEY_Q_NPS_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_SATISFACTION_ID,
    position: 10,
    question_type: 'nps',
    question_text: 'How likely are you to recommend our product to a friend or colleague?',
    is_required: true,
    config: {
      leftLabel: 'Not at all likely',
      rightLabel: 'Extremely likely',
    },
  },
  // Q12: Matrix
  {
    id: SURVEY_Q_MATRIX_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_SATISFACTION_ID,
    position: 11,
    question_type: 'matrix',
    question_text: 'Please rate the following aspects:',
    is_required: true,
    config: {
      rows: [
        { id: 'perf', label: 'Performance' },
        { id: 'reliability', label: 'Reliability' },
        { id: 'ui', label: 'User Interface' },
        { id: 'docs', label: 'Documentation' },
        { id: 'value', label: 'Value for Money' },
      ],
      columns: [
        { id: 'poor', label: 'Poor' },
        { id: 'fair', label: 'Fair' },
        { id: 'good', label: 'Good' },
        { id: 'great', label: 'Great' },
        { id: 'excellent', label: 'Excellent' },
      ],
      allowMultiplePerRow: false,
    },
  },
  // Q13: Ranking
  {
    id: SURVEY_Q_RANKING_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_SATISFACTION_ID,
    position: 12,
    question_type: 'ranking',
    question_text: 'Rank these potential features from most to least important:',
    is_required: true,
    config: {
      items: [
        { id: 'ai', label: 'AI-powered suggestions' },
        { id: 'mobile', label: 'Better mobile app' },
        { id: 'integrations', label: 'More integrations' },
        { id: 'reporting', label: 'Advanced reporting' },
        { id: 'collab', label: 'Real-time collaboration' },
      ],
      randomOrder: true,
    },
  },

  // === SECTION: Open Feedback ===

  // Q14: ANSWER PIPING - references previous answer
  {
    id: SURVEY_Q_PIPED_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_FEEDBACK_ID,
    position: 13,
    question_type: 'multi_line_text',
    // ANSWER PIPING: {Q:questionId} syntax
    question_text: `You mentioned "{Q:${SURVEY_Q_SHORT_TEXT_ID}}" as your primary use case. Can you tell us more about how you use the product for this?`,
    is_required: true,
    config: {
      placeholder: 'Share more details...',
      maxLength: 1500,
    },
  },
  // Q15: Main feedback
  {
    id: SURVEY_Q_FEEDBACK_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_FEEDBACK_ID,
    position: 14,
    question_type: 'multi_line_text',
    question_text: 'What is the #1 thing you would change about our product?',
    description: 'Be specific - we read every response!',
    is_required: true,
    config: {
      placeholder: 'Tell us what would make the biggest difference...',
      maxLength: 2000,
    },
  },

  // === SECTION: Advanced Features ===

  // Q16: Question with SKIP TO QUESTION branching
  {
    id: SURVEY_Q_BRANCH_SKIP_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_ADVANCED_ID,
    position: 15,
    question_type: 'multiple_choice',
    question_text: 'Would you like to provide additional detailed feedback?',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'yes_detailed', label: 'Yes, I have more to share' },
        { id: 'no_done', label: 'No, I\'m done' },
      ],
    },
    // SKIP TO QUESTION branching
    branching_logic: {
      rules: [
        {
          optionId: 'no_done',
          target: 'skip_to_question',
          targetId: SURVEY_Q_FINAL_ID,
        },
      ],
      defaultTarget: 'continue',
    },
  },
  // Q17: Question for additional feedback
  {
    id: SURVEY_Q_ADVANCED_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_ADVANCED_ID,
    position: 16,
    question_type: 'multi_line_text',
    question_text: 'Please share your detailed feedback:',
    is_required: false,
    config: {
      placeholder: 'Any additional thoughts...',
      maxLength: 3000,
    },
    // Note: Advanced cross-question branching is implemented via survey_rules table
  },
  // Q18: Final question
  {
    id: SURVEY_Q_FINAL_ID,
    study_id: STUDY_ID,
    section: 'survey',
    custom_section_id: SECTION_ADVANCED_ID,
    position: 17,
    question_type: 'yes_no',
    question_text: 'Would you be interested in a follow-up interview?',
    is_required: true,
    config: {
      styleType: 'emotions',
      yesLabel: 'Yes, count me in!',
      noLabel: 'No thanks',
    },
  },
]

// =============================================================================
// POST-STUDY QUESTIONS
// =============================================================================

const postStudyQuestions = [
  {
    id: POST_Q1_ID,
    study_id: STUDY_ID,
    section: 'post_study',
    position: 0,
    question_type: 'multiple_choice',
    question_text: 'How was your experience with this survey?',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'great', label: 'Great - easy to complete' },
        { id: 'good', label: 'Good - minor issues' },
        { id: 'okay', label: 'Okay - some difficulty' },
        { id: 'poor', label: 'Poor - very difficult' },
      ],
    },
  },
  {
    id: POST_Q2_ID,
    study_id: STUDY_ID,
    section: 'post_study',
    position: 1,
    question_type: 'multi_line_text',
    question_text: 'Any final thoughts or feedback about the survey itself?',
    is_required: false,
    config: {
      placeholder: 'Optional: Share any feedback about this survey...',
      maxLength: 500,
    },
  },
]

// =============================================================================
// A/B TEST VARIANTS
// =============================================================================

const abTestVariants = [
  // Test 1: NPS question wording
  {
    id: AB_TEST_1_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: SURVEY_Q_NPS_ID,
    variant_a_content: {
      question_text: 'How likely are you to recommend our product to a friend or colleague?',
    },
    variant_b_content: {
      question_text: 'On a scale of 0-10, would you recommend our product to others?',
    },
    split_percentage: 50,
    is_enabled: true,
  },
  // Test 2: Scale type (stars vs emotions)
  {
    id: AB_TEST_2_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: SURVEY_Q_SCALE_STARS_ID,
    variant_a_content: {
      config: { scalePoints: 5, scaleType: 'stars', leftLabel: 'Poor', rightLabel: 'Excellent' },
    },
    variant_b_content: {
      config: { scalePoints: 5, scaleType: 'emotions', leftLabel: 'Very Unhappy', rightLabel: 'Very Happy' },
    },
    split_percentage: 50,
    is_enabled: true,
  },
  // Test 3: Option shuffling
  {
    id: AB_TEST_3_ID,
    study_id: STUDY_ID,
    entity_type: 'question',
    entity_id: SURVEY_Q_SINGLE_ID,
    variant_a_content: { config: { shuffle: false } },
    variant_b_content: { config: { shuffle: true } },
    split_percentage: 50,
    is_enabled: true,
  },
]

// =============================================================================
// SURVEY VARIABLES (Score, Classification, Counter)
// =============================================================================

const surveyVariables = [
  // Score variable
  {
    id: VAR_SATISFACTION_ID,
    study_id: STUDY_ID,
    name: 'satisfaction_score',
    description: 'Aggregate satisfaction from rating questions',
    variable_type: 'score',
    formula: {
      type: 'score',
      questions: [
        { questionId: SURVEY_Q_SCALE_STARS_ID, weight: 1 },
        { questionId: SURVEY_Q_SCALE_NUM_ID, weight: 1 },
        { questionId: SURVEY_Q_NPS_ID, weight: 0.5 },
      ],
      aggregation: 'average',
      defaultValue: 0,
    },
  },
  // Classification variable
  {
    id: VAR_SEGMENT_ID,
    study_id: STUDY_ID,
    name: 'user_segment',
    description: 'User segment based on satisfaction',
    variable_type: 'classification',
    formula: {
      type: 'classification',
      sourceVariable: 'satisfaction_score',
      ranges: [
        { min: 0, max: 3, label: 'Detractor' },
        { min: 3, max: 4, label: 'Passive' },
        { min: 4, max: 5, label: 'Promoter' },
      ],
      defaultLabel: 'Unknown',
    },
  },
  // Counter variable
  {
    id: VAR_COUNTER_ID,
    study_id: STUDY_ID,
    name: 'benefits_count',
    description: 'Count of benefits selected',
    variable_type: 'counter',
    formula: {
      type: 'counter',
      questionId: SURVEY_Q_MULTI_ID,
      countValues: ['ben_time', 'ben_collab', 'ben_org', 'ben_visibility', 'ben_deadlines', 'ben_remote'],
    },
  },
]

// =============================================================================
// SURVEY RULES (Logic Pipeline)
// =============================================================================

const surveyRules = [
  // Rule 1: Skip dissatisfied users to feedback question
  {
    id: RULE_1_ID,
    study_id: STUDY_ID,
    name: 'Skip dissatisfied to feedback',
    description: 'If rating < 2, skip to feedback question',
    position: 0,
    is_enabled: true,
    trigger_type: 'on_answer',
    trigger_config: {},
    conditions: {
      groups: [{
        id: generateId(),
        conditions: [{
          id: generateId(),
          source: { type: 'question', questionId: SURVEY_Q_SCALE_STARS_ID },
          operator: 'less_than',
          values: [2],
        }],
        matchAll: true,
      }],
    },
    action_type: 'skip_to_question',
    action_config: { questionId: SURVEY_Q_FEEDBACK_ID },
  },
  // Rule 2: End survey early for promoters
  {
    id: RULE_2_ID,
    study_id: STUDY_ID,
    name: 'Thank promoters early',
    description: 'End survey for high NPS users',
    position: 1,
    is_enabled: true,
    trigger_type: 'on_answer',
    trigger_config: {},
    conditions: {
      groups: [{
        id: generateId(),
        conditions: [{
          id: generateId(),
          source: { type: 'question', questionId: SURVEY_Q_NPS_ID },
          operator: 'greater_than',
          values: [9],
        }],
        matchAll: true,
      }],
    },
    action_type: 'end_survey',
    action_config: {
      title: 'Thank You, Promoter!',
      message: 'Your high rating means a lot to us!',
      redirectUrl: 'https://example.com/promoter-thanks',
      redirectDelay: 5,
    },
  },
  // Rule 3: Skip to final question for power users
  {
    id: RULE_3_ID,
    study_id: STUDY_ID,
    name: 'Power user shortcut',
    description: 'Daily users get fast-track to final question',
    position: 2,
    is_enabled: true,
    trigger_type: 'on_answer',
    trigger_config: {},
    conditions: {
      groups: [{
        id: generateId(),
        conditions: [{
          id: generateId(),
          source: { type: 'question', questionId: SURVEY_Q_DROPDOWN_ID },
          operator: 'equals',
          values: ['freq_daily'],
        }],
        matchAll: true,
      }],
    },
    action_type: 'skip_to_question',
    action_config: { questionId: SURVEY_Q_FINAL_ID },
  },
  // Rule 4: End survey for users not interested in interview
  {
    id: RULE_4_ID,
    study_id: STUDY_ID,
    name: 'Thank non-interview users',
    position: 3,
    is_enabled: true,
    trigger_type: 'on_answer',
    trigger_config: {},
    conditions: {
      groups: [{
        id: generateId(),
        conditions: [{
          id: generateId(),
          source: { type: 'question', questionId: SURVEY_Q_FINAL_ID },
          operator: 'equals',
          values: ['false'],
        }],
        matchAll: true,
      }],
    },
    action_type: 'end_survey',
    action_config: {
      title: 'Thank You!',
      message: 'We appreciate your time and feedback.',
      redirectUrl: 'https://example.com/thank-you',
      redirectDelay: 5,
    },
  },
]

// =============================================================================
// PARTICIPANT DATA GENERATION
// =============================================================================

const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'James',
  'Mia', 'Benjamin', 'Charlotte', 'Lucas', 'Amelia', 'Henry', 'Harper', 'Alexander', 'Evelyn', 'Daniel']
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee']

const textResponses = {
  useCase: ['Team collaboration', 'Project management', 'Task tracking', 'Client projects', 'Remote work coordination'],
  workflow: ['I check the dashboard every morning, update tasks, then collaborate with my team throughout the day.',
    'I use it primarily for sprint planning and tracking our development progress.',
    'Daily standups start here - we review the board together and assign tasks.'],
  feedback: ['The search needs improvement', 'Love the mobile app!', 'Need better integrations', 'Great product overall',
    'Pricing could be more competitive', 'Documentation is excellent'],
}

function generateParticipant(index: number, isRejected: boolean) {
  const firstName = randomChoice(firstNames)
  const lastName = randomChoice(lastNames)
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() - randomInt(1, 30))

  return {
    id: generateId(),
    study_id: STUDY_ID,
    session_token: `session_${Date.now()}_${index}`,
    status: isRejected ? 'abandoned' : 'completed',
    started_at: baseDate.toISOString(),
    completed_at: isRejected ? null : new Date(baseDate.getTime() + randomInt(300000, 900000)).toISOString(),
    identifier_type: 'email',
    identifier_value: email,
    screening_result: isRejected ? 'rejected' : 'passed',
    country: randomChoice(['US', 'UK', 'CA', 'AU', 'DE']),
    metadata: { email, firstName, lastName, gender: randomChoice(['Male', 'Female', 'Non-binary']) },
  }
}

function generateResponses(participantId: string, isRejected: boolean) {
  const responses: any[] = []

  // Screening responses
  const ageOptions = ['age_18_24', 'age_25_34', 'age_35_44', 'age_45_54']
  responses.push({
    id: generateId(), participant_id: participantId, question_id: SCREENING_Q1_ID, study_id: STUDY_ID,
    response_value: { optionId: isRejected && Math.random() < 0.3 ? 'age_under18' : randomChoice(ageOptions) },
    response_time_ms: randomInt(2000, 5000),
  })
  responses.push({
    id: generateId(), participant_id: participantId, question_id: SCREENING_Q2_ID, study_id: STUDY_ID,
    response_value: { optionId: randomChoice(['us', 'uk', 'ca', 'au', 'de']) },
    response_time_ms: randomInt(1500, 4000),
  })
  responses.push({
    id: generateId(), participant_id: participantId, question_id: SCREENING_Q3_ID, study_id: STUDY_ID,
    response_value: { optionId: randomChoice(['exp_1_3', 'exp_3_5', 'exp_5_10', 'exp_10plus']) },
    response_time_ms: randomInt(2000, 5000),
  })
  responses.push({
    id: generateId(), participant_id: participantId, question_id: SCREENING_Q4_ID, study_id: STUDY_ID,
    response_value: { optionId: isRejected && Math.random() < 0.3 ? 'never' : randomChoice(['trial', 'lt_6mo', '6mo_1yr', '1yr_plus']) },
    response_time_ms: randomInt(2000, 5000),
  })
  responses.push({
    id: generateId(), participant_id: participantId, question_id: SCREENING_Q5_ID, study_id: STUDY_ID,
    response_value: isRejected && Math.random() < 0.3 ? 1 : randomInt(3, 5),
    response_time_ms: randomInt(2000, 4000),
  })

  if (isRejected) return responses

  // Pre-study
  responses.push({
    id: generateId(), participant_id: participantId, question_id: PRE_Q1_ID, study_id: STUDY_ID,
    response_value: 'I hope to share my honest feedback about the product experience.',
    response_time_ms: randomInt(15000, 30000),
  })
  responses.push({
    id: generateId(), participant_id: participantId, question_id: PRE_Q2_ID, study_id: STUDY_ID,
    response_value: { optionId: randomChoice(['productivity', 'collaboration', 'organization', 'reporting']) },
    response_time_ms: randomInt(3000, 8000),
  })

  // Survey responses
  responses.push({ id: generateId(), participant_id: participantId, question_id: SURVEY_Q_SHORT_TEXT_ID, study_id: STUDY_ID,
    response_value: randomChoice(textResponses.useCase), response_time_ms: randomInt(10000, 25000) })
  responses.push({ id: generateId(), participant_id: participantId, question_id: SURVEY_Q_LONG_TEXT_ID, study_id: STUDY_ID,
    response_value: randomChoice(textResponses.workflow), response_time_ms: randomInt(30000, 90000) })
  responses.push({ id: generateId(), participant_id: participantId, question_id: SURVEY_Q_SINGLE_ID, study_id: STUDY_ID,
    response_value: { optionId: randomChoice(['feat_dashboard', 'feat_reports', 'feat_collab', 'feat_automation', 'feat_mobile']) },
    response_time_ms: randomInt(5000, 12000) })
  responses.push({ id: generateId(), participant_id: participantId, question_id: SURVEY_Q_MULTI_ID, study_id: STUDY_ID,
    response_value: { optionIds: ['ben_time', 'ben_collab', 'ben_org'].slice(0, randomInt(1, 3)) },
    response_time_ms: randomInt(8000, 20000) })
  responses.push({ id: generateId(), participant_id: participantId, question_id: SURVEY_Q_DROPDOWN_ID, study_id: STUDY_ID,
    response_value: { optionId: randomChoice(['freq_daily', 'freq_once', 'freq_weekly']) },
    response_time_ms: randomInt(3000, 7000) })
  responses.push({ id: generateId(), participant_id: participantId, question_id: SURVEY_Q_YES_NO_ID, study_id: STUDY_ID,
    response_value: Math.random() > 0.4, response_time_ms: randomInt(2000, 5000) })
  responses.push({ id: generateId(), participant_id: participantId, question_id: SURVEY_Q_SCALE_STARS_ID, study_id: STUDY_ID,
    response_value: weightedRandom([5, 10, 20, 35, 30]) + 1, response_time_ms: randomInt(3000, 7000) })
  responses.push({ id: generateId(), participant_id: participantId, question_id: SURVEY_Q_SCALE_NUM_ID, study_id: STUDY_ID,
    response_value: weightedRandom([2, 3, 8, 20, 30, 25, 12]) + 1, response_time_ms: randomInt(3000, 7000) })
  responses.push({ id: generateId(), participant_id: participantId, question_id: SURVEY_Q_SCALE_EMOTIONS_ID, study_id: STUDY_ID,
    response_value: weightedRandom([5, 10, 20, 35, 30]) + 1, response_time_ms: randomInt(3000, 6000) })
  responses.push({ id: generateId(), participant_id: participantId, question_id: SURVEY_Q_NPS_ID, study_id: STUDY_ID,
    response_value: { value: weightedRandom([2, 2, 3, 4, 5, 8, 12, 18, 22, 16, 8]) }, response_time_ms: randomInt(3000, 8000) })
  responses.push({ id: generateId(), participant_id: participantId, question_id: SURVEY_Q_MATRIX_ID, study_id: STUDY_ID,
    response_value: { perf: 'good', reliability: 'great', ui: 'excellent', docs: 'good', value: 'great' },
    response_time_ms: randomInt(20000, 45000) })
  responses.push({ id: generateId(), participant_id: participantId, question_id: SURVEY_Q_RANKING_ID, study_id: STUDY_ID,
    response_value: ['ai', 'mobile', 'integrations', 'reporting', 'collab'].sort(() => Math.random() - 0.5),
    response_time_ms: randomInt(25000, 60000) })
  responses.push({ id: generateId(), participant_id: participantId, question_id: SURVEY_Q_PIPED_ID, study_id: STUDY_ID,
    response_value: 'I use it daily for this purpose and find it very helpful.', response_time_ms: randomInt(20000, 45000) })
  responses.push({ id: generateId(), participant_id: participantId, question_id: SURVEY_Q_FEEDBACK_ID, study_id: STUDY_ID,
    response_value: randomChoice(textResponses.feedback), response_time_ms: randomInt(30000, 90000) })
  responses.push({ id: generateId(), participant_id: participantId, question_id: SURVEY_Q_BRANCH_SKIP_ID, study_id: STUDY_ID,
    response_value: { optionId: randomChoice(['yes_detailed', 'no_done']) }, response_time_ms: randomInt(3000, 7000) })
  responses.push({ id: generateId(), participant_id: participantId, question_id: SURVEY_Q_FINAL_ID, study_id: STUDY_ID,
    response_value: Math.random() > 0.5, response_time_ms: randomInt(2000, 5000) })

  // Post-study
  responses.push({ id: generateId(), participant_id: participantId, question_id: POST_Q1_ID, study_id: STUDY_ID,
    response_value: { optionId: randomChoice(['great', 'good', 'okay']) }, response_time_ms: randomInt(3000, 7000) })

  return responses
}

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

async function main() {
  const log = (msg: string) => process.stdout.write(msg + '\n')
  log('🚀 Starting Ultimate Survey Seed...\n')

  // 1. Create Project
  log('📁 Creating project...')
  const { error: projErr } = await supabase.from('projects').insert({
    id: PROJECT_ID, user_id: USER_ID, name: 'Ultimate Survey Test Project',
    description: 'Comprehensive survey with ALL features for testing', is_archived: false,
  })
  if (projErr) { log('❌ Project error: ' + projErr.message); return }
  log('✅ Project created')

  // 2. Create Study
  log('📊 Creating study...')
  const { error: studyErr } = await supabase.from('studies').insert({
    id: STUDY_ID, project_id: PROJECT_ID, user_id: USER_ID, study_type: 'survey',
    title: 'Ultimate Feature Test Survey', description: 'Survey with every feature enabled',
    status: 'active', share_code: SHARE_CODE, language: 'en',
    settings: { studyFlow: studyFlowSettings },
    branding: { primaryColor: '#2563EB', backgroundColor: '#F8FAFC' },
    closing_rule: { type: 'responses', maxResponses: 500, enabled: true },
  })
  if (studyErr) { log('❌ Study error: ' + studyErr.message); return }
  log('✅ Study created')

  // 3. Create Custom Sections
  log('📑 Creating sections...')
  const { error: secErr } = await supabase.from('survey_custom_sections').insert(customSections)
  if (secErr) { log('❌ Sections error: ' + secErr.message); return }
  log('✅ ' + customSections.length + ' sections created')

  // 4. Create All Questions
  log('📝 Creating questions...')
  const allQuestions = [...screeningQuestions, ...preStudyQuestions, ...surveyQuestions, ...postStudyQuestions]
  const { error: qErr } = await supabase.from('study_flow_questions').insert(allQuestions)
  if (qErr) { log('❌ Questions error: ' + qErr.message); return }
  log('✅ ' + allQuestions.length + ' questions created')

  // 5. Create A/B Tests
  log('🧪 Creating A/B tests...')
  const { error: abErr } = await supabase.from('ab_test_variants').insert(abTestVariants)
  if (abErr) { log('❌ A/B error: ' + abErr.message); return }
  log('✅ ' + abTestVariants.length + ' A/B tests created')

  // 6. Create Variables
  log('📊 Creating variables...')
  const { error: varErr } = await supabase.from('survey_variables').insert(surveyVariables)
  if (varErr) { log('❌ Variables error: ' + varErr.message); return }
  log('✅ ' + surveyVariables.length + ' variables created')

  // 7. Create Rules
  log('⚡ Creating rules...')
  const { error: ruleErr } = await supabase.from('survey_rules').insert(surveyRules)
  if (ruleErr) { log('❌ Rules error: ' + ruleErr.message); return }
  log('✅ ' + surveyRules.length + ' rules created')

  // 8. Generate Participants & Responses
  const TOTAL = 100, REJECTED = 5
  log(`\n👥 Generating ${TOTAL} participants...`)

  const participants = []
  for (let i = 0; i < TOTAL; i++) {
    participants.push(generateParticipant(i, i < REJECTED))
  }
  participants.sort(() => Math.random() - 0.5)

  const { error: partErr } = await supabase.from('participants').insert(participants)
  if (partErr) { log('❌ Participants error: ' + partErr.message); return }
  log('✅ ' + participants.length + ' participants created')

  // 9. Generate Responses
  log('📋 Generating responses...')
  const allResponses: any[] = []
  for (const p of participants) {
    allResponses.push(...generateResponses(p.id, p.status === 'abandoned'))
  }

  // Insert in batches
  for (let i = 0; i < allResponses.length; i += 500) {
    const batch = allResponses.slice(i, i + 500)
    const { error } = await supabase.from('study_flow_responses').insert(batch)
    if (error) log('⚠️ Batch error: ' + error.message)
  }
  log('✅ ' + allResponses.length + ' responses created')

  // 10. A/B Assignments
  log('🎲 Creating A/B assignments...')
  const assignments = []
  for (const p of participants.filter(p => p.status === 'completed')) {
    for (const ab of abTestVariants) {
      assignments.push({
        id: generateId(), participant_id: p.id, ab_test_variant_id: ab.id,
        assigned_variant: Math.random() < 0.5 ? 'A' : 'B', assigned_at: p.started_at,
      })
    }
  }
  const { error: assignErr } = await supabase.from('participant_variant_assignments').insert(assignments)
  if (assignErr) log('⚠️ Assignments error: ' + assignErr.message)
  else log('✅ ' + assignments.length + ' A/B assignments created')

  // Summary
  log('\n' + '='.repeat(50))
  log('✨ SEED COMPLETE!')
  log('='.repeat(50))
  log(`
📁 Project ID: ${PROJECT_ID}
📊 Study ID: ${STUDY_ID}
🔗 Share Code: ${SHARE_CODE}

Features Included:
✅ Welcome, Agreement, Screening (5 questions)
✅ Demographics (2 sections, 9 fields)
✅ Pre-study questions (2)
✅ Survey questions (18) - ALL 8 types
✅ Post-study questions (2)
✅ Thank you with redirect

Advanced Features:
✅ Answer piping ({Q:id} syntax)
✅ Display logic (conditional visibility)
✅ Survey branching (skip to question/section)
✅ Numeric branching (for scales)
✅ Text branching (is_answered/is_empty)
✅ Grouped branching (checkbox ANY/ALL)
✅ Advanced branching (cross-question)
✅ Compound screening conditions
✅ Scale branching in screening
✅ A/B testing (${abTestVariants.length} tests)
✅ Survey rules (${surveyRules.length} rules)
✅ Variables (score, classification, counter)
✅ Custom sections (${customSections.length})

Participants: ${TOTAL} total (${REJECTED} rejected, ${TOTAL - REJECTED} completed)
Responses: ${allResponses.length} total
`)
}

main().catch(e => process.stderr.write('Error: ' + e.message + '\n'))
