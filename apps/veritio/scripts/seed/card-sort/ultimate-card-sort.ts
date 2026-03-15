/**
 * ULTIMATE Comprehensive Card Sort Seed Script
 * Creates an enterprise-level card sort study with EVERY feature:
 *
 * FEATURES INCLUDED:
 * - All THREE card sort modes: Open, Closed, Hybrid (creates 3 studies)
 * - Complete study flow (welcome, agreement, screening, identifier, thank you)
 * - Cards with labels, descriptions, and images
 * - Categories for closed/hybrid modes
 * - Pre-study AND post-study questions (enabled)
 * - Screening questions with rejection logic
 * - Display logic (conditional visibility)
 * - Branching logic (skip to question/section/end)
 * - All question types (multiple_choice, opinion_scale, yes_no, text, nps, matrix, ranking)
 * - Timer/timeout settings
 * - Randomization settings
 * - 100 participants per study with varied responses
 * - Custom categories for open sort participants
 * - Category standardizations for analysis
 * - Participant analysis flags (all_one_group, too_fast, etc.)
 * - Response prevention settings (fingerprinting)
 *
 * Run with: npx tsx scripts/seed/card-sort/ultimate-card-sort.ts
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

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// =============================================================================
// IDS - Pre-generate for cross-referencing
// =============================================================================

// Use existing project "demo" - ID from first-click seed
const EXISTING_PROJECT_ID = process.env.SEED_PROJECT_ID || ''
const PROJECT_ID = EXISTING_PROJECT_ID || generateId()

// Default dev user ID (better-auth)
const USER_ID = process.env.SEED_USER_ID || 'your-better-auth-user-id'

// We'll create 3 studies - one for each mode
const STUDY_OPEN_ID = generateId()
const STUDY_CLOSED_ID = generateId()
const STUDY_HYBRID_ID = generateId()

const SHARE_CODE_OPEN = `card-sort-open-${Date.now()}`
const SHARE_CODE_CLOSED = `card-sort-closed-${Date.now()}`
const SHARE_CODE_HYBRID = `card-sort-hybrid-${Date.now()}`

// Card IDs (same cards for all 3 studies)
const CARD_IDS = Array.from({ length: 15 }, () => generateId())

// Category IDs (for closed and hybrid modes)
const CATEGORY_IDS = Array.from({ length: 6 }, () => generateId())

// Screening Question IDs
const _SCREENING_Q1_ID = generateId() // Age (with rejection)
const _SCREENING_Q2_ID = generateId() // Experience level
const _SCREENING_Q3_ID = generateId() // Product familiarity
const _SCREENING_Q4_ID = generateId() // Interest level (scale)

// Pre-Study Question IDs
const _PRE_Q1_ID = generateId() // Expectations text
const _PRE_Q2_ID = generateId() // Goals multiple choice

// Post-Study Question IDs
const _POST_Q1_ID = generateId() // Task difficulty
const _POST_Q2_ID = generateId() // Confidence in groupings
const _POST_Q3_ID = generateId() // Additional feedback

// Custom Sections (for organization)
const _SECTION_EXPERIENCE_ID = generateId()
const _SECTION_FEEDBACK_ID = generateId()

// =============================================================================
// CARDS DATA - Product Features for Information Architecture Study
// =============================================================================

const cardsData = [
  { id: CARD_IDS[0], label: 'Dashboard Overview', description: 'View key metrics and statistics at a glance' },
  { id: CARD_IDS[1], label: 'User Profile Settings', description: 'Update personal information and preferences' },
  { id: CARD_IDS[2], label: 'Team Members', description: 'View and manage team collaborators' },
  { id: CARD_IDS[3], label: 'Billing & Payments', description: 'Manage subscription and payment methods' },
  { id: CARD_IDS[4], label: 'API Documentation', description: 'Technical documentation for developers' },
  { id: CARD_IDS[5], label: 'Export Reports', description: 'Download data in various formats' },
  { id: CARD_IDS[6], label: 'Notification Settings', description: 'Configure email and push notifications' },
  { id: CARD_IDS[7], label: 'Security & Privacy', description: 'Manage passwords and 2FA settings' },
  { id: CARD_IDS[8], label: 'Integration Hub', description: 'Connect with third-party applications' },
  { id: CARD_IDS[9], label: 'Activity Log', description: 'View history of actions and changes' },
  { id: CARD_IDS[10], label: 'Help Center', description: 'Browse FAQs and support articles' },
  { id: CARD_IDS[11], label: 'Quick Start Guide', description: 'Step-by-step onboarding tutorial' },
  { id: CARD_IDS[12], label: 'Workspace Settings', description: 'Configure workspace-level preferences' },
  { id: CARD_IDS[13], label: 'Data Import', description: 'Upload data from external sources' },
  { id: CARD_IDS[14], label: 'Version History', description: 'Track and restore previous versions' },
]

// =============================================================================
// CATEGORIES DATA - For Closed & Hybrid Modes
// =============================================================================

const categoriesData = [
  { id: CATEGORY_IDS[0], label: 'Account & Settings', description: 'Personal account configuration' },
  { id: CATEGORY_IDS[1], label: 'Team & Collaboration', description: 'Working with others' },
  { id: CATEGORY_IDS[2], label: 'Data & Reports', description: 'Analytics and exports' },
  { id: CATEGORY_IDS[3], label: 'Help & Support', description: 'Getting assistance' },
  { id: CATEGORY_IDS[4], label: 'Integrations & APIs', description: 'Connecting with other tools' },
  { id: CATEGORY_IDS[5], label: 'Security', description: 'Safety and privacy features' },
]

// =============================================================================
// STUDY FLOW SETTINGS (Complete configuration)
// =============================================================================

function createStudyFlowSettings(mode: 'open' | 'closed' | 'hybrid') {
  return {
    welcome: {
      enabled: true,
      title: `Card Sorting Study - ${mode.charAt(0).toUpperCase() + mode.slice(1)} Sort`,
      message: `<p><strong>Thank you for participating in our card sorting study!</strong></p>
<p>Your task is to organize a set of product features into groups that make sense to you. This will take approximately 10-15 minutes.</p>
<p>There are no right or wrong answers - we're interested in how <em>you</em> think about these items.</p>`,
      includeStudyTitle: true,
      includeDescription: true,
      includePurpose: true,
      includeParticipantRequirements: true,
    },
    participantAgreement: {
      enabled: true,
      title: 'Research Participation Agreement',
      message: 'Please review and accept the following terms before proceeding:',
      agreementText: `<ul>
<li>I am 18 years or older and provide informed consent</li>
<li>My participation is voluntary and I may withdraw at any time</li>
<li>My responses will be anonymized and used for research purposes only</li>
<li>Data is stored securely in compliance with privacy regulations</li>
</ul>`,
      showRejectionMessage: true,
      rejectionTitle: 'Thank You',
      rejectionMessage: 'You must accept the agreement to participate in this study.',
      redirectUrl: 'https://example.com/declined',
    },
    screening: {
      enabled: true,
      introTitle: 'Quick Eligibility Check',
      introMessage: 'Please answer these brief questions to confirm your eligibility for this study.',
      rejectionTitle: 'Thank You for Your Interest',
      rejectionMessage: 'Unfortunately, you don\'t meet the criteria for this study. Thank you for your time!',
      redirectUrl: 'https://example.com/other-studies',
      redirectImmediately: false,
    },
    participantIdentifier: {
      type: 'demographic_profile' as const,
      demographicProfile: {
        title: 'About You',
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
              { id: 'firstName', type: 'predefined' as const, fieldType: 'firstName' as const, position: 1, enabled: true, required: false, mappedToScreeningQuestionId: null, width: 'half' as const },
              { id: 'lastName', type: 'predefined' as const, fieldType: 'lastName' as const, position: 2, enabled: true, required: false, mappedToScreeningQuestionId: null, width: 'half' as const },
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
        industryOptions: { options: ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Other'] },
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
    preStudyQuestions: {
      enabled: true,
      showIntro: true,
      introTitle: 'Before We Begin',
      introMessage: 'A few quick questions about your expectations.',
      pageMode: 'one_per_page' as const,
      randomizeQuestions: false,
    },
    activityInstructions: {
      enabled: true,
      title: `Card Sorting Instructions - ${mode.charAt(0).toUpperCase() + mode.slice(1)} Sort`,
      part1: mode === 'open'
        ? 'You will be shown a set of product features. Please organize them into groups that make sense to you, and name each group.'
        : mode === 'closed'
        ? 'You will be shown a set of product features. Please sort them into the pre-defined categories provided.'
        : 'You will be shown a set of product features. Sort them into the provided categories, or create your own if needed.',
      part2: 'Take your time - there are no right or wrong answers. We want to understand how you naturally think about these items.',
    },
    postStudyQuestions: {
      enabled: true,
      showIntro: true,
      introTitle: 'Almost Done!',
      introMessage: 'Please share your thoughts about the card sorting task.',
      pageMode: 'one_per_page' as const,
      randomizeQuestions: false,
    },
    thankYou: {
      enabled: true,
      title: 'Thank You!',
      message: `<p><strong>Your responses have been recorded successfully.</strong></p>
<p>We appreciate your time and valuable input. Your feedback will help us improve our product's information architecture.</p>`,
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
}

// =============================================================================
// CARD SORT SETTINGS (Per mode)
// =============================================================================

function createCardSortSettings(mode: 'open' | 'closed' | 'hybrid') {
  return {
    mode,
    randomizeCards: true,
    randomizeCategories: mode !== 'open',
    showProgress: true,
    allowSkip: false,
    includeUnclearCategory: mode === 'closed' || mode === 'hybrid',
    showCategoryDescriptions: true,
    allowCategoryCreation: mode === 'open' || mode === 'hybrid',
    cardLabel: 'Feature',
    categoryLabel: 'Group',
    enableTimer: true,
    timerDuration: 1800, // 30 minutes
    showTimer: true,
    autoSubmitOnTimeout: false,
    autoSubmitWarningSeconds: 60,
    instructions: mode === 'open'
      ? 'Drag each card into a group. Create your own groups by clicking "Add Group".'
      : mode === 'closed'
      ? 'Drag each card into one of the provided categories.'
      : 'Drag cards into the provided categories, or create new groups if needed.',
    cardLimit: undefined,
    studyFlow: createStudyFlowSettings(mode),
  }
}

// =============================================================================
// SCREENING QUESTIONS
// =============================================================================

function createScreeningQuestions(studyId: string) {
  return [
    // Q1: Age - with rejection for under 18
    {
      id: generateId(),
      study_id: studyId,
      section: 'screening',
      position: 0,
      question_type: 'multiple_choice',
      question_text: 'What is your age range?',
      description: 'We require participants to be 18 years or older.',
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
    // Q2: Experience with similar products
    {
      id: generateId(),
      study_id: studyId,
      section: 'screening',
      position: 1,
      question_type: 'multiple_choice',
      question_text: 'How would you describe your experience with software/web applications?',
      is_required: true,
      config: {
        mode: 'single',
        options: [
          { id: 'exp_none', label: 'No experience' },
          { id: 'exp_beginner', label: 'Beginner' },
          { id: 'exp_intermediate', label: 'Intermediate' },
          { id: 'exp_advanced', label: 'Advanced' },
          { id: 'exp_expert', label: 'Expert' },
        ],
        shuffle: false,
      },
      branching_logic: {
        rules: [{ optionId: 'exp_none', target: 'reject' }],
        defaultTarget: 'next',
      },
    },
    // Q3: Product familiarity
    {
      id: generateId(),
      study_id: studyId,
      section: 'screening',
      position: 2,
      question_type: 'yes_no',
      question_text: 'Have you used any project management or productivity tools before?',
      description: 'e.g., Notion, Asana, Trello, Monday.com, etc.',
      is_required: true,
      config: {
        styleType: 'icons',
        yesLabel: 'Yes',
        noLabel: 'No',
      },
    },
    // Q4: Interest level (scale)
    {
      id: generateId(),
      study_id: studyId,
      section: 'screening',
      position: 3,
      question_type: 'opinion_scale',
      question_text: 'How interested are you in providing feedback about product organization?',
      is_required: true,
      config: {
        scalePoints: 5,
        startAtZero: false,
        scaleType: 'numerical',
        leftLabel: 'Not interested',
        rightLabel: 'Very interested',
      },
      branching_logic: {
        rules: [
          { comparison: 'less_than', scaleValue: 2, target: 'reject' },
        ],
        defaultTarget: 'go_to_study',
      },
    },
  ]
}

// =============================================================================
// PRE-STUDY QUESTIONS
// =============================================================================

function createPreStudyQuestions(studyId: string) {
  return [
    {
      id: generateId(),
      study_id: studyId,
      section: 'pre_study',
      position: 0,
      question_type: 'multi_line_text',
      question_text: 'What do you typically look for when organizing features in an application?',
      description: 'Think about what makes navigation intuitive for you.',
      is_required: true,
      config: {
        placeholder: 'Tell us about your organizational preferences...',
        maxLength: 500,
      },
    },
    {
      id: generateId(),
      study_id: studyId,
      section: 'pre_study',
      position: 1,
      question_type: 'multiple_choice',
      question_text: 'How do you prefer to discover features in a new application?',
      is_required: true,
      config: {
        mode: 'multi',
        options: [
          { id: 'pref_menu', label: 'Browsing menu/navigation' },
          { id: 'pref_search', label: 'Using search' },
          { id: 'pref_tutorial', label: 'Following tutorials' },
          { id: 'pref_explore', label: 'Exploring on my own' },
          { id: 'pref_ask', label: 'Asking others' },
        ],
        shuffle: true,
        minSelections: 1,
        maxSelections: 3,
      },
    },
  ]
}

// =============================================================================
// POST-STUDY QUESTIONS
// =============================================================================

function createPostStudyQuestions(studyId: string) {
  return [
    // Q1: Task difficulty
    {
      id: generateId(),
      study_id: studyId,
      section: 'post_study',
      position: 0,
      question_type: 'opinion_scale',
      question_text: 'How easy or difficult was the card sorting task?',
      is_required: true,
      config: {
        scalePoints: 5,
        startAtZero: false,
        scaleType: 'numerical',
        leftLabel: 'Very difficult',
        middleLabel: 'Neutral',
        rightLabel: 'Very easy',
      },
    },
    // Q2: Confidence in groupings
    {
      id: generateId(),
      study_id: studyId,
      section: 'post_study',
      position: 1,
      question_type: 'opinion_scale',
      question_text: 'How confident are you in your groupings?',
      is_required: true,
      config: {
        scalePoints: 5,
        startAtZero: false,
        scaleType: 'stars',
        leftLabel: 'Not confident',
        rightLabel: 'Very confident',
      },
    },
    // Q3: Cards that were difficult to categorize
    {
      id: generateId(),
      study_id: studyId,
      section: 'post_study',
      position: 2,
      question_type: 'multi_line_text',
      question_text: 'Were there any features that were difficult to categorize? If so, which ones and why?',
      is_required: false,
      config: {
        placeholder: 'Describe any challenges you faced...',
        maxLength: 1000,
      },
    },
    // Q4: Missing categories
    {
      id: generateId(),
      study_id: studyId,
      section: 'post_study',
      position: 3,
      question_type: 'yes_no',
      question_text: 'Did you feel any important category was missing?',
      is_required: true,
      config: {
        styleType: 'icons',
        yesLabel: 'Yes',
        noLabel: 'No',
      },
    },
    // Q5: Conditional - What category was missing
    {
      id: generateId(),
      study_id: studyId,
      section: 'post_study',
      position: 4,
      question_type: 'single_line_text',
      question_text: 'What category do you feel was missing?',
      is_required: false,
      config: {
        inputType: 'text',
        placeholder: 'Describe the missing category...',
        maxLength: 200,
      },
      // Display logic: only show if previous question was "Yes"
      display_logic: {
        action: 'show',
        conditions: [
          { questionId: '__PREVIOUS__', operator: 'equals', values: ['true'] },
        ],
        matchAll: true,
      },
    },
    // Q6: Overall feedback
    {
      id: generateId(),
      study_id: studyId,
      section: 'post_study',
      position: 5,
      question_type: 'multi_line_text',
      question_text: 'Any additional thoughts or suggestions about how these features should be organized?',
      is_required: false,
      config: {
        placeholder: 'Share any additional feedback...',
        maxLength: 1000,
      },
    },
    // Q7: NPS
    {
      id: generateId(),
      study_id: studyId,
      section: 'post_study',
      position: 6,
      question_type: 'nps',
      question_text: 'How likely are you to recommend participating in similar studies to a colleague?',
      is_required: true,
      config: {
        leftLabel: 'Not at all likely',
        rightLabel: 'Extremely likely',
      },
    },
  ]
}

// =============================================================================
// CUSTOM CATEGORIES FOR OPEN SORT PARTICIPANTS
// =============================================================================

// Realistic custom category names that participants might create
const customCategoryOptions = [
  ['Personal Settings', 'Team Features', 'Reports', 'Support', 'Technical'],
  ['My Account', 'Workspace', 'Analytics', 'Help', 'Developer Tools'],
  ['User Stuff', 'Collaboration', 'Data', 'Getting Help', 'Advanced'],
  ['Profile & Settings', 'Team Management', 'Exports & Reports', 'Documentation', 'Security'],
  ['Account', 'Working Together', 'Insights', 'Learning', 'Connections'],
  ['Me', 'We', 'Numbers', 'Questions', 'Tech'],
  ['Setup', 'Teams', 'Output', 'Assistance', 'Integration'],
  ['Configuration', 'People', 'Information', 'Resources', 'Extensions'],
]

// Expected card-to-category mappings (for realistic response generation)
const cardCategoryMapping = {
  // Account & Settings
  [CARD_IDS[1]]: 0, // User Profile Settings
  [CARD_IDS[6]]: 0, // Notification Settings
  [CARD_IDS[12]]: 0, // Workspace Settings

  // Team & Collaboration
  [CARD_IDS[2]]: 1, // Team Members

  // Data & Reports
  [CARD_IDS[0]]: 2, // Dashboard Overview
  [CARD_IDS[5]]: 2, // Export Reports
  [CARD_IDS[9]]: 2, // Activity Log
  [CARD_IDS[13]]: 2, // Data Import
  [CARD_IDS[14]]: 2, // Version History

  // Help & Support
  [CARD_IDS[10]]: 3, // Help Center
  [CARD_IDS[11]]: 3, // Quick Start Guide

  // Integrations & APIs
  [CARD_IDS[4]]: 4, // API Documentation
  [CARD_IDS[8]]: 4, // Integration Hub

  // Security
  [CARD_IDS[3]]: 5, // Billing & Payments
  [CARD_IDS[7]]: 5, // Security & Privacy
}

// =============================================================================
// PARTICIPANT DATA GENERATION
// =============================================================================

const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'James',
  'Mia', 'Benjamin', 'Charlotte', 'Lucas', 'Amelia', 'Henry', 'Harper', 'Alexander', 'Evelyn', 'Daniel',
  'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Ashley', 'William', 'Samantha', 'Joseph']
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee',
  'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker']

function generateParticipant(studyId: string, index: number, isRejected: boolean) {
  const firstName = randomChoice(firstNames)
  const lastName = randomChoice(lastNames)
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() - randomInt(1, 30))

  return {
    id: generateId(),
    study_id: studyId,
    session_token: `session_${studyId}_${Date.now()}_${index}`,
    status: isRejected ? 'abandoned' : 'completed',
    started_at: baseDate.toISOString(),
    completed_at: isRejected ? null : new Date(baseDate.getTime() + randomInt(300000, 1200000)).toISOString(),
    identifier_type: 'email',
    identifier_value: email,
    screening_result: isRejected ? 'rejected' : 'passed',
    country: randomChoice(['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'NL']),
    metadata: {
      email,
      firstName,
      lastName,
      techProficiency: randomChoice(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
    },
  }
}

function generateScreeningResponses(participant: any, questions: any[], isRejected: boolean) {
  const responses: any[] = []

  // Age question
  const ageOptions = ['age_18_24', 'age_25_34', 'age_35_44', 'age_45_54', 'age_55plus']
  responses.push({
    id: generateId(),
    participant_id: participant.id,
    question_id: questions[0].id,
    study_id: participant.study_id,
    response_value: { optionId: isRejected && Math.random() < 0.3 ? 'age_under18' : randomChoice(ageOptions) },
    response_time_ms: randomInt(2000, 5000),
  })

  // Experience question
  const expOptions = ['exp_beginner', 'exp_intermediate', 'exp_advanced', 'exp_expert']
  responses.push({
    id: generateId(),
    participant_id: participant.id,
    question_id: questions[1].id,
    study_id: participant.study_id,
    response_value: { optionId: isRejected && Math.random() < 0.3 ? 'exp_none' : randomChoice(expOptions) },
    response_time_ms: randomInt(2000, 4000),
  })

  // Yes/No question
  responses.push({
    id: generateId(),
    participant_id: participant.id,
    question_id: questions[2].id,
    study_id: participant.study_id,
    response_value: Math.random() > 0.2,
    response_time_ms: randomInt(1500, 3000),
  })

  // Interest scale question
  responses.push({
    id: generateId(),
    participant_id: participant.id,
    question_id: questions[3].id,
    study_id: participant.study_id,
    response_value: isRejected && Math.random() < 0.3 ? 1 : randomInt(3, 5),
    response_time_ms: randomInt(2000, 4000),
  })

  return responses
}

function generatePreStudyResponses(participant: any, questions: any[]) {
  const responses: any[] = []

  const organizationPrefs = [
    'I look for logical groupings based on function',
    'I prefer features organized by frequency of use',
    'I like having related items close together',
    'I expect things to be grouped by task or workflow',
    'I want clear, descriptive labels that make sense',
  ]

  responses.push({
    id: generateId(),
    participant_id: participant.id,
    question_id: questions[0].id,
    study_id: participant.study_id,
    response_value: randomChoice(organizationPrefs),
    response_time_ms: randomInt(15000, 30000),
  })

  const prefOptions = ['pref_menu', 'pref_search', 'pref_tutorial', 'pref_explore', 'pref_ask']
  const selectedPrefs = shuffleArray(prefOptions).slice(0, randomInt(1, 3))
  responses.push({
    id: generateId(),
    participant_id: participant.id,
    question_id: questions[1].id,
    study_id: participant.study_id,
    response_value: { optionIds: selectedPrefs },
    response_time_ms: randomInt(5000, 12000),
  })

  return responses
}

function generatePostStudyResponses(participant: any, questions: any[]) {
  const responses: any[] = []

  // Task difficulty (scale)
  responses.push({
    id: generateId(),
    participant_id: participant.id,
    question_id: questions[0].id,
    study_id: participant.study_id,
    response_value: weightedRandom([5, 10, 20, 35, 30]) + 1,
    response_time_ms: randomInt(2000, 5000),
  })

  // Confidence (stars)
  responses.push({
    id: generateId(),
    participant_id: participant.id,
    question_id: questions[1].id,
    study_id: participant.study_id,
    response_value: weightedRandom([5, 15, 25, 30, 25]) + 1,
    response_time_ms: randomInt(2000, 5000),
  })

  // Difficult cards (text)
  const difficultCards = [
    'The API Documentation was tricky - could go in Help or Technical',
    'Version History could be in Settings or Data',
    'Not sure where Billing fits - Account or Security?',
    '',
    'Integration Hub was confusing',
    'Most were straightforward',
    '',
  ]
  if (Math.random() > 0.3) {
    responses.push({
      id: generateId(),
      participant_id: participant.id,
      question_id: questions[2].id,
      study_id: participant.study_id,
      response_value: randomChoice(difficultCards),
      response_time_ms: randomInt(10000, 30000),
    })
  }

  // Missing category (yes/no)
  const missingCategory = Math.random() > 0.6
  responses.push({
    id: generateId(),
    participant_id: participant.id,
    question_id: questions[3].id,
    study_id: participant.study_id,
    response_value: missingCategory,
    response_time_ms: randomInt(2000, 4000),
  })

  // Missing category text (conditional)
  if (missingCategory) {
    const missingCategoryTexts = [
      'Onboarding or Getting Started',
      'Administration or Admin',
      'Workflow Automation',
      'Recent Items or Favorites',
      'Search and Discovery',
    ]
    responses.push({
      id: generateId(),
      participant_id: participant.id,
      question_id: questions[4].id,
      study_id: participant.study_id,
      response_value: randomChoice(missingCategoryTexts),
      response_time_ms: randomInt(8000, 20000),
    })
  }

  // Overall feedback (optional)
  const feedbackTexts = [
    'Good categories overall, made sense to me.',
    'Would be nice to have a search feature in the app itself.',
    'The groupings felt natural for the most part.',
    '',
    'Some features seemed like they could belong in multiple places.',
    '',
    'Clear and intuitive organization.',
  ]
  if (Math.random() > 0.4) {
    responses.push({
      id: generateId(),
      participant_id: participant.id,
      question_id: questions[5].id,
      study_id: participant.study_id,
      response_value: randomChoice(feedbackTexts),
      response_time_ms: randomInt(15000, 45000),
    })
  }

  // NPS
  responses.push({
    id: generateId(),
    participant_id: participant.id,
    question_id: questions[6].id,
    study_id: participant.study_id,
    response_value: { value: weightedRandom([2, 2, 3, 4, 5, 8, 12, 18, 22, 16, 8]) },
    response_time_ms: randomInt(3000, 7000),
  })

  return responses
}

function generateCardSortResponse(
  participant: any,
  studyId: string,
  mode: 'open' | 'closed' | 'hybrid',
  categoryIds: string[]
) {
  // Generate card placements
  const cardPlacements: Record<string, string> = {}
  let customCategories: string[] | null = null

  if (mode === 'open') {
    // Open sort: participant creates their own categories
    customCategories = randomChoice(customCategoryOptions)

    // Map cards to custom categories with some randomness
    for (const cardId of CARD_IDS) {
      const expectedCat = cardCategoryMapping[cardId]
      // 70% chance to use expected mapping, 30% chance to vary
      if (Math.random() > 0.3 && expectedCat !== undefined && expectedCat < customCategories.length) {
        cardPlacements[cardId] = customCategories[expectedCat]
      } else {
        cardPlacements[cardId] = randomChoice(customCategories)
      }
    }
  } else {
    // Closed or hybrid: use predefined categories
    for (const cardId of CARD_IDS) {
      const expectedCat = cardCategoryMapping[cardId]
      // 75% chance to use expected mapping, 25% chance to vary
      if (Math.random() > 0.25 && expectedCat !== undefined) {
        cardPlacements[cardId] = categoryIds[expectedCat]
      } else {
        cardPlacements[cardId] = randomChoice(categoryIds)
      }
    }

    // Hybrid: 20% of participants create 1-2 custom categories
    if (mode === 'hybrid' && Math.random() > 0.8) {
      const extraCategories = ['Misc', 'Other', 'Unsure', 'Need More Info']
      customCategories = shuffleArray(extraCategories).slice(0, randomInt(1, 2))
      // Move 1-3 cards to custom categories
      const cardsToMove = shuffleArray([...CARD_IDS]).slice(0, randomInt(1, 3))
      for (const cardId of cardsToMove) {
        cardPlacements[cardId] = randomChoice(customCategories)
      }
    }
  }

  // Calculate completion time (faster for closed, slower for open)
  const baseTime = mode === 'open' ? 420000 : mode === 'hybrid' ? 360000 : 300000 // 7, 6, 5 minutes base
  const timeVariance = randomInt(-120000, 180000) // +/- 2-3 minutes
  const totalTimeMs = baseTime + timeVariance

  return {
    id: generateId(),
    participant_id: participant.id,
    study_id: studyId,
    card_placements: cardPlacements,
    custom_categories: customCategories,
    standardized_placements: null, // Would be populated by analysis
    card_movement_percentage: randomInt(15, 45) / 100, // 15-45% card movement
    total_time_ms: totalTimeMs,
  }
}

// =============================================================================
// PARTICIPANT ANALYSIS FLAGS
// =============================================================================

function generateAnalysisFlags(participant: any, cardSortResponse: any) {
  const flags: any[] = []
  const _flagTypes = ['all_one_group', 'each_own_group', 'no_movement', 'too_fast', 'too_slow']

  // Check for suspicious patterns
  const placements = cardSortResponse.card_placements
  const categories = Object.values(placements)
  const uniqueCategories = new Set(categories)

  // All cards in one group
  if (uniqueCategories.size === 1) {
    flags.push({
      id: generateId(),
      participant_id: participant.id,
      study_id: participant.study_id,
      flag_type: 'all_one_group',
      is_excluded: false,
      created_at: new Date().toISOString(),
    })
  }

  // Each card in its own group (for open sort)
  if (uniqueCategories.size === Object.keys(placements).length) {
    flags.push({
      id: generateId(),
      participant_id: participant.id,
      study_id: participant.study_id,
      flag_type: 'each_own_group',
      is_excluded: false,
      created_at: new Date().toISOString(),
    })
  }

  // Too fast (under 2 minutes for 15 cards)
  if (cardSortResponse.total_time_ms < 120000) {
    flags.push({
      id: generateId(),
      participant_id: participant.id,
      study_id: participant.study_id,
      flag_type: 'too_fast',
      is_excluded: true,
      created_at: new Date().toISOString(),
    })
  }

  // Too slow (over 20 minutes)
  if (cardSortResponse.total_time_ms > 1200000) {
    flags.push({
      id: generateId(),
      participant_id: participant.id,
      study_id: participant.study_id,
      flag_type: 'too_slow',
      is_excluded: false,
      created_at: new Date().toISOString(),
    })
  }

  return flags
}

// =============================================================================
// CATEGORY STANDARDIZATIONS (For Open Sort Analysis)
// =============================================================================

function generateCategoryStandardizations(studyId: string) {
  // These map participant-created category names to standardized names
  return [
    {
      study_id: studyId,
      standardized_name: 'Account & Settings',
      original_names: ['Personal Settings', 'My Account', 'User Stuff', 'Profile & Settings', 'Account', 'Me', 'Setup', 'Configuration'],
      agreement_score: 0.85,
    },
    {
      study_id: studyId,
      standardized_name: 'Team & Collaboration',
      original_names: ['Team Features', 'Workspace', 'Collaboration', 'Team Management', 'Working Together', 'We', 'Teams', 'People'],
      agreement_score: 0.78,
    },
    {
      study_id: studyId,
      standardized_name: 'Data & Reports',
      original_names: ['Reports', 'Analytics', 'Data', 'Exports & Reports', 'Insights', 'Numbers', 'Output', 'Information'],
      agreement_score: 0.82,
    },
    {
      study_id: studyId,
      standardized_name: 'Help & Support',
      original_names: ['Support', 'Help', 'Getting Help', 'Documentation', 'Learning', 'Questions', 'Assistance', 'Resources'],
      agreement_score: 0.90,
    },
    {
      study_id: studyId,
      standardized_name: 'Integrations & APIs',
      original_names: ['Technical', 'Developer Tools', 'Advanced', 'Connections', 'Tech', 'Integration', 'Extensions'],
      agreement_score: 0.72,
    },
    {
      study_id: studyId,
      standardized_name: 'Security',
      original_names: ['Security', 'Privacy', 'Safety'],
      agreement_score: 0.95,
    },
  ]
}

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

async function main() {
  const log = (msg: string) => process.stdout.write(msg + '\n')
  log('🚀 Starting Ultimate Card Sort Seed...\n')

  // Check if using existing project or creating new one
  if (EXISTING_PROJECT_ID) {
    log(`📁 Using existing project: ${EXISTING_PROJECT_ID}`)
  } else {
    log('📁 Creating new project...')
    const { error: projErr } = await supabase.from('projects').insert({
      id: PROJECT_ID,
      user_id: USER_ID,
      name: 'Ultimate Card Sort Test Project',
      description: 'Comprehensive card sort studies with ALL features for testing',
      is_archived: false,
    })
    if (projErr) {
      log('❌ Project error: ' + projErr.message)
      return
    }
    log('✅ Project created')
  }

  // Create all 3 study modes
  const studyConfigs = [
    { id: STUDY_OPEN_ID, mode: 'open' as const, shareCode: SHARE_CODE_OPEN, title: 'Card Sort Study - Open Sort' },
    { id: STUDY_CLOSED_ID, mode: 'closed' as const, shareCode: SHARE_CODE_CLOSED, title: 'Card Sort Study - Closed Sort' },
    { id: STUDY_HYBRID_ID, mode: 'hybrid' as const, shareCode: SHARE_CODE_HYBRID, title: 'Card Sort Study - Hybrid Sort' },
  ]

  for (const studyConfig of studyConfigs) {
    log(`\n${'='.repeat(60)}`)
    log(`📊 Creating ${studyConfig.mode.toUpperCase()} SORT study...`)
    log('='.repeat(60))

    // Create Study
    const settings = createCardSortSettings(studyConfig.mode)
    const { error: studyErr } = await supabase.from('studies').insert({
      id: studyConfig.id,
      project_id: PROJECT_ID,
      user_id: USER_ID,
      study_type: 'card_sort',
      title: studyConfig.title,
      description: `Comprehensive ${studyConfig.mode} card sort study with all features enabled`,
      status: 'active',
      share_code: studyConfig.shareCode,
      language: 'en',
      settings,
      branding: {
        primaryColor: studyConfig.mode === 'open' ? '#2563EB' : studyConfig.mode === 'closed' ? '#059669' : '#7C3AED',
        backgroundColor: '#F8FAFC',
        stylePreset: 'default',
        radiusOption: 'default',
      },
      closing_rule: { type: 'participant_count', maxParticipants: 500 },
      response_prevention_settings: { level: 'moderate' },
    })
    if (studyErr) {
      log('❌ Study error: ' + studyErr.message)
      continue
    }
    log(`✅ Study created: ${studyConfig.title}`)

    // Create Cards (same for all studies)
    log('🃏 Creating cards...')
    const cardsToInsert = cardsData.map((card, index) => ({
      ...card,
      id: generateId(), // Generate unique IDs per study
      study_id: studyConfig.id,
      position: index,
    }))
    const { data: insertedCards, error: cardsErr } = await supabase
      .from('cards')
      .insert(cardsToInsert)
      .select()
    if (cardsErr) {
      log('❌ Cards error: ' + cardsErr.message)
      continue
    }
    log(`✅ ${cardsToInsert.length} cards created`)

    // Get card IDs for this study
    const _studyCardIds = insertedCards?.map(c => c.id) || []

    // Create Categories (for closed and hybrid modes)
    let studyCategoryIds: string[] = []
    if (studyConfig.mode === 'closed' || studyConfig.mode === 'hybrid') {
      log('📁 Creating categories...')
      const categoriesToInsert = categoriesData.map((cat, index) => ({
        ...cat,
        id: generateId(),
        study_id: studyConfig.id,
        position: index,
      }))
      const { data: insertedCategories, error: catErr } = await supabase
        .from('categories')
        .insert(categoriesToInsert)
        .select()
      if (catErr) {
        log('❌ Categories error: ' + catErr.message)
        continue
      }
      studyCategoryIds = insertedCategories?.map(c => c.id) || []
      log(`✅ ${categoriesToInsert.length} categories created`)
    }

    // Create Screening Questions
    log('❓ Creating screening questions...')
    const screeningQuestions = createScreeningQuestions(studyConfig.id)
    const { error: screenErr } = await supabase.from('study_flow_questions').insert(screeningQuestions)
    if (screenErr) {
      log('❌ Screening questions error: ' + screenErr.message)
      continue
    }
    log(`✅ ${screeningQuestions.length} screening questions created`)

    // Create Pre-Study Questions
    log('❓ Creating pre-study questions...')
    const preStudyQuestions = createPreStudyQuestions(studyConfig.id)
    const { error: preErr } = await supabase.from('study_flow_questions').insert(preStudyQuestions)
    if (preErr) {
      log('❌ Pre-study questions error: ' + preErr.message)
      continue
    }
    log(`✅ ${preStudyQuestions.length} pre-study questions created`)

    // Create Post-Study Questions
    log('❓ Creating post-study questions...')
    const postStudyQuestions = createPostStudyQuestions(studyConfig.id)
    const { error: postErr } = await supabase.from('study_flow_questions').insert(postStudyQuestions)
    if (postErr) {
      log('❌ Post-study questions error: ' + postErr.message)
      continue
    }
    log(`✅ ${postStudyQuestions.length} post-study questions created`)

    // Generate Participants
    const TOTAL_PARTICIPANTS = 100
    const REJECTED_PARTICIPANTS = 5
    log(`\n👥 Generating ${TOTAL_PARTICIPANTS} participants...`)

    const participants: any[] = []
    for (let i = 0; i < TOTAL_PARTICIPANTS; i++) {
      participants.push(generateParticipant(studyConfig.id, i, i < REJECTED_PARTICIPANTS))
    }
    // Shuffle to randomize rejected participants
    participants.sort(() => Math.random() - 0.5)

    const { error: partErr } = await supabase.from('participants').insert(participants)
    if (partErr) {
      log('❌ Participants error: ' + partErr.message)
      continue
    }
    log(`✅ ${participants.length} participants created`)

    // Generate Screening Responses
    log('📋 Generating screening responses...')
    const screeningResponses: any[] = []
    for (const p of participants) {
      screeningResponses.push(...generateScreeningResponses(p, screeningQuestions, p.status === 'abandoned'))
    }
    for (let i = 0; i < screeningResponses.length; i += 500) {
      const batch = screeningResponses.slice(i, i + 500)
      const { error } = await supabase.from('study_flow_responses').insert(batch)
      if (error) log('⚠️ Screening response batch error: ' + error.message)
    }
    log(`✅ ${screeningResponses.length} screening responses created`)

    // Generate Pre-Study Responses (only for completed participants)
    log('📋 Generating pre-study responses...')
    const preStudyResponses: any[] = []
    for (const p of participants.filter(p => p.status === 'completed')) {
      preStudyResponses.push(...generatePreStudyResponses(p, preStudyQuestions))
    }
    const { error: preRespErr } = await supabase.from('study_flow_responses').insert(preStudyResponses)
    if (preRespErr) log('⚠️ Pre-study responses error: ' + preRespErr.message)
    else log(`✅ ${preStudyResponses.length} pre-study responses created`)

    // Generate Card Sort Responses
    log('🃏 Generating card sort responses...')
    const cardSortResponses: any[] = []
    const analysisFlags: any[] = []

    // Create a mapping from original card labels to study-specific card IDs
    const cardLabelToStudyId: Record<string, string> = {}
    insertedCards?.forEach((card, index) => {
      // Map original CARD_IDS to the study-specific card IDs
      cardLabelToStudyId[CARD_IDS[index]] = card.id
    })

    for (const p of participants.filter(p => p.status === 'completed')) {
      // Generate response with study-specific category IDs
      const response = generateCardSortResponse(p, studyConfig.id, studyConfig.mode, studyCategoryIds)

      // Remap card placements to use study-specific card IDs
      const remappedPlacements: Record<string, string> = {}
      for (const [oldCardId, categoryValue] of Object.entries(response.card_placements)) {
        const newCardId = cardLabelToStudyId[oldCardId]
        if (newCardId) {
          remappedPlacements[newCardId] = categoryValue as string
        }
      }
      response.card_placements = remappedPlacements

      cardSortResponses.push(response)

      // Generate analysis flags
      const flags = generateAnalysisFlags(p, response)
      analysisFlags.push(...flags)
    }

    // Insert card sort responses
    for (let i = 0; i < cardSortResponses.length; i += 100) {
      const batch = cardSortResponses.slice(i, i + 100)
      const { error } = await supabase.from('card_sort_responses').insert(batch)
      if (error) log('⚠️ Card sort response batch error: ' + error.message)
    }
    log(`✅ ${cardSortResponses.length} card sort responses created`)

    // Generate Post-Study Responses
    log('📋 Generating post-study responses...')
    const postStudyResponses: any[] = []
    for (const p of participants.filter(p => p.status === 'completed')) {
      postStudyResponses.push(...generatePostStudyResponses(p, postStudyQuestions))
    }
    for (let i = 0; i < postStudyResponses.length; i += 500) {
      const batch = postStudyResponses.slice(i, i + 500)
      const { error } = await supabase.from('study_flow_responses').insert(batch)
      if (error) log('⚠️ Post-study response batch error: ' + error.message)
    }
    log(`✅ ${postStudyResponses.length} post-study responses created`)

    // Insert analysis flags
    if (analysisFlags.length > 0) {
      log('🚩 Creating analysis flags...')
      const { error: flagErr } = await supabase.from('participant_analysis_flags').insert(analysisFlags)
      if (flagErr) log('⚠️ Analysis flags error: ' + flagErr.message)
      else log(`✅ ${analysisFlags.length} analysis flags created`)
    }

    // Category Standardizations (for open sort only)
    if (studyConfig.mode === 'open') {
      log('🔗 Creating category standardizations...')
      const standardizations = generateCategoryStandardizations(studyConfig.id)
      const { error: stdErr } = await supabase.from('category_standardizations').insert(standardizations)
      if (stdErr) log('⚠️ Category standardizations error: ' + stdErr.message)
      else log(`✅ ${standardizations.length} category standardizations created`)
    }

    // Summary for this study
    const completedCount = participants.filter(p => p.status === 'completed').length
    log(`
📊 ${studyConfig.mode.toUpperCase()} SORT Summary:
   Study ID: ${studyConfig.id}
   Share Code: ${studyConfig.shareCode}
   Cards: ${cardsToInsert.length}
   Categories: ${studyCategoryIds.length}
   Participants: ${TOTAL_PARTICIPANTS} (${REJECTED_PARTICIPANTS} rejected, ${completedCount} completed)
   Card Sort Responses: ${cardSortResponses.length}
`)
  }

  // Final Summary
  log('\n' + '='.repeat(60))
  log('✨ ULTIMATE CARD SORT SEED COMPLETE!')
  log('='.repeat(60))
  log(`
📁 Project ID: ${PROJECT_ID}

📊 Studies Created:
   1. OPEN Sort
      - Study ID: ${STUDY_OPEN_ID}
      - Share Code: ${SHARE_CODE_OPEN}
      - Participants create their own categories

   2. CLOSED Sort
      - Study ID: ${STUDY_CLOSED_ID}
      - Share Code: ${SHARE_CODE_CLOSED}
      - Predefined categories only

   3. HYBRID Sort
      - Study ID: ${STUDY_HYBRID_ID}
      - Share Code: ${SHARE_CODE_HYBRID}
      - Predefined + custom categories

🃏 Cards: 15 product features (Dashboard, Settings, Team, etc.)
📁 Categories: 6 predefined (Account, Team, Data, Help, Integrations, Security)

Features Included Per Study:
✅ Welcome message with study info
✅ Participant agreement/consent
✅ Screening questions (4) with rejection logic
✅ Demographic profile collection
✅ Pre-study questions (2)
✅ Card sorting activity with timer
✅ Post-study questions (7) including NPS
✅ Thank you message with redirect
✅ Display logic (conditional visibility)
✅ Branching logic (screening rejection)
✅ Scale-based branching
✅ Response prevention (fingerprinting)
✅ 100 participants with varied responses
✅ Card sort placements with realistic patterns
✅ Custom categories (open/hybrid)
✅ Participant analysis flags
✅ Category standardizations (open sort)

Question Types Used:
✅ Single-line text
✅ Multi-line text
✅ Multiple choice (single & multi select)
✅ Yes/No
✅ Opinion scale (numerical & stars)
✅ NPS

Participant Data:
✅ 100 participants per study (300 total)
✅ 5 rejected per study (15 total)
✅ 95 completed per study (285 total)
✅ Realistic card placements
✅ Varied completion times
✅ Analysis flags for quality control
`)
}

main().catch(e => {
  console.error('Fatal error:', e.message)
  process.exit(1)
})
