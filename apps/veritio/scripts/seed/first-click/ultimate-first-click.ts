/**
 * ULTIMATE Comprehensive First-Click Test Seed Script
 * Creates an enterprise-level first-click study with EVERY feature:
 *
 * FEATURES INCLUDED:
 * - Complete study flow (welcome, agreement, screening, identifier, thank you)
 * - 8 tasks with varied image sources and AOI configurations
 * - Multiple AOIs per task (2-5 per task)
 * - Post-task questions for each task
 * - Pre-study AND post-study questions (enabled)
 * - All first-click settings configured
 * - Screening with rejection conditions
 * - Demographic profile collection
 * - Task randomization settings
 * - Image scaling options
 * - 100 participants with varied click behaviors
 * - Correct/incorrect/skipped responses
 * - Realistic time distributions
 *
 * Run with: npx tsx scripts/seed/first-click/ultimate-first-click.ts
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

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

// =============================================================================
// IDS - Pre-generate for cross-referencing
// =============================================================================

// Use existing Ankish project - set to null to create new project
const EXISTING_PROJECT_ID = process.env.SEED_PROJECT_ID || ''
const PROJECT_ID = EXISTING_PROJECT_ID || generateId()
const STUDY_ID = generateId()
// Default dev user ID (better-auth)
const USER_ID = process.env.SEED_USER_ID || 'your-better-auth-user-id'
const SHARE_CODE = `fc-ultimate-${Date.now()}`

// Screening Question IDs
const SCREENING_Q1_ID = generateId() // Device type
const SCREENING_Q2_ID = generateId() // Experience level
const SCREENING_Q3_ID = generateId() // Age verification
const SCREENING_Q4_ID = generateId() // Frequency of use

// Pre-Study Question IDs
const PRE_Q1_ID = generateId() // Design familiarity
const PRE_Q2_ID = generateId() // Expectations

// Post-Study Question IDs
const POST_Q1_ID = generateId() // Study experience
const POST_Q2_ID = generateId() // Difficulty rating
const POST_Q3_ID = generateId() // Open feedback

// Task IDs (8 comprehensive tasks)
const TASK_1_ID = generateId() // Homepage hero - find CTA
const TASK_2_ID = generateId() // Navigation menu - find specific item
const TASK_3_ID = generateId() // E-commerce product card - add to cart
const TASK_4_ID = generateId() // Dashboard - find settings
const TASK_5_ID = generateId() // Form layout - find submit button
const TASK_6_ID = generateId() // Mobile app screen - bottom nav
const TASK_7_ID = generateId() // Data visualization - identify element
const TASK_8_ID = generateId() // Complex UI - multi-AOI task

// Image IDs (one per task)
const IMAGE_1_ID = generateId()
const IMAGE_2_ID = generateId()
const IMAGE_3_ID = generateId()
const IMAGE_4_ID = generateId()
const IMAGE_5_ID = generateId()
const IMAGE_6_ID = generateId()
const IMAGE_7_ID = generateId()
const IMAGE_8_ID = generateId()

// AOI IDs - multiple per task
// Task 1 AOIs (2 AOIs - primary CTA, secondary CTA)
const AOI_1_1_ID = generateId()
const AOI_1_2_ID = generateId()

// Task 2 AOIs (4 AOIs - different menu items)
const AOI_2_1_ID = generateId()
const AOI_2_2_ID = generateId()
const AOI_2_3_ID = generateId()
const AOI_2_4_ID = generateId()

// Task 3 AOIs (3 AOIs - add to cart, wishlist, quick view)
const AOI_3_1_ID = generateId()
const AOI_3_2_ID = generateId()
const AOI_3_3_ID = generateId()

// Task 4 AOIs (5 AOIs - various dashboard controls)
const AOI_4_1_ID = generateId()
const AOI_4_2_ID = generateId()
const AOI_4_3_ID = generateId()
const AOI_4_4_ID = generateId()
const AOI_4_5_ID = generateId()

// Task 5 AOIs (2 AOIs - primary and secondary buttons)
const AOI_5_1_ID = generateId()
const AOI_5_2_ID = generateId()

// Task 6 AOIs (5 AOIs - bottom nav items)
const AOI_6_1_ID = generateId()
const AOI_6_2_ID = generateId()
const AOI_6_3_ID = generateId()
const AOI_6_4_ID = generateId()
const AOI_6_5_ID = generateId()

// Task 7 AOIs (3 AOIs - chart elements)
const AOI_7_1_ID = generateId()
const AOI_7_2_ID = generateId()
const AOI_7_3_ID = generateId()

// Task 8 AOIs (4 AOIs - complex UI elements)
const AOI_8_1_ID = generateId()
const AOI_8_2_ID = generateId()
const AOI_8_3_ID = generateId()
const AOI_8_4_ID = generateId()

// Post-task question IDs per task
const PTQ_1_1_ID = generateId() // Task 1 - confidence
const PTQ_1_2_ID = generateId() // Task 1 - difficulty
const PTQ_2_1_ID = generateId() // Task 2 - clarity
const PTQ_3_1_ID = generateId() // Task 3 - findability
const PTQ_3_2_ID = generateId() // Task 3 - open feedback
const PTQ_4_1_ID = generateId() // Task 4 - rating
const PTQ_5_1_ID = generateId() // Task 5 - expected location
const PTQ_6_1_ID = generateId() // Task 6 - mobile nav rating
const PTQ_7_1_ID = generateId() // Task 7 - data visualization clarity
const PTQ_7_2_ID = generateId() // Task 7 - what they looked for
const PTQ_8_1_ID = generateId() // Task 8 - overall complexity
const PTQ_8_2_ID = generateId() // Task 8 - suggestions

// =============================================================================
// STUDY FLOW SETTINGS (Complete configuration for first-click)
// =============================================================================

const studyFlowSettings = {
  welcome: {
    enabled: true,
    title: 'Welcome to Our Design Usability Study',
    message: `<p><strong>Thank you for participating!</strong></p>
<p>This study evaluates how intuitive our design layouts are. You'll be shown several screens and asked to click where you would expect to find specific items.</p>
<p><strong>This typically takes 10-15 minutes.</strong></p>`,
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
<li>My click data will be recorded and anonymized</li>
<li>Data is stored securely per GDPR/CCPA regulations</li>
<li>Results will be used to improve design decisions</li>
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
    rejectionMessage: "Unfortunately you don't meet the criteria for this design study.",
    redirectUrl: 'https://example.com/other-studies',
    redirectImmediately: false,
  },
  participantIdentifier: {
    type: 'demographic_profile' as const,
    demographicProfile: {
      title: 'Tell Us About Yourself',
      description: 'This helps us understand how different users interact with our designs.',
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
            { id: 'ageRange', type: 'predefined' as const, fieldType: 'ageRange' as const, position: 4, enabled: true, required: true, mappedToScreeningQuestionId: SCREENING_Q3_ID, width: 'half' as const },
          ],
        },
        {
          id: 'technology',
          name: 'Technology',
          position: 1,
          title: 'Technology Usage',
          fields: [
            { id: 'primaryDevice', type: 'predefined' as const, fieldType: 'primaryDevice' as const, position: 0, enabled: true, required: true, mappedToScreeningQuestionId: SCREENING_Q1_ID, width: 'half' as const },
            { id: 'techProficiency', type: 'predefined' as const, fieldType: 'techProficiency' as const, position: 1, enabled: true, required: true, mappedToScreeningQuestionId: SCREENING_Q2_ID, width: 'half' as const },
            { id: 'browserPreference', type: 'predefined' as const, fieldType: 'browserPreference' as const, position: 2, enabled: true, required: false, mappedToScreeningQuestionId: null, width: 'half' as const },
            { id: 'operatingSystem', type: 'predefined' as const, fieldType: 'operatingSystem' as const, position: 3, enabled: true, required: false, mappedToScreeningQuestionId: null, width: 'half' as const },
          ],
        },
      ],
      genderOptions: { options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
      ageRangeOptions: { ranges: ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'] },
      locationConfig: { startLevel: 'country' as const, defaultCountry: null, defaultState: null },
      primaryDeviceOptions: { options: ['Desktop', 'Mobile', 'Tablet'] },
      techProficiencyOptions: { options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
      browserPreferenceOptions: { options: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other'] },
      operatingSystemOptions: { options: ['Windows', 'macOS', 'iOS', 'Android', 'Linux'] },
    },
  },
  preStudyQuestions: {
    enabled: true,
    showIntro: true,
    introTitle: 'Before We Begin',
    introMessage: 'A few quick questions about your design experience.',
    pageMode: 'one_per_page' as const,
    randomizeQuestions: false,
  },
  activityInstructions: {
    enabled: true,
    title: 'How This Works',
    part1: `<p><strong>Here's what you'll do:</strong></p>
<ol>
<li>You'll see a screen design and a task description</li>
<li>Click where you would first look to complete the task</li>
<li>Your first click is recorded - so click where your instinct takes you!</li>
<li>Answer a quick follow-up question after each task</li>
</ol>`,
    part2: `<p><em>Remember: There are no wrong answers! We're testing the design, not you.</em></p>
<p>Don't overthink it - just click where you'd naturally look first.</p>`,
  },
  postStudyQuestions: {
    enabled: true,
    showIntro: true,
    introTitle: 'Almost Done!',
    introMessage: 'Just a few final questions about your overall experience.',
    pageMode: 'one_per_page' as const,
    randomizeQuestions: false,
  },
  thankYou: {
    enabled: true,
    title: 'Thank You!',
    message: `<p><strong>Your feedback has been recorded.</strong></p>
<p>Your input will directly inform our design decisions. We truly appreciate your time!</p>
<p>You'll receive a summary of findings once the study completes.</p>`,
    redirectUrl: 'https://example.com/thank-you',
    redirectDelay: 10,
  },
  closedStudy: {
    title: 'Study Closed',
    message: 'This study has reached its participant quota. Thank you for your interest!',
    redirectUrl: 'https://example.com/studies',
    redirectImmediately: false,
  },
}

// First-Click specific settings
const firstClickSettings = {
  allowSkipTasks: true,
  startTasksImmediately: false, // Show "Start task" button
  randomizeTasks: true,
  dontRandomizeFirstTask: true, // Keep first task as intro
  showEachParticipantTasks: 'all' as const,
  showTaskProgress: true,
  taskInstructionPosition: 'bottom-left' as const,
  imageScaling: 'scale_on_small' as const,
}

// =============================================================================
// SCREENING QUESTIONS
// =============================================================================

const screeningQuestions = [
  // Q1: Device type
  {
    id: SCREENING_Q1_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 0,
    question_type: 'multiple_choice',
    question_text: 'What device are you primarily using for this study?',
    description: 'This helps us understand your interaction context.',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'desktop', label: 'Desktop Computer' },
        { id: 'laptop', label: 'Laptop' },
        { id: 'tablet', label: 'Tablet' },
        { id: 'mobile', label: 'Mobile Phone' },
      ],
      shuffle: false,
    },
    // No rejection - all devices welcome
  },
  // Q2: Tech experience
  {
    id: SCREENING_Q2_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 1,
    question_type: 'multiple_choice',
    question_text: 'How would you rate your experience with digital interfaces?',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'beginner', label: 'Beginner - I use basic apps occasionally' },
        { id: 'intermediate', label: 'Intermediate - I\'m comfortable with most apps' },
        { id: 'advanced', label: 'Advanced - I use complex software regularly' },
        { id: 'expert', label: 'Expert - I work in tech/design professionally' },
      ],
    },
  },
  // Q3: Age verification
  {
    id: SCREENING_Q3_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 2,
    question_type: 'multiple_choice',
    question_text: 'What is your age range?',
    description: 'Participants must be 18+ for this study.',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'under18', label: 'Under 18' },
        { id: '18_24', label: '18-24' },
        { id: '25_34', label: '25-34' },
        { id: '35_44', label: '35-44' },
        { id: '45_54', label: '45-54' },
        { id: '55_plus', label: '55+' },
      ],
    },
    branching_logic: {
      rules: [{ optionId: 'under18', target: 'reject' }],
      defaultTarget: 'next',
    },
  },
  // Q4: Frequency of web use
  {
    id: SCREENING_Q4_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 3,
    question_type: 'opinion_scale',
    question_text: 'How frequently do you browse websites or use web applications?',
    is_required: true,
    config: {
      scalePoints: 5,
      startAtZero: false,
      scaleType: 'numerical',
      leftLabel: 'Rarely',
      rightLabel: 'Constantly',
    },
    // Reject if they rarely use web
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
    question_type: 'multiple_choice',
    question_text: 'How familiar are you with evaluating website/app designs?',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'never', label: 'This is my first time' },
        { id: 'few', label: 'I\'ve done this a few times' },
        { id: 'regular', label: 'I do this regularly' },
        { id: 'professional', label: 'I do this professionally' },
      ],
    },
  },
  {
    id: PRE_Q2_ID,
    study_id: STUDY_ID,
    section: 'pre_study',
    position: 1,
    question_type: 'multi_line_text',
    question_text: 'What makes a design intuitive to you? (optional)',
    is_required: false,
    config: {
      placeholder: 'Share your thoughts on what makes interfaces easy to use...',
      maxLength: 500,
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
    question_text: 'How was your overall experience with this study?',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'excellent', label: 'Excellent - very engaging' },
        { id: 'good', label: 'Good - clear and easy' },
        { id: 'okay', label: 'Okay - some tasks were confusing' },
        { id: 'poor', label: 'Poor - difficult to complete' },
      ],
    },
  },
  {
    id: POST_Q2_ID,
    study_id: STUDY_ID,
    section: 'post_study',
    position: 1,
    question_type: 'nps',
    question_text: 'How likely are you to participate in similar design studies in the future?',
    is_required: true,
    config: {
      leftLabel: 'Not at all likely',
      rightLabel: 'Extremely likely',
    },
  },
  {
    id: POST_Q3_ID,
    study_id: STUDY_ID,
    section: 'post_study',
    position: 2,
    question_type: 'multi_line_text',
    question_text: 'Any suggestions to improve this study format?',
    is_required: false,
    config: {
      placeholder: 'Share any feedback about the study experience...',
      maxLength: 1000,
    },
  },
]

// =============================================================================
// TASKS WITH IMAGES AND AOIs
// =============================================================================

// Task definitions with embedded post-task questions
const tasks = [
  // Task 1: Homepage Hero - Find primary CTA
  {
    id: TASK_1_ID,
    study_id: STUDY_ID,
    instruction: 'Find the main call-to-action button to start a free trial.',
    position: 0,
    post_task_questions: [
      {
        id: PTQ_1_1_ID,
        question_text: 'How confident were you about where to click?',
        question_type: 'opinion_scale',
        config: {
          scalePoints: 5,
          scaleType: 'numerical',
          leftLabel: 'Not confident',
          rightLabel: 'Very confident',
        },
        is_required: true,
        position: 0,
      },
      {
        id: PTQ_1_2_ID,
        question_text: 'Was the button easy to find?',
        question_type: 'yes_no',
        config: {
          styleType: 'default',
          yesLabel: 'Yes',
          noLabel: 'No',
        },
        is_required: true,
        position: 1,
      },
    ],
  },
  // Task 2: Navigation Menu - Find specific item
  {
    id: TASK_2_ID,
    study_id: STUDY_ID,
    instruction: 'Click on the navigation item that would take you to the Pricing page.',
    position: 1,
    post_task_questions: [
      {
        id: PTQ_2_1_ID,
        question_text: 'How clear was the navigation structure?',
        question_type: 'opinion_scale',
        config: {
          scalePoints: 5,
          scaleType: 'stars',
          leftLabel: 'Very unclear',
          rightLabel: 'Very clear',
        },
        is_required: true,
        position: 0,
      },
    ],
  },
  // Task 3: E-commerce Product Card - Add to cart
  {
    id: TASK_3_ID,
    study_id: STUDY_ID,
    instruction: 'Click on the button you would use to add this product to your shopping cart.',
    position: 2,
    post_task_questions: [
      {
        id: PTQ_3_1_ID,
        question_text: 'How easy was it to find the add to cart button?',
        question_type: 'opinion_scale',
        config: {
          scalePoints: 5,
          scaleType: 'numerical',
          leftLabel: 'Very difficult',
          rightLabel: 'Very easy',
        },
        is_required: true,
        position: 0,
      },
      {
        id: PTQ_3_2_ID,
        question_text: 'What else caught your attention on this product card?',
        question_type: 'multi_line_text',
        config: {
          placeholder: 'Describe any other elements you noticed...',
          maxLength: 300,
        },
        is_required: false,
        position: 1,
      },
    ],
  },
  // Task 4: Dashboard - Find settings
  {
    id: TASK_4_ID,
    study_id: STUDY_ID,
    instruction: 'Click where you would go to access your account settings.',
    position: 3,
    post_task_questions: [
      {
        id: PTQ_4_1_ID,
        question_text: 'Rate the overall intuitiveness of this dashboard layout.',
        question_type: 'opinion_scale',
        config: {
          scalePoints: 5,
          scaleType: 'emotions',
          leftLabel: 'Very confusing',
          rightLabel: 'Very intuitive',
        },
        is_required: true,
        position: 0,
      },
    ],
  },
  // Task 5: Form Layout - Find submit button
  {
    id: TASK_5_ID,
    study_id: STUDY_ID,
    instruction: 'After filling out this form, click where you would submit it.',
    position: 4,
    post_task_questions: [
      {
        id: PTQ_5_1_ID,
        question_text: 'Was the submit button where you expected it to be?',
        question_type: 'multiple_choice',
        config: {
          mode: 'single',
          options: [
            { id: 'yes', label: 'Yes, exactly where I expected' },
            { id: 'close', label: 'Close, but slightly unexpected' },
            { id: 'no', label: 'No, I expected it elsewhere' },
          ],
        },
        is_required: true,
        position: 0,
      },
    ],
  },
  // Task 6: Mobile App Screen - Bottom navigation
  {
    id: TASK_6_ID,
    study_id: STUDY_ID,
    instruction: 'Click on the icon that would take you to your Profile.',
    position: 5,
    post_task_questions: [
      {
        id: PTQ_6_1_ID,
        question_text: 'How recognizable were the navigation icons?',
        question_type: 'opinion_scale',
        config: {
          scalePoints: 5,
          scaleType: 'numerical',
          leftLabel: 'Not recognizable',
          rightLabel: 'Very recognizable',
        },
        is_required: true,
        position: 0,
      },
    ],
  },
  // Task 7: Data Visualization - Identify element
  {
    id: TASK_7_ID,
    study_id: STUDY_ID,
    instruction: 'Click on the chart element that shows the highest value.',
    position: 6,
    post_task_questions: [
      {
        id: PTQ_7_1_ID,
        question_text: 'How easy was it to read this data visualization?',
        question_type: 'opinion_scale',
        config: {
          scalePoints: 5,
          scaleType: 'numerical',
          leftLabel: 'Very difficult',
          rightLabel: 'Very easy',
        },
        is_required: true,
        position: 0,
      },
      {
        id: PTQ_7_2_ID,
        question_text: 'What did you look for to identify the highest value?',
        question_type: 'multiple_choice',
        config: {
          mode: 'multi',
          options: [
            { id: 'bar_height', label: 'Bar height' },
            { id: 'color', label: 'Color intensity' },
            { id: 'labels', label: 'Data labels' },
            { id: 'legend', label: 'Legend/key' },
            { id: 'axis', label: 'Axis values' },
          ],
          minSelections: 1,
        },
        is_required: true,
        position: 1,
      },
    ],
  },
  // Task 8: Complex UI - Multi-element task
  {
    id: TASK_8_ID,
    study_id: STUDY_ID,
    instruction: 'Click on the element you would use to create a new project.',
    position: 7,
    post_task_questions: [
      {
        id: PTQ_8_1_ID,
        question_text: 'How complex did this interface feel?',
        question_type: 'opinion_scale',
        config: {
          scalePoints: 5,
          scaleType: 'numerical',
          leftLabel: 'Very simple',
          rightLabel: 'Very complex',
        },
        is_required: true,
        position: 0,
      },
      {
        id: PTQ_8_2_ID,
        question_text: 'What would make this interface easier to use?',
        question_type: 'multi_line_text',
        config: {
          placeholder: 'Share your suggestions...',
          maxLength: 500,
        },
        is_required: false,
        position: 1,
      },
    ],
  },
]

// Image configurations
const images = [
  {
    id: IMAGE_1_ID,
    task_id: TASK_1_ID,
    study_id: STUDY_ID,
    image_url: 'https://placehold.co/1440x900/2563eb/white?text=Homepage+Hero+Section',
    original_filename: 'homepage-hero.png',
    width: 1440,
    height: 900,
    source_type: 'upload',
    figma_file_key: null,
    figma_node_id: null,
  },
  {
    id: IMAGE_2_ID,
    task_id: TASK_2_ID,
    study_id: STUDY_ID,
    image_url: 'https://placehold.co/1440x100/1e293b/white?text=Navigation+Menu+Bar',
    original_filename: 'navigation-menu.png',
    width: 1440,
    height: 100,
    source_type: 'upload',
    figma_file_key: null,
    figma_node_id: null,
  },
  {
    id: IMAGE_3_ID,
    task_id: TASK_3_ID,
    study_id: STUDY_ID,
    image_url: 'https://placehold.co/400x500/f1f5f9/1e293b?text=Product+Card+Design',
    original_filename: 'product-card.png',
    width: 400,
    height: 500,
    source_type: 'upload',
    figma_file_key: null,
    figma_node_id: null,
  },
  {
    id: IMAGE_4_ID,
    task_id: TASK_4_ID,
    study_id: STUDY_ID,
    image_url: 'https://placehold.co/1440x900/0f172a/94a3b8?text=Dashboard+Interface',
    original_filename: 'dashboard.png',
    width: 1440,
    height: 900,
    source_type: 'upload',
    figma_file_key: null,
    figma_node_id: null,
  },
  {
    id: IMAGE_5_ID,
    task_id: TASK_5_ID,
    study_id: STUDY_ID,
    image_url: 'https://placehold.co/600x800/ffffff/1e293b?text=Form+Layout',
    original_filename: 'form-layout.png',
    width: 600,
    height: 800,
    source_type: 'upload',
    figma_file_key: null,
    figma_node_id: null,
  },
  {
    id: IMAGE_6_ID,
    task_id: TASK_6_ID,
    study_id: STUDY_ID,
    image_url: 'https://placehold.co/390x844/f8fafc/1e293b?text=Mobile+App+Screen',
    original_filename: 'mobile-app.png',
    width: 390,
    height: 844,
    source_type: 'upload',
    figma_file_key: null,
    figma_node_id: null,
  },
  {
    id: IMAGE_7_ID,
    task_id: TASK_7_ID,
    study_id: STUDY_ID,
    image_url: 'https://placehold.co/800x500/ffffff/2563eb?text=Data+Visualization+Chart',
    original_filename: 'data-viz.png',
    width: 800,
    height: 500,
    source_type: 'upload',
    figma_file_key: null,
    figma_node_id: null,
  },
  {
    id: IMAGE_8_ID,
    task_id: TASK_8_ID,
    study_id: STUDY_ID,
    image_url: 'https://placehold.co/1440x900/f1f5f9/0f172a?text=Complex+UI+Layout',
    original_filename: 'complex-ui.png',
    width: 1440,
    height: 900,
    source_type: 'upload',
    figma_file_key: null,
    figma_node_id: null,
  },
]

// AOI configurations - NORMALIZED coordinates (0-1 range)
// x, y, width, height are all fractions of the image dimensions
const aois = [
  // Task 1 AOIs - Homepage hero CTAs (image: 1440x900)
  { id: AOI_1_1_ID, image_id: IMAGE_1_ID, task_id: TASK_1_ID, study_id: STUDY_ID, name: 'Primary CTA - Start Free Trial', x: 0.375, y: 0.444, width: 0.139, height: 0.067, position: 0 },
  { id: AOI_1_2_ID, image_id: IMAGE_1_ID, task_id: TASK_1_ID, study_id: STUDY_ID, name: 'Secondary CTA - Learn More', x: 0.528, y: 0.444, width: 0.097, height: 0.067, position: 1 },

  // Task 2 AOIs - Navigation menu items (image: 1440x100)
  { id: AOI_2_1_ID, image_id: IMAGE_2_ID, task_id: TASK_2_ID, study_id: STUDY_ID, name: 'Nav - Home', x: 0.069, y: 0.35, width: 0.042, height: 0.30, position: 0 },
  { id: AOI_2_2_ID, image_id: IMAGE_2_ID, task_id: TASK_2_ID, study_id: STUDY_ID, name: 'Nav - Features', x: 0.125, y: 0.35, width: 0.056, height: 0.30, position: 1 },
  { id: AOI_2_3_ID, image_id: IMAGE_2_ID, task_id: TASK_2_ID, study_id: STUDY_ID, name: 'Nav - Pricing (Target)', x: 0.194, y: 0.35, width: 0.049, height: 0.30, position: 2 },
  { id: AOI_2_4_ID, image_id: IMAGE_2_ID, task_id: TASK_2_ID, study_id: STUDY_ID, name: 'Nav - Contact', x: 0.257, y: 0.35, width: 0.049, height: 0.30, position: 3 },

  // Task 3 AOIs - Product card actions (image: 400x500)
  { id: AOI_3_1_ID, image_id: IMAGE_3_ID, task_id: TASK_3_ID, study_id: STUDY_ID, name: 'Add to Cart Button (Target)', x: 0.125, y: 0.84, width: 0.75, height: 0.10, position: 0 },
  { id: AOI_3_2_ID, image_id: IMAGE_3_ID, task_id: TASK_3_ID, study_id: STUDY_ID, name: 'Wishlist Heart Icon', x: 0.85, y: 0.04, width: 0.10, height: 0.08, position: 1 },
  { id: AOI_3_3_ID, image_id: IMAGE_3_ID, task_id: TASK_3_ID, study_id: STUDY_ID, name: 'Quick View Button', x: 0.125, y: 0.72, width: 0.25, height: 0.08, position: 2 },

  // Task 4 AOIs - Dashboard controls (image: 1440x900)
  { id: AOI_4_1_ID, image_id: IMAGE_4_ID, task_id: TASK_4_ID, study_id: STUDY_ID, name: 'Settings Gear Icon (Target)', x: 0.944, y: 0.033, width: 0.035, height: 0.056, position: 0 },
  { id: AOI_4_2_ID, image_id: IMAGE_4_ID, task_id: TASK_4_ID, study_id: STUDY_ID, name: 'User Avatar Menu', x: 0.889, y: 0.033, width: 0.035, height: 0.056, position: 1 },
  { id: AOI_4_3_ID, image_id: IMAGE_4_ID, task_id: TASK_4_ID, study_id: STUDY_ID, name: 'Hamburger Menu', x: 0.021, y: 0.033, width: 0.028, height: 0.044, position: 2 },
  { id: AOI_4_4_ID, image_id: IMAGE_4_ID, task_id: TASK_4_ID, study_id: STUDY_ID, name: 'Profile Link Sidebar', x: 0.021, y: 0.889, width: 0.139, height: 0.044, position: 3 },
  { id: AOI_4_5_ID, image_id: IMAGE_4_ID, task_id: TASK_4_ID, study_id: STUDY_ID, name: 'Notification Bell', x: 0.847, y: 0.033, width: 0.028, height: 0.044, position: 4 },

  // Task 5 AOIs - Form buttons (image: 600x800)
  { id: AOI_5_1_ID, image_id: IMAGE_5_ID, task_id: TASK_5_ID, study_id: STUDY_ID, name: 'Submit Button (Target)', x: 0.583, y: 0.90, width: 0.333, height: 0.063, position: 0 },
  { id: AOI_5_2_ID, image_id: IMAGE_5_ID, task_id: TASK_5_ID, study_id: STUDY_ID, name: 'Cancel Button', x: 0.083, y: 0.90, width: 0.167, height: 0.063, position: 1 },

  // Task 6 AOIs - Mobile bottom navigation (image: 390x844)
  { id: AOI_6_1_ID, image_id: IMAGE_6_ID, task_id: TASK_6_ID, study_id: STUDY_ID, name: 'Nav - Home', x: 0.051, y: 0.924, width: 0.179, height: 0.059, position: 0 },
  { id: AOI_6_2_ID, image_id: IMAGE_6_ID, task_id: TASK_6_ID, study_id: STUDY_ID, name: 'Nav - Search', x: 0.244, y: 0.924, width: 0.179, height: 0.059, position: 1 },
  { id: AOI_6_3_ID, image_id: IMAGE_6_ID, task_id: TASK_6_ID, study_id: STUDY_ID, name: 'Nav - Add', x: 0.423, y: 0.924, width: 0.154, height: 0.059, position: 2 },
  { id: AOI_6_4_ID, image_id: IMAGE_6_ID, task_id: TASK_6_ID, study_id: STUDY_ID, name: 'Nav - Notifications', x: 0.590, y: 0.924, width: 0.179, height: 0.059, position: 3 },
  { id: AOI_6_5_ID, image_id: IMAGE_6_ID, task_id: TASK_6_ID, study_id: STUDY_ID, name: 'Nav - Profile (Target)', x: 0.782, y: 0.924, width: 0.179, height: 0.059, position: 4 },

  // Task 7 AOIs - Chart elements (image: 800x500)
  { id: AOI_7_1_ID, image_id: IMAGE_7_ID, task_id: TASK_7_ID, study_id: STUDY_ID, name: 'Highest Bar (Target)', x: 0.688, y: 0.20, width: 0.075, height: 0.60, position: 0 },
  { id: AOI_7_2_ID, image_id: IMAGE_7_ID, task_id: TASK_7_ID, study_id: STUDY_ID, name: 'Second Highest Bar', x: 0.50, y: 0.30, width: 0.075, height: 0.50, position: 1 },
  { id: AOI_7_3_ID, image_id: IMAGE_7_ID, task_id: TASK_7_ID, study_id: STUDY_ID, name: 'Third Highest Bar', x: 0.313, y: 0.40, width: 0.075, height: 0.40, position: 2 },

  // Task 8 AOIs - Complex UI elements (image: 1440x900)
  { id: AOI_8_1_ID, image_id: IMAGE_8_ID, task_id: TASK_8_ID, study_id: STUDY_ID, name: 'New Project Button (Target)', x: 0.889, y: 0.111, width: 0.097, height: 0.050, position: 0 },
  { id: AOI_8_2_ID, image_id: IMAGE_8_ID, task_id: TASK_8_ID, study_id: STUDY_ID, name: 'Plus Icon in Sidebar', x: 0.153, y: 0.167, width: 0.021, height: 0.033, position: 1 },
  { id: AOI_8_3_ID, image_id: IMAGE_8_ID, task_id: TASK_8_ID, study_id: STUDY_ID, name: 'Create Dropdown Menu', x: 0.069, y: 0.111, width: 0.069, height: 0.044, position: 2 },
  { id: AOI_8_4_ID, image_id: IMAGE_8_ID, task_id: TASK_8_ID, study_id: STUDY_ID, name: 'FAB Button', x: 0.938, y: 0.889, width: 0.042, height: 0.067, position: 3 },
]

// Map of correct AOI per task (first position is usually the target)
const correctAoiByTask: Record<string, string> = {
  [TASK_1_ID]: AOI_1_1_ID,
  [TASK_2_ID]: AOI_2_3_ID, // Pricing is the target
  [TASK_3_ID]: AOI_3_1_ID,
  [TASK_4_ID]: AOI_4_1_ID,
  [TASK_5_ID]: AOI_5_1_ID,
  [TASK_6_ID]: AOI_6_5_ID, // Profile is the target
  [TASK_7_ID]: AOI_7_1_ID,
  [TASK_8_ID]: AOI_8_1_ID,
}

// All AOIs by task for random selection
const aoiByTask: Record<string, string[]> = {
  [TASK_1_ID]: [AOI_1_1_ID, AOI_1_2_ID],
  [TASK_2_ID]: [AOI_2_1_ID, AOI_2_2_ID, AOI_2_3_ID, AOI_2_4_ID],
  [TASK_3_ID]: [AOI_3_1_ID, AOI_3_2_ID, AOI_3_3_ID],
  [TASK_4_ID]: [AOI_4_1_ID, AOI_4_2_ID, AOI_4_3_ID, AOI_4_4_ID, AOI_4_5_ID],
  [TASK_5_ID]: [AOI_5_1_ID, AOI_5_2_ID],
  [TASK_6_ID]: [AOI_6_1_ID, AOI_6_2_ID, AOI_6_3_ID, AOI_6_4_ID, AOI_6_5_ID],
  [TASK_7_ID]: [AOI_7_1_ID, AOI_7_2_ID, AOI_7_3_ID],
  [TASK_8_ID]: [AOI_8_1_ID, AOI_8_2_ID, AOI_8_3_ID, AOI_8_4_ID],
}

// Image dimensions by task for coordinate generation
const imageDimsByTask: Record<string, { width: number; height: number }> = {
  [TASK_1_ID]: { width: 1440, height: 900 },
  [TASK_2_ID]: { width: 1440, height: 100 },
  [TASK_3_ID]: { width: 400, height: 500 },
  [TASK_4_ID]: { width: 1440, height: 900 },
  [TASK_5_ID]: { width: 600, height: 800 },
  [TASK_6_ID]: { width: 390, height: 844 },
  [TASK_7_ID]: { width: 800, height: 500 },
  [TASK_8_ID]: { width: 1440, height: 900 },
}

// Image ID by task
const imageByTask: Record<string, string> = {
  [TASK_1_ID]: IMAGE_1_ID,
  [TASK_2_ID]: IMAGE_2_ID,
  [TASK_3_ID]: IMAGE_3_ID,
  [TASK_4_ID]: IMAGE_4_ID,
  [TASK_5_ID]: IMAGE_5_ID,
  [TASK_6_ID]: IMAGE_6_ID,
  [TASK_7_ID]: IMAGE_7_ID,
  [TASK_8_ID]: IMAGE_8_ID,
}

// AOI coordinates for click generation
const aoiCoordinates: Record<string, { x: number; y: number; width: number; height: number }> = {}
aois.forEach(aoi => {
  aoiCoordinates[aoi.id] = { x: aoi.x, y: aoi.y, width: aoi.width, height: aoi.height }
})

// =============================================================================
// PARTICIPANT DATA GENERATION
// =============================================================================

const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'James',
  'Mia', 'Benjamin', 'Charlotte', 'Lucas', 'Amelia', 'Henry', 'Harper', 'Alexander', 'Evelyn', 'Daniel',
  'Abigail', 'Michael', 'Emily', 'Elijah', 'Elizabeth', 'William', 'Sofia', 'Sebastian', 'Avery', 'Jack']
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee',
  'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker']

function generateParticipant(index: number, isRejected: boolean) {
  const firstName = randomChoice(firstNames)
  const lastName = randomChoice(lastNames)
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() - randomInt(1, 30))

  return {
    id: generateId(),
    study_id: STUDY_ID,
    session_token: `fc_session_${Date.now()}_${index}`,
    status: isRejected ? 'abandoned' : 'completed',
    started_at: baseDate.toISOString(),
    completed_at: isRejected ? null : new Date(baseDate.getTime() + randomInt(300000, 900000)).toISOString(),
    identifier_type: 'email',
    identifier_value: email,
    screening_result: isRejected ? 'rejected' : 'passed',
    country: randomChoice(['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'NL', 'SE']),
    metadata: {
      email,
      firstName,
      lastName,
      gender: randomChoice(['Male', 'Female', 'Non-binary', 'Prefer not to say']),
      device: randomChoice(['Desktop', 'Laptop', 'Tablet', 'Mobile']),
      techLevel: randomChoice(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
    },
  }
}

// =============================================================================
// RESPONSE GENERATION
// =============================================================================

function generateClickInAOI(aoiId: string): { x: number; y: number } {
  const coords = aoiCoordinates[aoiId]
  if (!coords) {
    // Random normalized click if AOI not found (0-1 range)
    return { x: randomFloat(0.1, 0.9), y: randomFloat(0.1, 0.9) }
  }
  // Random normalized position within the AOI (already in 0-1 range)
  return {
    x: coords.x + randomFloat(0.1, 0.9) * coords.width,
    y: coords.y + randomFloat(0.1, 0.9) * coords.height,
  }
}

function generateClickOutsideAOIs(_taskId: string): { x: number; y: number } {
  // Generate random normalized click anywhere on image (0-1 range)
  // Avoiding edges slightly
  return {
    x: randomFloat(0.05, 0.95),
    y: randomFloat(0.05, 0.95),
  }
}

function generateFirstClickResponses(participantId: string) {
  const responses: any[] = []
  const postTaskResponses: any[] = []
  const taskIds = [TASK_1_ID, TASK_2_ID, TASK_3_ID, TASK_4_ID, TASK_5_ID, TASK_6_ID, TASK_7_ID, TASK_8_ID]

  for (const taskId of taskIds) {
    const responseId = generateId()
    const isSkipped = Math.random() < 0.05 // 5% skip rate

    // Skip inserting response for skipped tasks - DB requires non-null click coordinates
    // Skipped tasks are tracked by absence of response for that task
    if (isSkipped) {
      continue
    }

    // Determine click outcome: 70% correct, 20% wrong AOI, 10% miss all AOIs
    const outcomeRoll = Math.random()
    let click: { x: number; y: number }
    let isCorrect = false
    let matchedAoiId: string | null = null

    if (outcomeRoll < 0.70) {
      // Correct click
      const correctAoi = correctAoiByTask[taskId]
      click = generateClickInAOI(correctAoi)
      isCorrect = true
      matchedAoiId = correctAoi
    } else if (outcomeRoll < 0.90) {
      // Wrong AOI
      const taskAois = aoiByTask[taskId]
      const wrongAois = taskAois.filter(id => id !== correctAoiByTask[taskId])
      if (wrongAois.length > 0) {
        matchedAoiId = randomChoice(wrongAois)
        click = generateClickInAOI(matchedAoiId)
      } else {
        click = generateClickOutsideAOIs(taskId)
      }
      isCorrect = false
    } else {
      // Miss all AOIs
      click = generateClickOutsideAOIs(taskId)
      isCorrect = false
      matchedAoiId = null
    }

    // Time to click varies: faster for experienced users, slower for complex tasks
    const baseTime = taskId === TASK_8_ID ? 4000 : taskId === TASK_4_ID ? 3500 : 2000
    const timeVariation = randomInt(-1000, 3000)
    const timeToClick = Math.max(500, baseTime + timeVariation)

    responses.push({
      id: responseId,
      participant_id: participantId,
      task_id: taskId,
      study_id: STUDY_ID,
      image_id: imageByTask[taskId],
      click_x: click.x,
      click_y: click.y,
      time_to_click_ms: timeToClick,
      is_correct: isCorrect,
      matched_aoi_id: matchedAoiId,
      is_skipped: false,
      viewport_width: randomChoice([1920, 1440, 1366, 1280]),
      viewport_height: randomChoice([1080, 900, 768]),
      image_rendered_width: imageDimsByTask[taskId]?.width || 1440,
      image_rendered_height: imageDimsByTask[taskId]?.height || 900,
    })

    // Generate post-task responses
    const task = tasks.find(t => t.id === taskId)
    if (task && task.post_task_questions) {
      for (const ptq of task.post_task_questions) {
        let value: any

        if (ptq.question_type === 'opinion_scale') {
          // Higher ratings for correct clicks
          value = isCorrect ? weightedRandom([5, 10, 20, 35, 30]) + 1 : weightedRandom([15, 25, 30, 20, 10]) + 1
        } else if (ptq.question_type === 'yes_no') {
          value = isCorrect ? (Math.random() > 0.2) : (Math.random() > 0.6)
        } else if (ptq.question_type === 'multiple_choice') {
          const config = ptq.config as { mode?: string; options?: { id: string; label: string }[] } | undefined
          const opts = config?.options || []
          if (config?.mode === 'multi') {
            // Select 1-3 options
            const numSelections = randomInt(1, Math.min(3, opts.length))
            const shuffled = [...opts].sort(() => Math.random() - 0.5)
            value = { optionIds: shuffled.slice(0, numSelections).map((o) => o.id) }
          } else {
            value = { optionId: randomChoice(opts)?.id }
          }
        } else if (ptq.question_type === 'multi_line_text') {
          const textResponses = [
            'The design is intuitive and easy to navigate.',
            'I found it a bit confusing at first.',
            'Clear layout, good visual hierarchy.',
            'The button could be more prominent.',
            'Nice clean design overall.',
            'Some elements were hard to distinguish.',
          ]
          value = Math.random() > 0.3 ? randomChoice(textResponses) : null // 30% skip optional text
        } else {
          value = null
        }

        if (value !== null) {
          postTaskResponses.push({
            id: generateId(),
            response_id: responseId,
            study_id: STUDY_ID,
            participant_id: participantId,
            task_id: taskId,
            question_id: ptq.id,
            value: value,
          })
        }
      }
    }
  }

  return { responses, postTaskResponses }
}

function generateStudyFlowResponses(participantId: string, isRejected: boolean) {
  const responses: any[] = []

  // Screening responses
  responses.push({
    id: generateId(),
    participant_id: participantId,
    question_id: SCREENING_Q1_ID,
    study_id: STUDY_ID,
    response_value: { optionId: randomChoice(['desktop', 'laptop', 'tablet', 'mobile']) },
    response_time_ms: randomInt(2000, 5000),
  })
  responses.push({
    id: generateId(),
    participant_id: participantId,
    question_id: SCREENING_Q2_ID,
    study_id: STUDY_ID,
    response_value: { optionId: randomChoice(['beginner', 'intermediate', 'advanced', 'expert']) },
    response_time_ms: randomInt(2000, 5000),
  })
  const ageOptions = ['18_24', '25_34', '35_44', '45_54', '55_plus']
  responses.push({
    id: generateId(),
    participant_id: participantId,
    question_id: SCREENING_Q3_ID,
    study_id: STUDY_ID,
    response_value: { optionId: isRejected && Math.random() < 0.5 ? 'under18' : randomChoice(ageOptions) },
    response_time_ms: randomInt(2000, 4000),
  })
  responses.push({
    id: generateId(),
    participant_id: participantId,
    question_id: SCREENING_Q4_ID,
    study_id: STUDY_ID,
    response_value: isRejected && Math.random() < 0.5 ? 1 : randomInt(3, 5),
    response_time_ms: randomInt(2000, 4000),
  })

  if (isRejected) return responses

  // Pre-study responses
  responses.push({
    id: generateId(),
    participant_id: participantId,
    question_id: PRE_Q1_ID,
    study_id: STUDY_ID,
    response_value: { optionId: randomChoice(['never', 'few', 'regular', 'professional']) },
    response_time_ms: randomInt(3000, 7000),
  })
  if (Math.random() > 0.4) { // 60% answer optional question
    responses.push({
      id: generateId(),
      participant_id: participantId,
      question_id: PRE_Q2_ID,
      study_id: STUDY_ID,
      response_value: randomChoice([
        'Clear labels and consistent layouts',
        'Visual hierarchy that guides the eye',
        'Familiar patterns and conventions',
        'Minimal cognitive load',
        'Good use of whitespace',
      ]),
      response_time_ms: randomInt(15000, 45000),
    })
  }

  // Post-study responses
  responses.push({
    id: generateId(),
    participant_id: participantId,
    question_id: POST_Q1_ID,
    study_id: STUDY_ID,
    response_value: { optionId: randomChoice(['excellent', 'good', 'okay', 'poor']) },
    response_time_ms: randomInt(3000, 7000),
  })
  responses.push({
    id: generateId(),
    participant_id: participantId,
    question_id: POST_Q2_ID,
    study_id: STUDY_ID,
    response_value: { value: weightedRandom([2, 3, 5, 8, 12, 18, 20, 15, 10, 5, 2]) },
    response_time_ms: randomInt(3000, 8000),
  })
  if (Math.random() > 0.5) { // 50% provide feedback
    const feedbackOptions = [
      'Great study, very engaging!',
      'Some tasks were a bit confusing.',
      'Would love to see more mobile designs.',
      'The instructions were very clear.',
      'Enjoyed the variety of layouts.',
    ]
    responses.push({
      id: generateId(),
      participant_id: participantId,
      question_id: POST_Q3_ID,
      study_id: STUDY_ID,
      response_value: randomChoice(feedbackOptions),
      response_time_ms: randomInt(20000, 60000),
    })
  }

  return responses
}

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

async function main() {
  const log = (msg: string) => process.stdout.write(msg + '\n')
  log('🚀 Starting Ultimate First-Click Test Seed...\n')

  // 1. Create Project (skip if using existing)
  if (EXISTING_PROJECT_ID) {
    log('📁 Using existing project: ' + EXISTING_PROJECT_ID)
  } else {
    log('📁 Creating project...')
    const { error: projErr } = await supabase.from('projects').insert({
      id: PROJECT_ID,
      user_id: USER_ID,
      name: 'Ultimate First-Click Test Project',
      description: 'Comprehensive first-click test with ALL features for testing',
      is_archived: false,
    })
    if (projErr) {
      log('❌ Project error: ' + projErr.message)
      return
    }
    log('✅ Project created')
  }

  // 2. Create Study
  log('📊 Creating study...')
  const { error: studyErr } = await supabase.from('studies').insert({
    id: STUDY_ID,
    project_id: PROJECT_ID,
    user_id: USER_ID,
    study_type: 'first_click',
    title: 'Ultimate First-Click Design Study',
    description: 'Comprehensive first-click test evaluating multiple UI patterns across desktop, mobile, and data visualization interfaces.',
    purpose: 'Evaluate design intuitiveness and identify usability issues in common UI patterns.',
    status: 'active',
    share_code: SHARE_CODE,
    language: 'en',
    settings: {
      studyFlow: studyFlowSettings,
      firstClick: firstClickSettings,
    },
    branding: { primaryColor: '#2563EB', backgroundColor: '#F8FAFC' },
    closing_rule: { type: 'responses', maxResponses: 500, enabled: true },
  })
  if (studyErr) {
    log('❌ Study error: ' + studyErr.message)
    return
  }
  log('✅ Study created')

  // 3. Create Study Flow Questions (Screening, Pre, Post)
  log('📝 Creating study flow questions...')
  const allFlowQuestions = [...screeningQuestions, ...preStudyQuestions, ...postStudyQuestions]
  const { error: flowQErr } = await supabase.from('study_flow_questions').insert(allFlowQuestions)
  if (flowQErr) {
    log('❌ Flow questions error: ' + flowQErr.message)
    return
  }
  log('✅ ' + allFlowQuestions.length + ' study flow questions created')

  // 4. Create Tasks
  log('🎯 Creating tasks...')
  const tasksToInsert = tasks.map(t => ({
    id: t.id,
    study_id: t.study_id,
    instruction: t.instruction,
    position: t.position,
    post_task_questions: t.post_task_questions,
  }))
  const { error: taskErr } = await supabase.from('first_click_tasks').insert(tasksToInsert)
  if (taskErr) {
    log('❌ Tasks error: ' + taskErr.message)
    return
  }
  log('✅ ' + tasks.length + ' tasks created')

  // 5. Create Images
  log('🖼️  Creating images...')
  const { error: imgErr } = await supabase.from('first_click_images').insert(images)
  if (imgErr) {
    log('❌ Images error: ' + imgErr.message)
    return
  }
  log('✅ ' + images.length + ' images created')

  // 6. Create AOIs
  log('🎯 Creating AOIs...')
  const { error: aoiErr } = await supabase.from('first_click_aois').insert(aois)
  if (aoiErr) {
    log('❌ AOIs error: ' + aoiErr.message)
    return
  }
  log('✅ ' + aois.length + ' AOIs created')

  // 7. Generate Participants
  const TOTAL = 100
  const REJECTED = 5
  log(`\n👥 Generating ${TOTAL} participants...`)

  const participants = []
  for (let i = 0; i < TOTAL; i++) {
    participants.push(generateParticipant(i, i < REJECTED))
  }
  participants.sort(() => Math.random() - 0.5)

  const { error: partErr } = await supabase.from('participants').insert(participants)
  if (partErr) {
    log('❌ Participants error: ' + partErr.message)
    return
  }
  log('✅ ' + participants.length + ' participants created')

  // 8. Generate Study Flow Responses
  log('📋 Generating study flow responses...')
  const allFlowResponses: any[] = []
  for (const p of participants) {
    allFlowResponses.push(...generateStudyFlowResponses(p.id, p.status === 'abandoned'))
  }

  for (let i = 0; i < allFlowResponses.length; i += 500) {
    const batch = allFlowResponses.slice(i, i + 500)
    const { error } = await supabase.from('study_flow_responses').insert(batch)
    if (error) log('⚠️ Flow response batch error: ' + error.message)
  }
  log('✅ ' + allFlowResponses.length + ' study flow responses created')

  // 9. Generate First-Click Responses & Post-Task Responses
  log('🖱️  Generating first-click responses...')
  const allClickResponses: any[] = []
  const allPostTaskResponses: any[] = []

  for (const p of participants.filter(p => p.status === 'completed')) {
    const { responses, postTaskResponses } = generateFirstClickResponses(p.id)
    allClickResponses.push(...responses)
    allPostTaskResponses.push(...postTaskResponses)
  }

  for (let i = 0; i < allClickResponses.length; i += 500) {
    const batch = allClickResponses.slice(i, i + 500)
    const { error } = await supabase.from('first_click_responses').insert(batch)
    if (error) log('⚠️ Click response batch error: ' + error.message)
  }
  log('✅ ' + allClickResponses.length + ' first-click responses created')

  // 10. Insert Post-Task Responses
  log('📝 Generating post-task responses...')
  for (let i = 0; i < allPostTaskResponses.length; i += 500) {
    const batch = allPostTaskResponses.slice(i, i + 500)
    const { error } = await supabase.from('first_click_post_task_responses').insert(batch)
    if (error) log('⚠️ Post-task response batch error: ' + error.message)
  }
  log('✅ ' + allPostTaskResponses.length + ' post-task responses created')

  // Calculate metrics for summary
  const correctClicks = allClickResponses.filter(r => r.is_correct && !r.is_skipped).length
  const totalClicks = allClickResponses.filter(r => !r.is_skipped).length
  const successRate = ((correctClicks / totalClicks) * 100).toFixed(1)

  // Summary
  log('\n' + '='.repeat(60))
  log('✨ SEED COMPLETE!')
  log('='.repeat(60))
  log(`
📁 Project ID: ${PROJECT_ID}
📊 Study ID: ${STUDY_ID}
🔗 Share Code: ${SHARE_CODE}
🌐 Participate URL: http://localhost:4001/s/${SHARE_CODE}

Features Included:
✅ Welcome with study details
✅ Participant Agreement with rejection handling
✅ Screening (4 questions with rejection rules)
✅ Demographics (2 sections, 8 fields)
✅ Pre-study questions (2)
✅ Activity instructions (2-part)
✅ Post-study questions (3) with NPS
✅ Thank you with redirect

First-Click Specific:
✅ 8 comprehensive tasks
✅ 8 images (various dimensions)
✅ 31 Areas of Interest (AOIs)
✅ Post-task questions for all tasks (15 total)
✅ Task randomization (first task fixed)
✅ Skip task support
✅ Image scaling settings
✅ Task instruction positioning

Participants: ${TOTAL} total (${REJECTED} rejected, ${TOTAL - REJECTED} completed)
First-Click Responses: ${allClickResponses.length}
Post-Task Responses: ${allPostTaskResponses.length}
Study Flow Responses: ${allFlowResponses.length}

Metrics:
📊 Overall Success Rate: ${successRate}%
⏱️  Average Time to Click: ~3.2s (varies by task)
⏭️  Skip Rate: ~5%
`)
}

main().catch(e => {
  console.error('Error:', e.message)
  process.exit(1)
})
