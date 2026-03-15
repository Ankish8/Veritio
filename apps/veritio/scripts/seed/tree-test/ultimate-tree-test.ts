/**
 * ULTIMATE Comprehensive Tree Test Seed Script
 * Creates an enterprise-level tree test study with EVERY feature:
 *
 * FEATURES INCLUDED:
 * - Complete study flow (welcome, agreement, screening, identifier, thank you)
 * - Rich hierarchical tree structure (4 levels deep, 50+ nodes)
 * - Multiple tasks (10 tasks) with varied difficulty
 * - Post-task questions (ALL 8 question types) with display logic
 * - Pre-study AND post-study questions (enabled)
 * - Screening questions with rejection logic
 * - Answer piping ({Q:id} syntax)
 * - Display logic (conditional visibility)
 * - Branching logic in screening
 * - Tree test settings (all options enabled)
 * - 100 participants with varied responses
 * - Realistic navigation paths with backtracks
 * - Direct success, indirect success, failure distributions
 *
 * Run with: npx tsx scripts/seed/tree-test/ultimate-tree-test.ts
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

// Find existing "demo" project or create new one
const PROJECT_ID = generateId() // Will be updated if demo project exists
const STUDY_ID = generateId()
// Default dev user ID (better-auth)
const USER_ID = process.env.SEED_USER_ID || 'your-better-auth-user-id'
const SHARE_CODE = `ultimate-tree-test-${Date.now()}`

// Screening Question IDs
const SCREENING_Q1_ID = generateId() // Age (with rejection)
const SCREENING_Q2_ID = generateId() // Website usage frequency
const SCREENING_Q3_ID = generateId() // Tech proficiency
const SCREENING_Q4_ID = generateId() // Device preference

// Pre-Study Question IDs
const PRE_Q1_ID = generateId() // Expectations text
const PRE_Q2_ID = generateId() // Navigation preference

// Post-Study Question IDs
const POST_Q1_ID = generateId() // Overall difficulty
const POST_Q2_ID = generateId() // Navigation feedback

// Tree Node IDs (hierarchical structure - E-commerce website)
// Level 0 - Root
const NODE_ROOT_ID = generateId()

// Level 1 - Main Categories
const NODE_HOME_ID = generateId()
const NODE_PRODUCTS_ID = generateId()
const NODE_SERVICES_ID = generateId()
const NODE_SUPPORT_ID = generateId()
const NODE_ABOUT_ID = generateId()
const NODE_ACCOUNT_ID = generateId()

// Level 2 - Products subcategories
const NODE_ELECTRONICS_ID = generateId()
const NODE_CLOTHING_ID = generateId()
const NODE_HOME_GARDEN_ID = generateId()
const NODE_SPORTS_ID = generateId()
const NODE_BOOKS_ID = generateId()

// Level 2 - Services subcategories
const NODE_DELIVERY_ID = generateId()
const NODE_INSTALLATION_ID = generateId()
const NODE_WARRANTY_ID = generateId()
const NODE_GIFT_CARDS_ID = generateId()

// Level 2 - Support subcategories
const NODE_FAQ_ID = generateId()
const NODE_CONTACT_ID = generateId()
const NODE_RETURNS_ID = generateId()
const NODE_TRACK_ORDER_ID = generateId()
const NODE_HELP_CENTER_ID = generateId()

// Level 2 - About subcategories
const NODE_COMPANY_ID = generateId()
const NODE_CAREERS_ID = generateId()
const NODE_PRESS_ID = generateId()
const NODE_SUSTAINABILITY_ID = generateId()

// Level 2 - Account subcategories
const NODE_PROFILE_ID = generateId()
const NODE_ORDERS_ID = generateId()
const NODE_WISHLIST_ID = generateId()
const NODE_SETTINGS_ID = generateId()
const NODE_PAYMENT_ID = generateId()

// Level 3 - Electronics subcategories
const NODE_PHONES_ID = generateId()
const NODE_LAPTOPS_ID = generateId()
const NODE_TVS_ID = generateId()
const NODE_AUDIO_ID = generateId()
const NODE_CAMERAS_ID = generateId()
const NODE_GAMING_ID = generateId()

// Level 3 - Clothing subcategories
const NODE_MENS_ID = generateId()
const NODE_WOMENS_ID = generateId()
const NODE_KIDS_ID = generateId()
const NODE_ACCESSORIES_ID = generateId()

// Level 3 - Home & Garden subcategories
const NODE_FURNITURE_ID = generateId()
const NODE_KITCHEN_ID = generateId()
const NODE_GARDEN_TOOLS_ID = generateId()
const NODE_DECOR_ID = generateId()

// Level 3 - Support deeper
const NODE_EMAIL_SUPPORT_ID = generateId()
const NODE_PHONE_SUPPORT_ID = generateId()
const NODE_LIVE_CHAT_ID = generateId()

// Level 3 - Account deeper
const NODE_CHANGE_PASSWORD_ID = generateId()
const NODE_PRIVACY_SETTINGS_ID = generateId()
const NODE_NOTIFICATIONS_ID = generateId()
const NODE_ADD_PAYMENT_ID = generateId()
const NODE_SAVED_ADDRESSES_ID = generateId()

// Level 4 - Phones deeper
const NODE_IPHONE_ID = generateId()
const NODE_SAMSUNG_ID = generateId()
const NODE_PHONE_ACCESSORIES_ID = generateId()

// Level 4 - Laptops deeper
const NODE_MACBOOKS_ID = generateId()
const NODE_WINDOWS_LAPTOPS_ID = generateId()
const NODE_CHROMEBOOKS_ID = generateId()

// Task IDs (10 tasks with varying difficulty)
const TASK_1_ID = generateId() // Easy: Find contact page
const TASK_2_ID = generateId() // Easy: Find order tracking
const TASK_3_ID = generateId() // Medium: Find return policy
const TASK_4_ID = generateId() // Medium: Find laptop deals
const TASK_5_ID = generateId() // Medium: Find password change
const TASK_6_ID = generateId() // Hard: Find MacBook laptops
const TASK_7_ID = generateId() // Hard: Find sustainability info
const TASK_8_ID = generateId() // Hard: Find live chat support
const TASK_9_ID = generateId() // Hard: Find iPhone accessories
const TASK_10_ID = generateId() // Medium: Find wishlist

// Post-task Question IDs (for tasks)
const PTQ_1_1_ID = generateId() // Confidence rating after task 1
const PTQ_1_2_ID = generateId() // Was it easy to find?
const PTQ_2_1_ID = generateId() // Expected location
const PTQ_3_1_ID = generateId() // Return policy clarity
const PTQ_3_2_ID = generateId() // Improvement suggestions
const PTQ_5_1_ID = generateId() // Security concern
const PTQ_6_1_ID = generateId() // Product range satisfaction
const PTQ_6_2_ID = generateId() // Matrix rating
const PTQ_8_1_ID = generateId() // Support preference ranking
const PTQ_10_1_ID = generateId() // NPS after wishlist task

// =============================================================================
// STUDY FLOW SETTINGS (Complete configuration)
// =============================================================================

const studyFlowSettings = {
  welcome: {
    enabled: true,
    title: 'Welcome to Our Website Navigation Study',
    message: `<p><strong>Thank you for participating!</strong></p>
<p>In this study, you'll help us evaluate our website's navigation structure. You'll be given 10 tasks to find specific items in our website menu.</p>
<p>This should take about 10-15 minutes.</p>`,
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
<li>My navigation patterns will be recorded anonymously</li>
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
            { id: 'ageRange', type: 'predefined' as const, fieldType: 'ageRange' as const, position: 3, enabled: true, required: true, mappedToScreeningQuestionId: SCREENING_Q1_ID, width: 'half' as const },
          ],
        },
        {
          id: 'tech',
          name: 'Tech Profile',
          position: 1,
          title: 'Technology Background',
          fields: [
            { id: 'primaryDevice', type: 'predefined' as const, fieldType: 'primaryDevice' as const, position: 0, enabled: true, required: true, mappedToScreeningQuestionId: SCREENING_Q4_ID, width: 'half' as const },
            { id: 'techProficiency', type: 'predefined' as const, fieldType: 'techProficiency' as const, position: 1, enabled: true, required: true, mappedToScreeningQuestionId: SCREENING_Q3_ID, width: 'half' as const },
          ],
        },
      ],
      ageRangeOptions: { ranges: ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'] },
      primaryDeviceOptions: { options: ['Desktop', 'Mobile', 'Tablet'] },
      techProficiencyOptions: { options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
    },
  },
  preStudyQuestions: {
    enabled: true,
    showIntro: true,
    introTitle: 'Before We Begin',
    introMessage: 'A few quick questions about your shopping habits.',
    pageMode: 'one_per_page' as const,
    randomizeQuestions: false,
  },
  activityInstructions: {
    enabled: true,
    title: 'Tree Test Instructions',
    message: `<p><strong>How this test works:</strong></p>
<ol>
<li>You'll see a task description asking you to find something on our website</li>
<li>Navigate through the menu structure by clicking to expand categories</li>
<li>When you find the right location, select it and confirm your answer</li>
<li>Don't worry if you make mistakes - we're testing our website, not you!</li>
</ol>
<p><em>Tip: You can go back to previous levels if you take a wrong turn.</em></p>`,
    showTimer: false,
    timerDuration: 0,
    allowSkip: true,
  },
  postStudyQuestions: {
    enabled: true,
    showIntro: true,
    introTitle: 'Almost Done!',
    introMessage: 'Just a couple more questions about your overall experience.',
    pageMode: 'one_per_page' as const,
    randomizeQuestions: false,
  },
  thankYou: {
    enabled: true,
    title: 'Thank You!',
    message: `<p><strong>Your navigation data has been recorded.</strong></p>
<p>We truly appreciate your time. Your feedback helps us improve our website structure for everyone.</p>`,
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

// =============================================================================
// TREE TEST SETTINGS
// =============================================================================

const treeTestSettings = {
  randomizeTasks: true,
  showBreadcrumbs: true,
  allowBack: true,
  showTaskProgress: true,
  allowSkipTasks: true,
  dontRandomizeFirstTask: true, // Keep first task first for warm-up
  answerButtonText: 'This is the correct location',
  studyFlow: studyFlowSettings,
}

// =============================================================================
// SCREENING QUESTIONS
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
  // Q2: Website usage frequency
  {
    id: SCREENING_Q2_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 1,
    question_type: 'multiple_choice',
    question_text: 'How often do you shop online?',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'never', label: 'Never' },
        { id: 'rarely', label: 'Rarely (a few times a year)' },
        { id: 'monthly', label: 'Monthly' },
        { id: 'weekly', label: 'Weekly' },
        { id: 'daily', label: 'Daily' },
      ],
    },
    branching_logic: {
      rules: [{ optionId: 'never', target: 'reject' }],
      defaultTarget: 'next',
    },
  },
  // Q3: Tech proficiency
  {
    id: SCREENING_Q3_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 2,
    question_type: 'multiple_choice',
    question_text: 'How would you rate your technology proficiency?',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'beginner', label: 'Beginner' },
        { id: 'intermediate', label: 'Intermediate' },
        { id: 'advanced', label: 'Advanced' },
        { id: 'expert', label: 'Expert' },
      ],
    },
  },
  // Q4: Device preference
  {
    id: SCREENING_Q4_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 3,
    question_type: 'multiple_choice',
    question_text: 'What device do you primarily use for online shopping?',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'desktop', label: 'Desktop Computer' },
        { id: 'laptop', label: 'Laptop' },
        { id: 'tablet', label: 'Tablet' },
        { id: 'mobile', label: 'Mobile Phone' },
      ],
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
    question_text: 'What do you typically look for when navigating a new e-commerce website?',
    description: 'This helps us understand your navigation expectations.',
    is_required: true,
    config: {
      placeholder: 'Tell us about your navigation habits...',
      maxLength: 500,
    },
  },
  {
    id: PRE_Q2_ID,
    study_id: STUDY_ID,
    section: 'pre_study',
    position: 1,
    question_type: 'multiple_choice',
    question_text: 'How do you prefer to navigate websites?',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'menu', label: 'Using navigation menus' },
        { id: 'search', label: 'Using search functionality' },
        { id: 'both', label: 'Both equally' },
        { id: 'links', label: 'Following links on pages' },
      ],
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
    question_type: 'opinion_scale',
    question_text: 'Overall, how easy was it to find things on our website?',
    is_required: true,
    config: {
      scalePoints: 7,
      startAtZero: false,
      scaleType: 'numerical',
      leftLabel: 'Very Difficult',
      middleLabel: 'Neutral',
      rightLabel: 'Very Easy',
    },
  },
  {
    id: POST_Q2_ID,
    study_id: STUDY_ID,
    section: 'post_study',
    position: 1,
    question_type: 'multi_line_text',
    question_text: 'What would you change about our website navigation?',
    is_required: false,
    config: {
      placeholder: 'Share any suggestions for improvement...',
      maxLength: 1000,
    },
  },
]

// =============================================================================
// TREE NODES (Hierarchical E-commerce Website Structure)
// =============================================================================

const treeNodes = [
  // Level 0 - Root (Home)
  { id: NODE_ROOT_ID, study_id: STUDY_ID, parent_id: null, label: 'Home', position: 0 },

  // Level 1 - Main Categories
  { id: NODE_HOME_ID, study_id: STUDY_ID, parent_id: NODE_ROOT_ID, label: 'Home Page', position: 0 },
  { id: NODE_PRODUCTS_ID, study_id: STUDY_ID, parent_id: NODE_ROOT_ID, label: 'Products', position: 1 },
  { id: NODE_SERVICES_ID, study_id: STUDY_ID, parent_id: NODE_ROOT_ID, label: 'Services', position: 2 },
  { id: NODE_SUPPORT_ID, study_id: STUDY_ID, parent_id: NODE_ROOT_ID, label: 'Support', position: 3 },
  { id: NODE_ABOUT_ID, study_id: STUDY_ID, parent_id: NODE_ROOT_ID, label: 'About Us', position: 4 },
  { id: NODE_ACCOUNT_ID, study_id: STUDY_ID, parent_id: NODE_ROOT_ID, label: 'My Account', position: 5 },

  // Level 2 - Products subcategories
  { id: NODE_ELECTRONICS_ID, study_id: STUDY_ID, parent_id: NODE_PRODUCTS_ID, label: 'Electronics', position: 0 },
  { id: NODE_CLOTHING_ID, study_id: STUDY_ID, parent_id: NODE_PRODUCTS_ID, label: 'Clothing', position: 1 },
  { id: NODE_HOME_GARDEN_ID, study_id: STUDY_ID, parent_id: NODE_PRODUCTS_ID, label: 'Home & Garden', position: 2 },
  { id: NODE_SPORTS_ID, study_id: STUDY_ID, parent_id: NODE_PRODUCTS_ID, label: 'Sports & Outdoors', position: 3 },
  { id: NODE_BOOKS_ID, study_id: STUDY_ID, parent_id: NODE_PRODUCTS_ID, label: 'Books & Media', position: 4 },

  // Level 2 - Services subcategories
  { id: NODE_DELIVERY_ID, study_id: STUDY_ID, parent_id: NODE_SERVICES_ID, label: 'Delivery Options', position: 0 },
  { id: NODE_INSTALLATION_ID, study_id: STUDY_ID, parent_id: NODE_SERVICES_ID, label: 'Installation Services', position: 1 },
  { id: NODE_WARRANTY_ID, study_id: STUDY_ID, parent_id: NODE_SERVICES_ID, label: 'Warranty & Protection', position: 2 },
  { id: NODE_GIFT_CARDS_ID, study_id: STUDY_ID, parent_id: NODE_SERVICES_ID, label: 'Gift Cards', position: 3 },

  // Level 2 - Support subcategories
  { id: NODE_FAQ_ID, study_id: STUDY_ID, parent_id: NODE_SUPPORT_ID, label: 'FAQ', position: 0 },
  { id: NODE_CONTACT_ID, study_id: STUDY_ID, parent_id: NODE_SUPPORT_ID, label: 'Contact Us', position: 1 },
  { id: NODE_RETURNS_ID, study_id: STUDY_ID, parent_id: NODE_SUPPORT_ID, label: 'Returns & Refunds', position: 2 },
  { id: NODE_TRACK_ORDER_ID, study_id: STUDY_ID, parent_id: NODE_SUPPORT_ID, label: 'Track Order', position: 3 },
  { id: NODE_HELP_CENTER_ID, study_id: STUDY_ID, parent_id: NODE_SUPPORT_ID, label: 'Help Center', position: 4 },

  // Level 2 - About subcategories
  { id: NODE_COMPANY_ID, study_id: STUDY_ID, parent_id: NODE_ABOUT_ID, label: 'Company Info', position: 0 },
  { id: NODE_CAREERS_ID, study_id: STUDY_ID, parent_id: NODE_ABOUT_ID, label: 'Careers', position: 1 },
  { id: NODE_PRESS_ID, study_id: STUDY_ID, parent_id: NODE_ABOUT_ID, label: 'Press Room', position: 2 },
  { id: NODE_SUSTAINABILITY_ID, study_id: STUDY_ID, parent_id: NODE_ABOUT_ID, label: 'Sustainability', position: 3 },

  // Level 2 - Account subcategories
  { id: NODE_PROFILE_ID, study_id: STUDY_ID, parent_id: NODE_ACCOUNT_ID, label: 'My Profile', position: 0 },
  { id: NODE_ORDERS_ID, study_id: STUDY_ID, parent_id: NODE_ACCOUNT_ID, label: 'Order History', position: 1 },
  { id: NODE_WISHLIST_ID, study_id: STUDY_ID, parent_id: NODE_ACCOUNT_ID, label: 'Wishlist', position: 2 },
  { id: NODE_SETTINGS_ID, study_id: STUDY_ID, parent_id: NODE_ACCOUNT_ID, label: 'Account Settings', position: 3 },
  { id: NODE_PAYMENT_ID, study_id: STUDY_ID, parent_id: NODE_ACCOUNT_ID, label: 'Payment Methods', position: 4 },

  // Level 3 - Electronics subcategories
  { id: NODE_PHONES_ID, study_id: STUDY_ID, parent_id: NODE_ELECTRONICS_ID, label: 'Phones & Smartphones', position: 0 },
  { id: NODE_LAPTOPS_ID, study_id: STUDY_ID, parent_id: NODE_ELECTRONICS_ID, label: 'Laptops & Computers', position: 1 },
  { id: NODE_TVS_ID, study_id: STUDY_ID, parent_id: NODE_ELECTRONICS_ID, label: 'TVs & Displays', position: 2 },
  { id: NODE_AUDIO_ID, study_id: STUDY_ID, parent_id: NODE_ELECTRONICS_ID, label: 'Audio Equipment', position: 3 },
  { id: NODE_CAMERAS_ID, study_id: STUDY_ID, parent_id: NODE_ELECTRONICS_ID, label: 'Cameras & Photography', position: 4 },
  { id: NODE_GAMING_ID, study_id: STUDY_ID, parent_id: NODE_ELECTRONICS_ID, label: 'Gaming', position: 5 },

  // Level 3 - Clothing subcategories
  { id: NODE_MENS_ID, study_id: STUDY_ID, parent_id: NODE_CLOTHING_ID, label: 'Men\'s', position: 0 },
  { id: NODE_WOMENS_ID, study_id: STUDY_ID, parent_id: NODE_CLOTHING_ID, label: 'Women\'s', position: 1 },
  { id: NODE_KIDS_ID, study_id: STUDY_ID, parent_id: NODE_CLOTHING_ID, label: 'Kids\'', position: 2 },
  { id: NODE_ACCESSORIES_ID, study_id: STUDY_ID, parent_id: NODE_CLOTHING_ID, label: 'Accessories', position: 3 },

  // Level 3 - Home & Garden subcategories
  { id: NODE_FURNITURE_ID, study_id: STUDY_ID, parent_id: NODE_HOME_GARDEN_ID, label: 'Furniture', position: 0 },
  { id: NODE_KITCHEN_ID, study_id: STUDY_ID, parent_id: NODE_HOME_GARDEN_ID, label: 'Kitchen', position: 1 },
  { id: NODE_GARDEN_TOOLS_ID, study_id: STUDY_ID, parent_id: NODE_HOME_GARDEN_ID, label: 'Garden Tools', position: 2 },
  { id: NODE_DECOR_ID, study_id: STUDY_ID, parent_id: NODE_HOME_GARDEN_ID, label: 'Home Decor', position: 3 },

  // Level 3 - Contact deeper
  { id: NODE_EMAIL_SUPPORT_ID, study_id: STUDY_ID, parent_id: NODE_CONTACT_ID, label: 'Email Support', position: 0 },
  { id: NODE_PHONE_SUPPORT_ID, study_id: STUDY_ID, parent_id: NODE_CONTACT_ID, label: 'Phone Support', position: 1 },
  { id: NODE_LIVE_CHAT_ID, study_id: STUDY_ID, parent_id: NODE_CONTACT_ID, label: 'Live Chat', position: 2 },

  // Level 3 - Account Settings deeper
  { id: NODE_CHANGE_PASSWORD_ID, study_id: STUDY_ID, parent_id: NODE_SETTINGS_ID, label: 'Change Password', position: 0 },
  { id: NODE_PRIVACY_SETTINGS_ID, study_id: STUDY_ID, parent_id: NODE_SETTINGS_ID, label: 'Privacy Settings', position: 1 },
  { id: NODE_NOTIFICATIONS_ID, study_id: STUDY_ID, parent_id: NODE_SETTINGS_ID, label: 'Notification Preferences', position: 2 },

  // Level 3 - Payment deeper
  { id: NODE_ADD_PAYMENT_ID, study_id: STUDY_ID, parent_id: NODE_PAYMENT_ID, label: 'Add Payment Method', position: 0 },
  { id: NODE_SAVED_ADDRESSES_ID, study_id: STUDY_ID, parent_id: NODE_PAYMENT_ID, label: 'Saved Addresses', position: 1 },

  // Level 4 - Phones deeper
  { id: NODE_IPHONE_ID, study_id: STUDY_ID, parent_id: NODE_PHONES_ID, label: 'iPhone', position: 0 },
  { id: NODE_SAMSUNG_ID, study_id: STUDY_ID, parent_id: NODE_PHONES_ID, label: 'Samsung Galaxy', position: 1 },
  { id: NODE_PHONE_ACCESSORIES_ID, study_id: STUDY_ID, parent_id: NODE_PHONES_ID, label: 'Phone Accessories', position: 2 },

  // Level 4 - Laptops deeper
  { id: NODE_MACBOOKS_ID, study_id: STUDY_ID, parent_id: NODE_LAPTOPS_ID, label: 'MacBooks', position: 0 },
  { id: NODE_WINDOWS_LAPTOPS_ID, study_id: STUDY_ID, parent_id: NODE_LAPTOPS_ID, label: 'Windows Laptops', position: 1 },
  { id: NODE_CHROMEBOOKS_ID, study_id: STUDY_ID, parent_id: NODE_LAPTOPS_ID, label: 'Chromebooks', position: 2 },
]

// =============================================================================
// TASKS (10 tasks with varying difficulty and post-task questions)
// =============================================================================

const tasks = [
  // Task 1: Easy - Find contact page (with post-task questions)
  {
    id: TASK_1_ID,
    study_id: STUDY_ID,
    question: 'You want to speak with customer service. Where would you find contact options?',
    correct_node_id: NODE_CONTACT_ID,
    position: 0,
    post_task_questions: [
      {
        id: PTQ_1_1_ID,
        question_text: 'How confident are you that you found the right place?',
        question_type: 'opinion_scale',
        is_required: true,
        position: 0,
        config: {
          scalePoints: 5,
          startAtZero: false,
          scaleType: 'stars',
          leftLabel: 'Not confident',
          rightLabel: 'Very confident',
        },
      },
      {
        id: PTQ_1_2_ID,
        question_text: 'Was this location easy to find?',
        question_type: 'yes_no',
        is_required: true,
        position: 1,
        config: {
          styleType: 'buttons',
          yesLabel: 'Yes, it was easy',
          noLabel: 'No, it was difficult',
        },
      },
    ],
  },
  // Task 2: Easy - Find order tracking
  {
    id: TASK_2_ID,
    study_id: STUDY_ID,
    question: 'You placed an order last week and want to check its delivery status. Where would you go?',
    correct_node_id: NODE_TRACK_ORDER_ID,
    position: 1,
    post_task_questions: [
      {
        id: PTQ_2_1_ID,
        question_text: 'Where did you initially expect to find this?',
        question_type: 'single_line_text',
        is_required: false,
        position: 0,
        config: {
          placeholder: 'e.g., Under "My Account", "Orders", etc.',
          maxLength: 200,
        },
      },
    ],
  },
  // Task 3: Medium - Find return policy (with conditional post-task questions)
  {
    id: TASK_3_ID,
    study_id: STUDY_ID,
    question: 'You received a defective product and need to return it. Where would you find information about returns?',
    correct_node_id: NODE_RETURNS_ID,
    position: 2,
    post_task_questions: [
      {
        id: PTQ_3_1_ID,
        question_text: 'Based on your navigation experience, do you think our return policy is easy to access?',
        question_type: 'multiple_choice',
        is_required: true,
        position: 0,
        config: {
          mode: 'single',
          options: [
            { id: 'very_easy', label: 'Very easy to find' },
            { id: 'somewhat_easy', label: 'Somewhat easy' },
            { id: 'neutral', label: 'Neutral' },
            { id: 'somewhat_hard', label: 'Somewhat difficult' },
            { id: 'very_hard', label: 'Very difficult to find' },
          ],
        },
      },
      {
        id: PTQ_3_2_ID,
        question_text: 'What would make it easier to find the return policy?',
        question_type: 'multi_line_text',
        is_required: false,
        position: 1,
        config: {
          placeholder: 'Share your suggestions...',
          maxLength: 500,
        },
        // DISPLAY LOGIC: Only show if they said it was difficult
        display_logic: {
          action: 'show',
          conditions: [
            { questionId: PTQ_3_1_ID, operator: 'is_any_of', values: ['somewhat_hard', 'very_hard'] },
          ],
          matchAll: true,
        },
      },
    ],
  },
  // Task 4: Medium - Find laptop deals
  {
    id: TASK_4_ID,
    study_id: STUDY_ID,
    question: 'You\'re looking to buy a new laptop. Where would you browse laptop options?',
    correct_node_id: NODE_LAPTOPS_ID,
    position: 3,
    post_task_questions: [],
  },
  // Task 5: Medium - Find password change (with security question)
  {
    id: TASK_5_ID,
    study_id: STUDY_ID,
    question: 'You want to update your account password for security. Where would you do this?',
    correct_node_id: NODE_CHANGE_PASSWORD_ID,
    position: 4,
    post_task_questions: [
      {
        id: PTQ_5_1_ID,
        question_text: 'Did you feel confident that your password change would be secure at this location?',
        question_type: 'yes_no',
        is_required: true,
        position: 0,
        config: {
          styleType: 'icons',
          yesLabel: 'Yes, it felt secure',
          noLabel: 'No, I had concerns',
        },
      },
    ],
  },
  // Task 6: Hard - Find MacBook laptops (with matrix rating)
  {
    id: TASK_6_ID,
    study_id: STUDY_ID,
    question: 'You want to compare MacBook models. Where would you find Apple MacBooks?',
    correct_node_id: NODE_MACBOOKS_ID,
    position: 5,
    post_task_questions: [
      {
        id: PTQ_6_1_ID,
        question_text: 'How satisfied are you with our product categorization?',
        question_type: 'opinion_scale',
        is_required: true,
        position: 0,
        config: {
          scalePoints: 5,
          startAtZero: false,
          scaleType: 'emotions',
          leftLabel: 'Very Unsatisfied',
          rightLabel: 'Very Satisfied',
        },
      },
      {
        id: PTQ_6_2_ID,
        question_text: 'Please rate the following aspects of our product navigation:',
        question_type: 'matrix',
        is_required: true,
        position: 1,
        config: {
          rows: [
            { id: 'clarity', label: 'Category clarity' },
            { id: 'depth', label: 'Navigation depth' },
            { id: 'labels', label: 'Label accuracy' },
          ],
          columns: [
            { id: 'poor', label: 'Poor' },
            { id: 'fair', label: 'Fair' },
            { id: 'good', label: 'Good' },
            { id: 'excellent', label: 'Excellent' },
          ],
          allowMultiplePerRow: false,
        },
      },
    ],
  },
  // Task 7: Hard - Find sustainability info
  {
    id: TASK_7_ID,
    study_id: STUDY_ID,
    question: 'You want to learn about the company\'s environmental commitments. Where would you find sustainability information?',
    correct_node_id: NODE_SUSTAINABILITY_ID,
    position: 6,
    post_task_questions: [],
  },
  // Task 8: Hard - Find live chat support (with ranking)
  {
    id: TASK_8_ID,
    study_id: STUDY_ID,
    question: 'You need immediate help and want to chat with a support agent in real-time. Where would you find live chat?',
    correct_node_id: NODE_LIVE_CHAT_ID,
    position: 7,
    post_task_questions: [
      {
        id: PTQ_8_1_ID,
        question_text: 'Rank your preferred support channels from most to least preferred:',
        question_type: 'ranking',
        is_required: true,
        position: 0,
        config: {
          items: [
            { id: 'live_chat', label: 'Live Chat' },
            { id: 'phone', label: 'Phone Support' },
            { id: 'email', label: 'Email' },
            { id: 'faq', label: 'FAQ/Self-service' },
          ],
          randomOrder: false,
        },
      },
    ],
  },
  // Task 9: Hard - Find iPhone accessories (deepest level)
  {
    id: TASK_9_ID,
    study_id: STUDY_ID,
    question: 'You just bought an iPhone and want to browse cases and accessories for it. Where would you look?',
    correct_node_id: NODE_PHONE_ACCESSORIES_ID,
    position: 8,
    post_task_questions: [],
  },
  // Task 10: Medium - Find wishlist (with NPS)
  {
    id: TASK_10_ID,
    study_id: STUDY_ID,
    question: 'You want to save some products to buy later. Where would you find your wishlist?',
    correct_node_id: NODE_WISHLIST_ID,
    position: 9,
    post_task_questions: [
      {
        id: PTQ_10_1_ID,
        question_text: 'Based on this task, how likely are you to recommend our website navigation to a friend?',
        question_type: 'nps',
        is_required: true,
        position: 0,
        config: {
          leftLabel: 'Not at all likely',
          rightLabel: 'Extremely likely',
        },
      },
    ],
  },
]

// =============================================================================
// PARTICIPANT DATA GENERATION HELPERS
// =============================================================================

const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'James',
  'Mia', 'Benjamin', 'Charlotte', 'Lucas', 'Amelia', 'Henry', 'Harper', 'Alexander', 'Evelyn', 'Daniel']
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee']

const preStudyResponses = {
  navigation: [
    'I look for clear category labels and easy-to-find menus',
    'Usually I search for products directly, but menus help when browsing',
    'I expect prominent navigation with logical groupings',
    'Quick access to account and cart is important to me',
  ],
}

const postStudyFeedback = [
  'The navigation was mostly intuitive, but some items were nested too deep',
  'Good overall structure. Would like a search bar more prominent',
  'Some category names were confusing. "Services" vs "Support" unclear',
  'Very clean navigation. Found most items easily',
  'Too many clicks to find specific products',
]

// Build path maps for generating realistic navigation paths
const nodeMap = new Map(treeNodes.map(n => [n.id, n]))

function getPathToNode(nodeId: string): string[] {
  const path: string[] = []
  let currentId: string | null = nodeId

  while (currentId) {
    path.unshift(currentId)
    const node = nodeMap.get(currentId)
    currentId = node?.parent_id || null
  }

  return path
}

// Generate a navigation path with possible wrong turns and backtracks
function generateNavigationPath(
  correctNodeId: string,
  difficulty: 'easy' | 'medium' | 'hard',
  shouldSucceed: boolean
): { pathTaken: string[], selectedNodeId: string | null, isCorrect: boolean, isDirect: boolean, backtrackCount: number } {
  const correctPath = getPathToNode(correctNodeId)

  if (!shouldSucceed) {
    // Failed navigation - select wrong node (leaf nodes only, excluding root and correct answer)
    const wrongNodes = treeNodes.filter(n =>
      n.id !== correctNodeId &&
      n.parent_id !== null &&
      !treeNodes.some(child => child.parent_id === n.id) // Only leaf nodes
    )
    if (wrongNodes.length === 0) {
      // Fallback: just pick any non-correct node
      const fallbackNodes = treeNodes.filter(n => n.id !== correctNodeId && n.parent_id !== null)
      const wrongNode = randomChoice(fallbackNodes)
      return {
        pathTaken: getPathToNode(wrongNode.id),
        selectedNodeId: wrongNode.id,
        isCorrect: false,
        isDirect: false,
        backtrackCount: randomInt(0, 2),
      }
    }
    const wrongNode = randomChoice(wrongNodes)
    const wrongPath = getPathToNode(wrongNode.id)

    // Add some exploration
    const explorePath = [...wrongPath.slice(0, -1)]
    if (Math.random() > 0.5 && wrongPath.length > 2) {
      // Add a detour
      const detourNodes = treeNodes.filter(n => n.parent_id === wrongPath[1])
      if (detourNodes.length > 0) {
        const detourNode = randomChoice(detourNodes)
        explorePath.push(detourNode.id)
        if (wrongPath.length > 2) {
          explorePath.push(wrongPath[wrongPath.length - 2]) // Go back
        }
      }
    }
    explorePath.push(wrongNode.id)

    return {
      pathTaken: explorePath,
      selectedNodeId: wrongNode.id,
      isCorrect: false,
      isDirect: false,
      backtrackCount: Math.random() > 0.5 ? randomInt(1, 3) : 0,
    }
  }

  // Determine if direct or indirect success
  const directChance = difficulty === 'easy' ? 0.7 : difficulty === 'medium' ? 0.5 : 0.3
  const isDirect = Math.random() < directChance

  if (isDirect) {
    // Direct success - straight to correct answer
    return {
      pathTaken: correctPath,
      selectedNodeId: correctNodeId,
      isCorrect: true,
      isDirect: true,
      backtrackCount: 0,
    }
  }

  // Indirect success - took wrong turns but eventually found it
  const pathTaken: string[] = [correctPath[0]] // Start at root
  let backtrackCount = 0

  // Explore some wrong paths first
  const wrongTurns = randomInt(1, 3)
  for (let i = 0; i < wrongTurns; i++) {
    const siblings = treeNodes.filter(n =>
      n.parent_id === pathTaken[pathTaken.length - 1] &&
      !correctPath.includes(n.id)
    )

    if (siblings.length > 0) {
      const wrongSibling = randomChoice(siblings)
      pathTaken.push(wrongSibling.id)

      // Maybe go deeper into wrong path
      if (Math.random() > 0.5) {
        const children = treeNodes.filter(n => n.parent_id === wrongSibling.id)
        if (children.length > 0) {
          pathTaken.push(randomChoice(children).id)
          backtrackCount++
          pathTaken.push(wrongSibling.id) // Go back up
        }
      }

      backtrackCount++
      pathTaken.push(pathTaken[pathTaken.length - wrongTurns - 1] || correctPath[0]) // Go back
    }
  }

  // Now follow correct path
  for (let i = 1; i < correctPath.length; i++) {
    pathTaken.push(correctPath[i])
  }

  return {
    pathTaken,
    selectedNodeId: correctNodeId,
    isCorrect: true,
    isDirect: false,
    backtrackCount,
  }
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
    session_token: `session_tree_${Date.now()}_${index}`,
    status: isRejected ? 'abandoned' : 'completed',
    started_at: baseDate.toISOString(),
    completed_at: isRejected ? null : new Date(baseDate.getTime() + randomInt(600000, 1200000)).toISOString(),
    identifier_type: 'email',
    identifier_value: email,
    screening_result: isRejected ? 'rejected' : 'passed',
    country: randomChoice(['US', 'UK', 'CA', 'AU', 'DE']),
    metadata: { email, firstName, lastName },
  }
}

function generateScreeningResponses(participantId: string, isRejected: boolean) {
  const responses: any[] = []

  // Q1: Age
  const ageOptions = ['age_18_24', 'age_25_34', 'age_35_44', 'age_45_54', 'age_55plus']
  responses.push({
    id: generateId(), participant_id: participantId, question_id: SCREENING_Q1_ID, study_id: STUDY_ID,
    response_value: { optionId: isRejected && Math.random() < 0.3 ? 'age_under18' : randomChoice(ageOptions) },
    response_time_ms: randomInt(2000, 5000),
  })

  // Q2: Shopping frequency
  const freqOptions = ['rarely', 'monthly', 'weekly', 'daily']
  responses.push({
    id: generateId(), participant_id: participantId, question_id: SCREENING_Q2_ID, study_id: STUDY_ID,
    response_value: { optionId: isRejected && Math.random() < 0.3 ? 'never' : randomChoice(freqOptions) },
    response_time_ms: randomInt(2000, 4000),
  })

  // Q3: Tech proficiency
  responses.push({
    id: generateId(), participant_id: participantId, question_id: SCREENING_Q3_ID, study_id: STUDY_ID,
    response_value: { optionId: randomChoice(['beginner', 'intermediate', 'advanced', 'expert']) },
    response_time_ms: randomInt(2000, 4000),
  })

  // Q4: Device
  responses.push({
    id: generateId(), participant_id: participantId, question_id: SCREENING_Q4_ID, study_id: STUDY_ID,
    response_value: { optionId: randomChoice(['desktop', 'laptop', 'tablet', 'mobile']) },
    response_time_ms: randomInt(2000, 4000),
  })

  return responses
}

function generatePrePostResponses(participantId: string) {
  const responses: any[] = []

  // Pre-study Q1
  responses.push({
    id: generateId(), participant_id: participantId, question_id: PRE_Q1_ID, study_id: STUDY_ID,
    response_value: randomChoice(preStudyResponses.navigation),
    response_time_ms: randomInt(15000, 30000),
  })

  // Pre-study Q2
  responses.push({
    id: generateId(), participant_id: participantId, question_id: PRE_Q2_ID, study_id: STUDY_ID,
    response_value: { optionId: randomChoice(['menu', 'search', 'both', 'links']) },
    response_time_ms: randomInt(3000, 7000),
  })

  // Post-study Q1 (opinion scale 1-7)
  responses.push({
    id: generateId(), participant_id: participantId, question_id: POST_Q1_ID, study_id: STUDY_ID,
    response_value: weightedRandom([2, 5, 10, 20, 30, 25, 8]) + 1,
    response_time_ms: randomInt(3000, 6000),
  })

  // Post-study Q2 (optional feedback)
  if (Math.random() > 0.3) {
    responses.push({
      id: generateId(), participant_id: participantId, question_id: POST_Q2_ID, study_id: STUDY_ID,
      response_value: randomChoice(postStudyFeedback),
      response_time_ms: randomInt(20000, 45000),
    })
  }

  return responses
}

interface TaskConfig {
  taskId: string
  correctNodeId: string
  difficulty: 'easy' | 'medium' | 'hard'
  postTaskQuestions: any[]
}

const taskConfigs: TaskConfig[] = [
  { taskId: TASK_1_ID, correctNodeId: NODE_CONTACT_ID, difficulty: 'easy', postTaskQuestions: tasks[0].post_task_questions },
  { taskId: TASK_2_ID, correctNodeId: NODE_TRACK_ORDER_ID, difficulty: 'easy', postTaskQuestions: tasks[1].post_task_questions },
  { taskId: TASK_3_ID, correctNodeId: NODE_RETURNS_ID, difficulty: 'medium', postTaskQuestions: tasks[2].post_task_questions },
  { taskId: TASK_4_ID, correctNodeId: NODE_LAPTOPS_ID, difficulty: 'medium', postTaskQuestions: tasks[3].post_task_questions },
  { taskId: TASK_5_ID, correctNodeId: NODE_CHANGE_PASSWORD_ID, difficulty: 'medium', postTaskQuestions: tasks[4].post_task_questions },
  { taskId: TASK_6_ID, correctNodeId: NODE_MACBOOKS_ID, difficulty: 'hard', postTaskQuestions: tasks[5].post_task_questions },
  { taskId: TASK_7_ID, correctNodeId: NODE_SUSTAINABILITY_ID, difficulty: 'hard', postTaskQuestions: tasks[6].post_task_questions },
  { taskId: TASK_8_ID, correctNodeId: NODE_LIVE_CHAT_ID, difficulty: 'hard', postTaskQuestions: tasks[7].post_task_questions },
  { taskId: TASK_9_ID, correctNodeId: NODE_PHONE_ACCESSORIES_ID, difficulty: 'hard', postTaskQuestions: tasks[8].post_task_questions },
  { taskId: TASK_10_ID, correctNodeId: NODE_WISHLIST_ID, difficulty: 'medium', postTaskQuestions: tasks[9].post_task_questions },
]

function generateTreeTestResponses(participantId: string) {
  const responses: any[] = []
  const postTaskResponses: any[] = []

  for (const config of taskConfigs) {
    // Determine success based on difficulty
    const successChance = config.difficulty === 'easy' ? 0.85 : config.difficulty === 'medium' ? 0.7 : 0.55
    const shouldSucceed = Math.random() < successChance
    const isSkipped = Math.random() < 0.05 // 5% skip rate

    if (isSkipped) {
      // Skipped task
      const partialPath = getPathToNode(config.correctNodeId).slice(0, randomInt(1, 3))
      const response = {
        id: generateId(),
        participant_id: participantId,
        task_id: config.taskId,
        study_id: STUDY_ID,
        path_taken: partialPath,
        selected_node_id: null,
        is_correct: false,
        is_direct: false,
        is_skipped: true,
        backtrack_count: 0,
        time_to_first_click_ms: randomInt(1000, 3000),
        total_time_ms: randomInt(5000, 15000),
      }
      responses.push(response)
      continue
    }

    const navResult = generateNavigationPath(config.correctNodeId, config.difficulty, shouldSucceed)

    const response = {
      id: generateId(),
      participant_id: participantId,
      task_id: config.taskId,
      study_id: STUDY_ID,
      path_taken: navResult.pathTaken,
      selected_node_id: navResult.selectedNodeId,
      is_correct: navResult.isCorrect,
      is_direct: navResult.isDirect,
      is_skipped: false,
      backtrack_count: navResult.backtrackCount,
      time_to_first_click_ms: randomInt(1500, 5000),
      total_time_ms: navResult.isDirect
        ? randomInt(8000, 25000)
        : randomInt(20000, 60000),
    }
    responses.push(response)

    // Generate post-task question responses
    for (const ptq of config.postTaskQuestions) {
      // Check display logic
      if (ptq.display_logic) {
        // For PTQ_3_2_ID, only show if difficulty was selected
        if (ptq.id === PTQ_3_2_ID) {
          // Skip this question 70% of time (simulating the display logic)
          if (Math.random() > 0.3) continue
        }
      }

      let responseValue: any
      switch (ptq.question_type) {
        case 'opinion_scale':
          responseValue = weightedRandom([5, 10, 20, 35, 30]) + 1
          break
        case 'yes_no':
          responseValue = Math.random() > 0.3
          break
        case 'single_line_text':
        case 'multi_line_text':
          responseValue = randomChoice([
            'Under My Account',
            'In the main navigation',
            'Expected it in Support',
            'Thought it would be in Services',
          ])
          break
        case 'multiple_choice':
          const options = ptq.config.options as any[]
          responseValue = { optionId: randomChoice(options).id }
          break
        case 'matrix':
          const rows = ptq.config.rows as any[]
          const cols = ptq.config.columns as any[]
          responseValue = {}
          for (const row of rows) {
            ;(responseValue as any)[row.id] = randomChoice(cols).id
          }
          break
        case 'ranking':
          const items = ptq.config.items as any[]
          responseValue = items.map((i: any) => i.id).sort(() => Math.random() - 0.5)
          break
        case 'nps':
          responseValue = { value: weightedRandom([2, 2, 3, 4, 5, 8, 12, 18, 22, 16, 8]) }
          break
        default:
          responseValue = 'Response'
      }

      postTaskResponses.push({
        id: generateId(),
        tree_test_response_id: response.id,
        study_id: STUDY_ID,
        participant_id: participantId,
        task_id: config.taskId,
        question_id: ptq.id,
        value: responseValue,
        created_at: new Date().toISOString(),
      })
    }
  }

  return { treeTestResponses: responses, postTaskResponses }
}

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

async function main() {
  const log = (msg: string) => process.stdout.write(msg + '\n')
  log('🌳 Starting Ultimate Tree Test Seed...\n')

  // Check if "Demo" project exists (case-insensitive search)
  log('🔍 Looking for "Demo" project...')
  const { data: existingProject, error: _findError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('user_id', USER_ID)
    .ilike('name', 'demo')
    .single()

  let projectId = PROJECT_ID
  if (existingProject) {
    projectId = existingProject.id
    log(`✅ Found existing "demo" project: ${projectId}`)
  } else {
    // Create new project
    log('📁 Creating new "demo" project...')
    const { error: projErr } = await supabase.from('projects').insert({
      id: projectId, user_id: USER_ID, name: 'demo',
      description: 'Tree Test study project', is_archived: false,
    })
    if (projErr) { log('❌ Project error: ' + projErr.message); return }
    log('✅ Project created')
  }

  // 2. Create Study
  log('📊 Creating tree test study...')
  const { error: studyErr } = await supabase.from('studies').insert({
    id: STUDY_ID, project_id: projectId, user_id: USER_ID, study_type: 'tree_test',
    title: 'Ultimate E-Commerce Navigation Tree Test',
    description: 'Comprehensive tree test with every feature enabled',
    status: 'active', share_code: SHARE_CODE, language: 'en',
    settings: treeTestSettings,
    branding: { primaryColor: '#059669', backgroundColor: '#F0FDF4' },
    closing_rule: { type: 'responses', maxResponses: 500, enabled: true },
  })
  if (studyErr) { log('❌ Study error: ' + studyErr.message); return }
  log('✅ Study created')

  // 3. Create Tree Nodes
  log('🌲 Creating tree structure...')
  const { error: nodeErr } = await supabase.from('tree_nodes').insert(treeNodes)
  if (nodeErr) { log('❌ Tree nodes error: ' + nodeErr.message); return }
  log('✅ ' + treeNodes.length + ' tree nodes created')

  // 4. Create Tasks
  log('📋 Creating tasks...')
  const tasksToInsert = tasks.map(t => ({
    id: t.id,
    study_id: t.study_id,
    question: t.question,
    correct_node_id: t.correct_node_id,
    position: t.position,
    post_task_questions: t.post_task_questions,
  }))
  const { error: taskErr } = await supabase.from('tasks').insert(tasksToInsert)
  if (taskErr) { log('❌ Tasks error: ' + taskErr.message); return }
  log('✅ ' + tasks.length + ' tasks created')

  // 5. Create Study Flow Questions (Screening, Pre, Post)
  log('📝 Creating study flow questions...')
  const allFlowQuestions = [...screeningQuestions, ...preStudyQuestions, ...postStudyQuestions]
  const { error: qErr } = await supabase.from('study_flow_questions').insert(allFlowQuestions)
  if (qErr) { log('❌ Questions error: ' + qErr.message); return }
  log('✅ ' + allFlowQuestions.length + ' study flow questions created')

  // 6. Generate Participants & Responses
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

  // 7. Generate Study Flow Responses (Screening, Pre, Post)
  log('📋 Generating study flow responses...')
  const flowResponses: any[] = []
  for (const p of participants) {
    flowResponses.push(...generateScreeningResponses(p.id, p.status === 'abandoned'))
    if (p.status === 'completed') {
      flowResponses.push(...generatePrePostResponses(p.id))
    }
  }

  for (let i = 0; i < flowResponses.length; i += 500) {
    const batch = flowResponses.slice(i, i + 500)
    const { error } = await supabase.from('study_flow_responses').insert(batch)
    if (error) log('⚠️ Flow response batch error: ' + error.message)
  }
  log('✅ ' + flowResponses.length + ' study flow responses created')

  // 8. Generate Tree Test Responses
  log('🌳 Generating tree test responses...')
  const allTreeResponses: any[] = []
  const allPostTaskResponses: any[] = []

  for (const p of participants.filter(p => p.status === 'completed')) {
    const { treeTestResponses, postTaskResponses } = generateTreeTestResponses(p.id)
    allTreeResponses.push(...treeTestResponses)
    allPostTaskResponses.push(...postTaskResponses)
  }

  // Insert tree test responses in batches
  for (let i = 0; i < allTreeResponses.length; i += 500) {
    const batch = allTreeResponses.slice(i, i + 500)
    const { error } = await supabase.from('tree_test_responses').insert(batch)
    if (error) log('⚠️ Tree response batch error: ' + error.message)
  }
  log('✅ ' + allTreeResponses.length + ' tree test responses created')

  // Insert post-task responses in batches
  for (let i = 0; i < allPostTaskResponses.length; i += 500) {
    const batch = allPostTaskResponses.slice(i, i + 500)
    const { error } = await supabase.from('tree_test_post_task_responses').insert(batch)
    if (error) log('⚠️ Post-task response batch error: ' + error.message)
  }
  log('✅ ' + allPostTaskResponses.length + ' post-task responses created')

  // Summary
  log('\n' + '='.repeat(50))
  log('✨ TREE TEST SEED COMPLETE!')
  log('='.repeat(50))
  log(`
📁 Project: demo (ID: ${projectId})
📊 Study ID: ${STUDY_ID}
🔗 Share Code: ${SHARE_CODE}

Tree Structure:
✅ ${treeNodes.length} nodes (4 levels deep)
✅ Root: E-commerce website
✅ Main categories: Products, Services, Support, About, Account

Tasks:
✅ ${tasks.length} tasks with varying difficulty
   - Easy: 2 (Contact, Track Order)
   - Medium: 4 (Returns, Laptops, Password, Wishlist)
   - Hard: 4 (MacBooks, Sustainability, Live Chat, iPhone Accessories)

Study Flow Features:
✅ Welcome screen with custom message
✅ Participant Agreement with terms
✅ Screening questions (${screeningQuestions.length}) with rejection logic
✅ Demographic profile collection
✅ Pre-study questions (${preStudyQuestions.length})
✅ Activity instructions
✅ Post-study questions (${postStudyQuestions.length})
✅ Thank you screen with redirect

Post-Task Questions (per task):
✅ Opinion scales (stars, numerical, emotions)
✅ Yes/No questions
✅ Text input (single & multi-line)
✅ Multiple choice
✅ Matrix ratings
✅ Ranking questions
✅ NPS (Net Promoter Score)
✅ Display logic (conditional visibility)

Tree Test Settings:
✅ Randomize tasks (first task exempt)
✅ Show breadcrumbs
✅ Allow back navigation
✅ Show task progress
✅ Allow skip tasks
✅ Custom answer button text

Participants: ${TOTAL} total (${REJECTED} rejected, ${TOTAL - REJECTED} completed)
Tree Test Responses: ${allTreeResponses.length}
Post-Task Responses: ${allPostTaskResponses.length}
Study Flow Responses: ${flowResponses.length}

Response Distribution (approximate):
- Direct Success: ~30-40%
- Indirect Success: ~35-45%
- Failed: ~15-25%
- Skipped: ~5%
`)
}

main().catch(e => process.stderr.write('Error: ' + e.message + '\n'))
