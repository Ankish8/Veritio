/**
 * ULTIMATE Comprehensive Prototype Test Seed Script
 * Creates an enterprise-level prototype test study with EVERY feature:
 *
 * FEATURES INCLUDED:
 * - Complete study flow (welcome, agreement, screening, identifier, thank you)
 * - Figma prototype with 8 frames (simulated sync)
 * - 5 tasks with all configurations:
 *   - Task flow with destination success (single goal)
 *   - Task flow with destination success (multiple goals)
 *   - Task flow with pathway success (v2 multi-path)
 *   - Task flow with strict pathway
 *   - Free flow exploration
 * - Post-task questions for each task (all question types)
 * - All prototype settings (hesitation, flashing, auto-end, scaling)
 * - Session recording configuration
 * - Pre-study AND post-study questions
 * - Screening questions with rejection logic
 * - Demographic profile collection
 * - 100 participants with varied:
 *   - Task outcomes (success, failure, abandoned, skipped)
 *   - Click patterns (direct, with backtracking, misclicks)
 *   - Navigation paths (optimal, suboptimal, exploratory)
 *   - Time distributions (fast, average, slow)
 * - Detailed click events and navigation events
 * - Post-task question responses
 *
 * Run with: npx tsx scripts/seed/prototype/ultimate-prototype-test.ts
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

// Use existing Ankish project instead of creating new one
const PROJECT_ID = process.env.SEED_PROJECT_ID || generateId()
const USE_EXISTING_PROJECT = true
const STUDY_ID = generateId()
// Default dev user ID (better-auth)
const USER_ID = process.env.SEED_USER_ID || 'your-better-auth-user-id'
const SHARE_CODE = `ultimate-prototype-${Date.now()}`

// Prototype & Frames
const PROTOTYPE_ID = generateId()

// 8 Frames simulating a checkout flow
const FRAME_HOME_ID = generateId()
const FRAME_PRODUCTS_ID = generateId()
const FRAME_PRODUCT_DETAIL_ID = generateId()
const FRAME_CART_ID = generateId()
const FRAME_CHECKOUT_ID = generateId()
const FRAME_PAYMENT_ID = generateId()
const FRAME_CONFIRMATION_ID = generateId()
const FRAME_ACCOUNT_ID = generateId()

const _ALL_FRAME_IDS = [
  FRAME_HOME_ID,
  FRAME_PRODUCTS_ID,
  FRAME_PRODUCT_DETAIL_ID,
  FRAME_CART_ID,
  FRAME_CHECKOUT_ID,
  FRAME_PAYMENT_ID,
  FRAME_CONFIRMATION_ID,
  FRAME_ACCOUNT_ID,
]

// Tasks (5 comprehensive tasks)
const TASK_CHECKOUT_ID = generateId() // Destination: single goal
const TASK_ADD_TO_CART_ID = generateId() // Destination: multiple goals
const TASK_BROWSE_PRODUCTS_ID = generateId() // Pathway: v2 multi-path
const TASK_QUICK_PURCHASE_ID = generateId() // Pathway: strict single path
const TASK_EXPLORE_ID = generateId() // Free flow

// Post-task question IDs (per task)
const PTQ_CHECKOUT_EASE_ID = generateId()
const PTQ_CHECKOUT_CONFIDENCE_ID = generateId()
const PTQ_CART_FINDABILITY_ID = generateId()
const PTQ_CART_FEEDBACK_ID = generateId()
const PTQ_BROWSE_SATISFACTION_ID = generateId()
const PTQ_BROWSE_DISCOVERY_ID = generateId()
const PTQ_PURCHASE_SPEED_ID = generateId()
const PTQ_PURCHASE_CLARITY_ID = generateId()
const PTQ_EXPLORE_INTEREST_ID = generateId()
const PTQ_EXPLORE_SUGGESTIONS_ID = generateId()

// Screening Question IDs
const SCREENING_Q1_ID = generateId() // Age (with rejection)
const SCREENING_Q2_ID = generateId() // Device type
const SCREENING_Q3_ID = generateId() // E-commerce experience
const SCREENING_Q4_ID = generateId() // Familiarity with prototypes

// Pre-Study Question IDs
const PRE_Q1_ID = generateId() // Expectations
const PRE_Q2_ID = generateId() // Shopping habits

// Post-Study Question IDs
const POST_Q1_ID = generateId() // Overall experience
const POST_Q2_ID = generateId() // Additional feedback

// =============================================================================
// STUDY FLOW SETTINGS (Complete configuration)
// =============================================================================

const studyFlowSettings = {
  welcome: {
    enabled: true,
    title: 'Welcome to Our Prototype Test',
    message: `<p><strong>Thank you for participating!</strong></p>
<p>You'll be testing an interactive prototype of our new e-commerce platform. Your interactions will help us improve the user experience.</p>
<p>This session should take about 10-15 minutes.</p>`,
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
<li>My interactions and responses are confidential and anonymized</li>
<li>Screen recordings (if enabled) are stored securely</li>
<li>Data is handled per GDPR/CCPA regulations</li>
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
    rejectionMessage: "Unfortunately you don't meet the criteria for this study.",
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
            {
              id: 'email',
              type: 'predefined' as const,
              fieldType: 'email' as const,
              position: 0,
              enabled: true,
              required: true,
              mappedToScreeningQuestionId: null,
              width: 'full' as const,
            },
            {
              id: 'firstName',
              type: 'predefined' as const,
              fieldType: 'firstName' as const,
              position: 1,
              enabled: true,
              required: true,
              mappedToScreeningQuestionId: null,
              width: 'half' as const,
            },
            {
              id: 'lastName',
              type: 'predefined' as const,
              fieldType: 'lastName' as const,
              position: 2,
              enabled: true,
              required: true,
              mappedToScreeningQuestionId: null,
              width: 'half' as const,
            },
            {
              id: 'ageRange',
              type: 'predefined' as const,
              fieldType: 'ageRange' as const,
              position: 3,
              enabled: true,
              required: true,
              mappedToScreeningQuestionId: SCREENING_Q1_ID,
              width: 'half' as const,
            },
          ],
        },
        {
          id: 'tech',
          name: 'Technology',
          position: 1,
          title: 'Technology Usage',
          fields: [
            {
              id: 'primaryDevice',
              type: 'predefined' as const,
              fieldType: 'primaryDevice' as const,
              position: 0,
              enabled: true,
              required: true,
              mappedToScreeningQuestionId: SCREENING_Q2_ID,
              width: 'half' as const,
            },
            {
              id: 'techProficiency',
              type: 'predefined' as const,
              fieldType: 'techProficiency' as const,
              position: 1,
              enabled: true,
              required: true,
              mappedToScreeningQuestionId: null,
              width: 'half' as const,
            },
          ],
        },
      ],
      ageRangeOptions: { ranges: ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'] },
      primaryDeviceOptions: { options: ['Desktop', 'Mobile', 'Tablet'] },
      techProficiencyOptions: { options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
    },
  },
  // PRE-STUDY QUESTIONS - ENABLED!
  preStudyQuestions: {
    enabled: true,
    showIntro: true,
    introTitle: 'Before We Begin',
    introMessage: 'A few quick questions about your expectations and habits.',
    pageMode: 'one_per_page' as const,
    randomizeQuestions: false,
  },
  // ACTIVITY INSTRUCTIONS for Prototype Test
  activityInstructions: {
    enabled: true,
    title: 'Prototype Testing Instructions',
    message: `<p>You will interact with a clickable prototype of an e-commerce website.</p>
<h4>What to Expect:</h4>
<ul>
<li>You'll complete <strong>5 tasks</strong> simulating real shopping scenarios</li>
<li>Click through the prototype as you would a real website</li>
<li>Some tasks have specific goals, others are exploratory</li>
<li>Answer a few questions after each task</li>
</ul>
<h4>Tips:</h4>
<ul>
<li>Take your time - we're testing the design, not you</li>
<li>Think aloud if comfortable (for recorded sessions)</li>
<li>You can skip tasks if you get stuck</li>
</ul>`,
  },
  // POST-STUDY QUESTIONS - ENABLED!
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
    message: `<p><strong>Your feedback has been recorded.</strong></p>
<p>We truly appreciate your time and insights. Your input directly shapes our product development.</p>
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
  pagination: {
    mode: 'one_per_page' as const,
  },
}

// =============================================================================
// PROTOTYPE TEST SPECIFIC SETTINGS
// =============================================================================

const prototypeTestSettings = {
  // Task options
  randomizeTasks: true,
  dontRandomizeFirstTask: true, // First task stays first
  allowSkipTasks: true,
  showTaskProgress: true,

  // Prototype display
  trackHesitation: true, // Track time to first click
  clickableAreaFlashing: true, // Flash hotspots after 5s
  tasksEndAutomatically: true, // Auto-complete on reaching goal
  scalePrototype: 'fit' as const,
  taskInstructionPosition: 'top-right' as const,

  // Session recording
  sessionRecordingSettings: {
    enabled: true,
    captureMode: 'screen_audio' as const,
    recordingScope: 'session' as const,
  },
}

// =============================================================================
// FIGMA PROTOTYPE DATA
// =============================================================================

const prototypeData = {
  id: PROTOTYPE_ID,
  study_id: STUDY_ID,
  figma_url: 'https://www.figma.com/proto/ABC123XYZ/E-Commerce-Prototype?node-id=100:1&scaling=scale-down',
  figma_file_key: 'ABC123XYZ',
  figma_node_id: '100:1',
  name: 'E-Commerce Checkout Prototype',
  password: null,
  starting_frame_id: null, // Will be set after frames are created
  last_synced_at: new Date().toISOString(),
  sync_status: 'complete',
  sync_error: null,
  frame_count: 8,
  figma_file_modified_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
}

// =============================================================================
// PROTOTYPE FRAMES (8 frames simulating e-commerce flow)
// =============================================================================

// Use picsum.photos for real placeholder images (different seed for each frame)
const prototypeFrames = [
  {
    id: FRAME_HOME_ID,
    study_id: STUDY_ID,
    prototype_id: PROTOTYPE_ID,
    figma_node_id: '100:1',
    name: 'Home',
    page_name: 'Main Flow',
    position: 0,
    width: 1440,
    height: 900,
    thumbnail_url: 'https://picsum.photos/seed/home/1440/900',
  },
  {
    id: FRAME_PRODUCTS_ID,
    study_id: STUDY_ID,
    prototype_id: PROTOTYPE_ID,
    figma_node_id: '100:2',
    name: 'Product Listing',
    page_name: 'Main Flow',
    position: 1,
    width: 1440,
    height: 1200,
    thumbnail_url: 'https://picsum.photos/seed/products/1440/1200',
  },
  {
    id: FRAME_PRODUCT_DETAIL_ID,
    study_id: STUDY_ID,
    prototype_id: PROTOTYPE_ID,
    figma_node_id: '100:3',
    name: 'Product Detail',
    page_name: 'Main Flow',
    position: 2,
    width: 1440,
    height: 1100,
    thumbnail_url: 'https://picsum.photos/seed/detail/1440/1100',
  },
  {
    id: FRAME_CART_ID,
    study_id: STUDY_ID,
    prototype_id: PROTOTYPE_ID,
    figma_node_id: '100:4',
    name: 'Shopping Cart',
    page_name: 'Main Flow',
    position: 3,
    width: 1440,
    height: 800,
    thumbnail_url: 'https://picsum.photos/seed/cart/1440/800',
  },
  {
    id: FRAME_CHECKOUT_ID,
    study_id: STUDY_ID,
    prototype_id: PROTOTYPE_ID,
    figma_node_id: '100:5',
    name: 'Checkout - Shipping',
    page_name: 'Checkout Flow',
    position: 4,
    width: 1440,
    height: 900,
    thumbnail_url: 'https://picsum.photos/seed/checkout/1440/900',
  },
  {
    id: FRAME_PAYMENT_ID,
    study_id: STUDY_ID,
    prototype_id: PROTOTYPE_ID,
    figma_node_id: '100:6',
    name: 'Checkout - Payment',
    page_name: 'Checkout Flow',
    position: 5,
    width: 1440,
    height: 900,
    thumbnail_url: 'https://picsum.photos/seed/payment/1440/900',
  },
  {
    id: FRAME_CONFIRMATION_ID,
    study_id: STUDY_ID,
    prototype_id: PROTOTYPE_ID,
    figma_node_id: '100:7',
    name: 'Order Confirmation',
    page_name: 'Checkout Flow',
    position: 6,
    width: 1440,
    height: 700,
    thumbnail_url: 'https://picsum.photos/seed/confirm/1440/700',
  },
  {
    id: FRAME_ACCOUNT_ID,
    study_id: STUDY_ID,
    prototype_id: PROTOTYPE_ID,
    figma_node_id: '100:8',
    name: 'My Account',
    page_name: 'Account',
    position: 7,
    width: 1440,
    height: 800,
    thumbnail_url: 'https://picsum.photos/seed/account/1440/800',
  },
]

// =============================================================================
// PROTOTYPE TASKS (5 comprehensive tasks)
// =============================================================================

const prototypeTasks = [
  // TASK 1: Complete Checkout (Destination - Single Goal)
  {
    id: TASK_CHECKOUT_ID,
    study_id: STUDY_ID,
    title: 'Complete a Purchase',
    instruction:
      'Starting from the home page, complete a purchase of any product and reach the order confirmation page.',
    flow_type: 'task_flow',
    start_frame_id: FRAME_HOME_ID,
    success_criteria_type: 'destination',
    success_frame_ids: [FRAME_CONFIRMATION_ID], // Single goal
    success_pathway: null,
    time_limit_ms: 120000, // 2 minutes
    position: 0,
    post_task_questions: [
      {
        id: PTQ_CHECKOUT_EASE_ID,
        question_text: 'How easy was it to complete the checkout process?',
        question_type: 'opinion_scale',
        config: {
          scalePoints: 5,
          startAtZero: false,
          scaleType: 'numerical',
          leftLabel: 'Very Difficult',
          middleLabel: 'Neutral',
          rightLabel: 'Very Easy',
        },
        required: true,
        position: 0,
      },
      {
        id: PTQ_CHECKOUT_CONFIDENCE_ID,
        question_text: 'How confident were you that your order was placed successfully?',
        question_type: 'opinion_scale',
        config: {
          scalePoints: 5,
          startAtZero: false,
          scaleType: 'stars',
          leftLabel: 'Not Confident',
          rightLabel: 'Very Confident',
        },
        required: true,
        position: 1,
      },
    ],
  },

  // TASK 2: Add to Cart (Destination - Multiple Goals)
  {
    id: TASK_ADD_TO_CART_ID,
    study_id: STUDY_ID,
    title: 'Add a Product to Cart',
    instruction: 'Find a product you like and add it to your shopping cart.',
    flow_type: 'task_flow',
    start_frame_id: FRAME_HOME_ID,
    success_criteria_type: 'destination',
    success_frame_ids: [FRAME_CART_ID, FRAME_CHECKOUT_ID], // Multiple valid endpoints
    success_pathway: null,
    time_limit_ms: 60000, // 1 minute
    position: 1,
    post_task_questions: [
      {
        id: PTQ_CART_FINDABILITY_ID,
        question_text: 'How easy was it to find the "Add to Cart" button?',
        question_type: 'multiple_choice',
        config: {
          mode: 'single',
          options: [
            { id: 'very_easy', label: 'Very easy - I found it immediately' },
            { id: 'easy', label: 'Easy - Found it with minimal searching' },
            { id: 'moderate', label: 'Moderate - Took some looking around' },
            { id: 'difficult', label: 'Difficult - Hard to find' },
            { id: 'very_difficult', label: 'Very difficult - Almost gave up' },
          ],
        },
        required: true,
        position: 0,
      },
      {
        id: PTQ_CART_FEEDBACK_ID,
        question_text: 'Any suggestions to improve the add-to-cart experience?',
        question_type: 'multi_line_text',
        config: {
          placeholder: 'Share your thoughts...',
          maxLength: 500,
        },
        required: false,
        position: 1,
      },
    ],
  },

  // TASK 3: Browse Products (Pathway - V2 Multi-path)
  {
    id: TASK_BROWSE_PRODUCTS_ID,
    study_id: STUDY_ID,
    title: 'Browse the Product Catalog',
    instruction:
      'Navigate from the home page to view product details. There are multiple valid paths - explore as you wish!',
    flow_type: 'task_flow',
    start_frame_id: FRAME_HOME_ID,
    success_criteria_type: 'pathway',
    success_frame_ids: null,
    success_pathway: {
      version: 2,
      paths: [
        {
          id: generateId(),
          name: 'Direct Browse',
          frames: [FRAME_HOME_ID, FRAME_PRODUCTS_ID, FRAME_PRODUCT_DETAIL_ID],
          is_primary: true,
        },
        {
          id: generateId(),
          name: 'Via Account',
          frames: [FRAME_HOME_ID, FRAME_ACCOUNT_ID, FRAME_PRODUCTS_ID, FRAME_PRODUCT_DETAIL_ID],
          is_primary: false,
        },
      ],
    },
    time_limit_ms: 90000, // 1.5 minutes
    position: 2,
    post_task_questions: [
      {
        id: PTQ_BROWSE_SATISFACTION_ID,
        question_text: 'How satisfied are you with the browsing experience?',
        question_type: 'nps',
        config: {
          leftLabel: 'Not at all satisfied',
          rightLabel: 'Extremely satisfied',
        },
        required: true,
        position: 0,
      },
      {
        id: PTQ_BROWSE_DISCOVERY_ID,
        question_text: 'Were the products easy to discover?',
        question_type: 'yes_no',
        config: {
          styleType: 'buttons',
          yesLabel: 'Yes, very easy',
          noLabel: 'No, it was confusing',
        },
        required: true,
        position: 1,
      },
    ],
  },

  // TASK 4: Quick Purchase (Pathway - Strict single path)
  {
    id: TASK_QUICK_PURCHASE_ID,
    study_id: STUDY_ID,
    title: 'Express Checkout Path',
    instruction:
      'Complete a purchase using the optimal path: Home → Products → Product Detail → Cart → Checkout → Payment → Confirmation',
    flow_type: 'task_flow',
    start_frame_id: FRAME_HOME_ID,
    success_criteria_type: 'pathway',
    success_frame_ids: null,
    success_pathway: {
      version: 2,
      paths: [
        {
          id: generateId(),
          name: 'Express Path',
          frames: [
            FRAME_HOME_ID,
            FRAME_PRODUCTS_ID,
            FRAME_PRODUCT_DETAIL_ID,
            FRAME_CART_ID,
            FRAME_CHECKOUT_ID,
            FRAME_PAYMENT_ID,
            FRAME_CONFIRMATION_ID,
          ],
          is_primary: true,
        },
      ],
    },
    time_limit_ms: 180000, // 3 minutes
    position: 3,
    post_task_questions: [
      {
        id: PTQ_PURCHASE_SPEED_ID,
        question_text: 'Rate the speed of the checkout process:',
        question_type: 'opinion_scale',
        config: {
          scalePoints: 5,
          startAtZero: false,
          scaleType: 'emotions',
          leftLabel: 'Too Slow',
          rightLabel: 'Very Fast',
        },
        required: true,
        position: 0,
      },
      {
        id: PTQ_PURCHASE_CLARITY_ID,
        question_text: 'Were the checkout steps clear and logical?',
        question_type: 'matrix',
        config: {
          rows: [
            { id: 'navigation', label: 'Navigation between steps' },
            { id: 'forms', label: 'Form fields and labels' },
            { id: 'progress', label: 'Progress indication' },
            { id: 'confirmation', label: 'Final confirmation' },
          ],
          columns: [
            { id: 'poor', label: 'Poor' },
            { id: 'fair', label: 'Fair' },
            { id: 'good', label: 'Good' },
            { id: 'excellent', label: 'Excellent' },
          ],
          allowMultiplePerRow: false,
        },
        required: true,
        position: 1,
      },
    ],
  },

  // TASK 5: Free Exploration
  {
    id: TASK_EXPLORE_ID,
    study_id: STUDY_ID,
    title: 'Free Exploration',
    instruction:
      'Explore the prototype freely for 1-2 minutes. Visit any pages that interest you and get a feel for the overall experience.',
    flow_type: 'free_flow',
    start_frame_id: FRAME_HOME_ID,
    success_criteria_type: 'destination', // Free flow uses this but no specific goal
    success_frame_ids: [], // Empty = no specific goal
    success_pathway: null,
    time_limit_ms: 120000, // 2 minutes
    position: 4,
    post_task_questions: [
      {
        id: PTQ_EXPLORE_INTEREST_ID,
        question_text: 'Which areas of the site interested you most?',
        question_type: 'multiple_choice',
        config: {
          mode: 'multi',
          options: [
            { id: 'products', label: 'Product listings' },
            { id: 'detail', label: 'Product details' },
            { id: 'cart', label: 'Shopping cart' },
            { id: 'checkout', label: 'Checkout process' },
            { id: 'account', label: 'Account section' },
            { id: 'home', label: 'Home page' },
          ],
          shuffle: true,
          minSelections: 1,
          maxSelections: 3,
        },
        required: true,
        position: 0,
      },
      {
        id: PTQ_EXPLORE_SUGGESTIONS_ID,
        question_text: 'What improvements would you suggest for the overall experience?',
        question_type: 'ranking',
        config: {
          items: [
            { id: 'speed', label: 'Faster load times' },
            { id: 'clarity', label: 'Clearer navigation' },
            { id: 'visuals', label: 'Better visuals' },
            { id: 'search', label: 'Improved search' },
            { id: 'mobile', label: 'Mobile optimization' },
          ],
          randomOrder: true,
        },
        required: true,
        position: 1,
      },
    ],
  },
]

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
  // Q2: Device type
  {
    id: SCREENING_Q2_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 1,
    question_type: 'multiple_choice',
    question_text: 'What device are you using for this study?',
    description: 'This prototype is optimized for desktop/laptop.',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'desktop', label: 'Desktop computer' },
        { id: 'laptop', label: 'Laptop' },
        { id: 'tablet', label: 'Tablet' },
        { id: 'mobile', label: 'Mobile phone' },
      ],
    },
    branching_logic: {
      rules: [{ optionId: 'mobile', target: 'reject' }],
      defaultTarget: 'next',
    },
  },
  // Q3: E-commerce experience
  {
    id: SCREENING_Q3_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 2,
    question_type: 'multiple_choice',
    question_text: 'How often do you shop online?',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'never', label: 'Never' },
        { id: 'rarely', label: 'Rarely (few times a year)' },
        { id: 'monthly', label: 'Monthly' },
        { id: 'weekly', label: 'Weekly' },
        { id: 'daily', label: 'Almost daily' },
      ],
    },
    branching_logic: {
      rules: [{ optionId: 'never', target: 'reject' }],
      defaultTarget: 'next',
    },
  },
  // Q4: Prototype familiarity
  {
    id: SCREENING_Q4_ID,
    study_id: STUDY_ID,
    section: 'screening',
    position: 3,
    question_type: 'opinion_scale',
    question_text: 'How comfortable are you with testing interactive prototypes?',
    is_required: true,
    config: {
      scalePoints: 5,
      startAtZero: false,
      scaleType: 'numerical',
      leftLabel: 'Not comfortable',
      rightLabel: 'Very comfortable',
    },
    branching_logic: {
      rules: [{ comparison: 'less_than', scaleValue: 2, target: 'reject' }],
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
    question_text: 'What are your main expectations when shopping online?',
    description: 'Think about what makes a good e-commerce experience for you.',
    is_required: true,
    config: {
      placeholder: 'Tell us what matters most to you when shopping online...',
      maxLength: 500,
    },
  },
  {
    id: PRE_Q2_ID,
    study_id: STUDY_ID,
    section: 'pre_study',
    position: 1,
    question_type: 'multiple_choice',
    question_text: 'What is most important to you when checking out online?',
    is_required: true,
    config: {
      mode: 'multi',
      options: [
        { id: 'speed', label: 'Fast checkout process' },
        { id: 'security', label: 'Security indicators' },
        { id: 'options', label: 'Multiple payment options' },
        { id: 'guest', label: 'Guest checkout available' },
        { id: 'progress', label: 'Clear progress indication' },
        { id: 'review', label: 'Order review before payment' },
      ],
      shuffle: true,
      minSelections: 1,
      maxSelections: 3,
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
    question_type: 'nps',
    question_text:
      'Based on this prototype, how likely are you to recommend this e-commerce platform to a friend?',
    is_required: true,
    config: {
      leftLabel: 'Not at all likely',
      rightLabel: 'Extremely likely',
    },
  },
  {
    id: POST_Q2_ID,
    study_id: STUDY_ID,
    section: 'post_study',
    position: 1,
    question_type: 'multi_line_text',
    question_text: 'Any final thoughts or suggestions about the prototype?',
    is_required: false,
    config: {
      placeholder: 'Share any additional feedback...',
      maxLength: 1000,
    },
  },
]

// =============================================================================
// PARTICIPANT DATA GENERATION
// =============================================================================

const firstNames = [
  'Emma',
  'Liam',
  'Olivia',
  'Noah',
  'Ava',
  'Ethan',
  'Sophia',
  'Mason',
  'Isabella',
  'James',
  'Mia',
  'Benjamin',
  'Charlotte',
  'Lucas',
  'Amelia',
  'Henry',
  'Harper',
  'Alexander',
  'Evelyn',
  'Daniel',
]
const lastNames = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
]

const feedbackTexts = {
  checkout: [
    'The checkout was smooth and intuitive.',
    'I wish there was a progress indicator.',
    'Payment options could be more visible.',
    'Great experience, very straightforward!',
    'A bit confusing at the shipping step.',
  ],
  cart: [
    'Add to cart button was easy to find.',
    'The cart icon could be more prominent.',
    'Loved the quick add feature!',
    'Product thumbnails in cart are helpful.',
    'Would like quantity adjustment in cart.',
  ],
  general: [
    'Overall good experience.',
    'Navigation is clear and logical.',
    'Some buttons are too small.',
    'Love the clean design!',
    'Search function would be helpful.',
    'Mobile version seems needed.',
    'Fast and responsive prototype.',
    'Color scheme is pleasant.',
  ],
}

// Define optimal paths for each task
const taskPaths = {
  [TASK_CHECKOUT_ID]: {
    optimal: [
      FRAME_HOME_ID,
      FRAME_PRODUCTS_ID,
      FRAME_PRODUCT_DETAIL_ID,
      FRAME_CART_ID,
      FRAME_CHECKOUT_ID,
      FRAME_PAYMENT_ID,
      FRAME_CONFIRMATION_ID,
    ],
    suboptimal: [
      FRAME_HOME_ID,
      FRAME_ACCOUNT_ID,
      FRAME_HOME_ID,
      FRAME_PRODUCTS_ID,
      FRAME_PRODUCT_DETAIL_ID,
      FRAME_CART_ID,
      FRAME_CHECKOUT_ID,
      FRAME_PAYMENT_ID,
      FRAME_CONFIRMATION_ID,
    ],
    failed: [FRAME_HOME_ID, FRAME_PRODUCTS_ID, FRAME_PRODUCT_DETAIL_ID, FRAME_CART_ID],
  },
  [TASK_ADD_TO_CART_ID]: {
    optimal: [FRAME_HOME_ID, FRAME_PRODUCTS_ID, FRAME_PRODUCT_DETAIL_ID, FRAME_CART_ID],
    suboptimal: [
      FRAME_HOME_ID,
      FRAME_PRODUCTS_ID,
      FRAME_HOME_ID,
      FRAME_PRODUCTS_ID,
      FRAME_PRODUCT_DETAIL_ID,
      FRAME_CART_ID,
    ],
    failed: [FRAME_HOME_ID, FRAME_PRODUCTS_ID],
  },
  [TASK_BROWSE_PRODUCTS_ID]: {
    optimal: [FRAME_HOME_ID, FRAME_PRODUCTS_ID, FRAME_PRODUCT_DETAIL_ID],
    suboptimal: [FRAME_HOME_ID, FRAME_ACCOUNT_ID, FRAME_PRODUCTS_ID, FRAME_PRODUCT_DETAIL_ID],
    failed: [FRAME_HOME_ID, FRAME_ACCOUNT_ID],
  },
  [TASK_QUICK_PURCHASE_ID]: {
    optimal: [
      FRAME_HOME_ID,
      FRAME_PRODUCTS_ID,
      FRAME_PRODUCT_DETAIL_ID,
      FRAME_CART_ID,
      FRAME_CHECKOUT_ID,
      FRAME_PAYMENT_ID,
      FRAME_CONFIRMATION_ID,
    ],
    suboptimal: [
      FRAME_HOME_ID,
      FRAME_PRODUCTS_ID,
      FRAME_PRODUCT_DETAIL_ID,
      FRAME_PRODUCTS_ID,
      FRAME_PRODUCT_DETAIL_ID,
      FRAME_CART_ID,
      FRAME_CHECKOUT_ID,
      FRAME_PAYMENT_ID,
      FRAME_CONFIRMATION_ID,
    ],
    failed: [
      FRAME_HOME_ID,
      FRAME_PRODUCTS_ID,
      FRAME_PRODUCT_DETAIL_ID,
      FRAME_CART_ID,
      FRAME_CHECKOUT_ID,
    ],
  },
  [TASK_EXPLORE_ID]: {
    // Free flow - any path is valid
    optimal: [FRAME_HOME_ID, FRAME_PRODUCTS_ID, FRAME_ACCOUNT_ID, FRAME_CART_ID],
    suboptimal: [
      FRAME_HOME_ID,
      FRAME_PRODUCTS_ID,
      FRAME_PRODUCT_DETAIL_ID,
      FRAME_CART_ID,
      FRAME_CHECKOUT_ID,
    ],
    failed: [FRAME_HOME_ID], // Just started and abandoned
  },
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
    metadata: {
      email,
      firstName,
      lastName,
      device: randomChoice(['Desktop', 'Laptop']),
    },
  }
}

function generateScreeningResponses(participantId: string, isRejected: boolean) {
  const responses: any[] = []

  // Q1: Age
  const ageOptions = ['age_18_24', 'age_25_34', 'age_35_44', 'age_45_54']
  responses.push({
    id: generateId(),
    participant_id: participantId,
    question_id: SCREENING_Q1_ID,
    study_id: STUDY_ID,
    response_value: {
      optionId: isRejected && Math.random() < 0.25 ? 'age_under18' : randomChoice(ageOptions),
    },
    response_time_ms: randomInt(2000, 5000),
  })

  // Q2: Device
  responses.push({
    id: generateId(),
    participant_id: participantId,
    question_id: SCREENING_Q2_ID,
    study_id: STUDY_ID,
    response_value: {
      optionId: isRejected && Math.random() < 0.25 ? 'mobile' : randomChoice(['desktop', 'laptop', 'tablet']),
    },
    response_time_ms: randomInt(1500, 4000),
  })

  // Q3: Shopping frequency
  responses.push({
    id: generateId(),
    participant_id: participantId,
    question_id: SCREENING_Q3_ID,
    study_id: STUDY_ID,
    response_value: {
      optionId: isRejected && Math.random() < 0.25 ? 'never' : randomChoice(['rarely', 'monthly', 'weekly', 'daily']),
    },
    response_time_ms: randomInt(2000, 5000),
  })

  // Q4: Prototype comfort
  responses.push({
    id: generateId(),
    participant_id: participantId,
    question_id: SCREENING_Q4_ID,
    study_id: STUDY_ID,
    response_value: isRejected && Math.random() < 0.25 ? 1 : randomInt(3, 5),
    response_time_ms: randomInt(2000, 4000),
  })

  return responses
}

function generatePreStudyResponses(participantId: string) {
  const responses: any[] = []

  // PRE_Q1: Expectations
  responses.push({
    id: generateId(),
    participant_id: participantId,
    question_id: PRE_Q1_ID,
    study_id: STUDY_ID,
    response_value: randomChoice([
      'Fast checkout, clear product info, and secure payment.',
      'Easy navigation and good product images.',
      'Multiple payment options and fast shipping info.',
      'Simple interface and trustworthy design.',
    ]),
    response_time_ms: randomInt(15000, 30000),
  })

  // PRE_Q2: Checkout priorities
  const options = ['speed', 'security', 'options', 'guest', 'progress', 'review']
  const selectedCount = randomInt(1, 3)
  const selectedOptions = shuffleArray(options).slice(0, selectedCount)
  responses.push({
    id: generateId(),
    participant_id: participantId,
    question_id: PRE_Q2_ID,
    study_id: STUDY_ID,
    response_value: { optionIds: selectedOptions },
    response_time_ms: randomInt(5000, 12000),
  })

  return responses
}

function generatePostStudyResponses(participantId: string) {
  const responses: any[] = []

  // POST_Q1: NPS
  responses.push({
    id: generateId(),
    participant_id: participantId,
    question_id: POST_Q1_ID,
    study_id: STUDY_ID,
    response_value: { value: weightedRandom([2, 2, 3, 4, 5, 8, 12, 18, 22, 16, 8]) },
    response_time_ms: randomInt(3000, 8000),
  })

  // POST_Q2: Final thoughts (optional, 70% answer)
  if (Math.random() > 0.3) {
    responses.push({
      id: generateId(),
      participant_id: participantId,
      question_id: POST_Q2_ID,
      study_id: STUDY_ID,
      response_value: randomChoice(feedbackTexts.general),
      response_time_ms: randomInt(20000, 45000),
    })
  }

  return responses
}

interface SessionData {
  session: any
  taskAttempts: any[]
  clickEvents: any[]
  navigationEvents: any[]
  postTaskResponses: any[]
}

function generateSessionData(participantId: string, participantStartedAt: string): SessionData {
  const sessionId = generateId()
  const sessionStartTime = new Date(participantStartedAt).getTime() + randomInt(5000, 15000)

  // Determine participant behavior profile
  const behaviorProfile = weightedRandom([40, 35, 15, 10]) // expert, average, struggling, abandoner

  const taskAttempts: any[] = []
  const clickEvents: any[] = []
  const navigationEvents: any[] = []
  const postTaskResponses: any[] = []

  let currentTime = sessionStartTime
  const taskOrder = [
    TASK_CHECKOUT_ID,
    TASK_ADD_TO_CART_ID,
    TASK_BROWSE_PRODUCTS_ID,
    TASK_QUICK_PURCHASE_ID,
    TASK_EXPLORE_ID,
  ]

  // Randomize tasks except first one (as per settings)
  const orderedTasks = [taskOrder[0], ...shuffleArray(taskOrder.slice(1))]

  for (const taskId of orderedTasks) {
    const taskPaths_current = taskPaths[taskId as keyof typeof taskPaths]
    const taskDef = prototypeTasks.find((t) => t.id === taskId)!

    // Determine outcome based on behavior profile and task
    let outcome: 'success' | 'failure' | 'abandoned' | 'skipped'
    let pathType: 'optimal' | 'suboptimal' | 'failed'

    if (behaviorProfile === 0) {
      // Expert: mostly success with optimal paths
      outcome = Math.random() < 0.9 ? 'success' : 'failure'
      pathType = Math.random() < 0.8 ? 'optimal' : 'suboptimal'
    } else if (behaviorProfile === 1) {
      // Average: mix of outcomes
      const outcomeRoll = Math.random()
      if (outcomeRoll < 0.7) outcome = 'success'
      else if (outcomeRoll < 0.85) outcome = 'failure'
      else if (outcomeRoll < 0.95) outcome = 'abandoned'
      else outcome = 'skipped'
      pathType = Math.random() < 0.4 ? 'optimal' : 'suboptimal'
    } else if (behaviorProfile === 2) {
      // Struggling: more failures
      const outcomeRoll = Math.random()
      if (outcomeRoll < 0.4) outcome = 'success'
      else if (outcomeRoll < 0.7) outcome = 'failure'
      else if (outcomeRoll < 0.9) outcome = 'abandoned'
      else outcome = 'skipped'
      pathType = Math.random() < 0.2 ? 'optimal' : Math.random() < 0.6 ? 'suboptimal' : 'failed'
    } else {
      // Abandoner: many skips/abandons
      const outcomeRoll = Math.random()
      if (outcomeRoll < 0.2) outcome = 'success'
      else if (outcomeRoll < 0.4) outcome = 'failure'
      else if (outcomeRoll < 0.7) outcome = 'abandoned'
      else outcome = 'skipped'
      pathType = 'failed'
    }

    // Free flow tasks are always "success" (no specific goal)
    if (taskDef.flow_type === 'free_flow') {
      outcome = outcome === 'skipped' ? 'skipped' : 'success'
    }

    // Adjust path for outcome
    if (outcome === 'failure' || outcome === 'abandoned') {
      pathType = 'failed'
    }

    const pathTaken = taskPaths_current[pathType]
    const clickCount = pathTaken.length + randomInt(0, 5)
    const misclickCount = behaviorProfile >= 2 ? randomInt(1, 4) : randomInt(0, 2)
    const backtrackCount = pathType === 'optimal' ? 0 : randomInt(1, 3)
    const isDirect = backtrackCount === 0

    // Calculate timing
    const baseTimePerFrame = behaviorProfile === 0 ? 2000 : behaviorProfile === 1 ? 3500 : 5000
    const totalTimeMs = pathTaken.length * baseTimePerFrame + randomInt(-2000, 5000)
    const timeToFirstClickMs = behaviorProfile === 0 ? randomInt(500, 1500) : randomInt(1000, 4000)

    const attemptId = generateId()

    // Generate click events for each frame
    let sequenceNumber = 0
    let frameStartTime = currentTime

    for (let i = 0; i < pathTaken.length; i++) {
      const frameId = pathTaken[i]
      const timeOnFrame = Math.floor(totalTimeMs / pathTaken.length) + randomInt(-500, 500)

      // Click event
      const clickEventId = generateId()
      clickEvents.push({
        id: clickEventId,
        study_id: STUDY_ID,
        session_id: sessionId,
        task_id: taskId,
        frame_id: frameId,
        hotspot_id: i < pathTaken.length - 1 ? generateId() : null, // Last frame has no hotspot click
        x: randomInt(100, 1340),
        y: randomInt(100, 800),
        viewport_x: randomInt(100, 1340),
        viewport_y: randomInt(100, 800),
        was_hotspot: i < pathTaken.length - 1,
        triggered_transition: i < pathTaken.length - 1,
        time_since_frame_load_ms: i === 0 ? timeToFirstClickMs : randomInt(500, 3000),
        timestamp: new Date(frameStartTime + randomInt(500, timeOnFrame)).toISOString(),
      })

      // Navigation event (except for first frame)
      if (i > 0) {
        navigationEvents.push({
          id: generateId(),
          study_id: STUDY_ID,
          session_id: sessionId,
          task_id: taskId,
          from_frame_id: pathTaken[i - 1],
          to_frame_id: frameId,
          triggered_by: 'click', // Valid: 'click', 'back_button', 'task_start', 'timeout'
          click_event_id: clickEventId,
          sequence_number: sequenceNumber++,
          time_on_from_frame_ms: timeOnFrame,
          timestamp: new Date(frameStartTime).toISOString(),
        })
      } else {
        // First navigation (task start)
        navigationEvents.push({
          id: generateId(),
          study_id: STUDY_ID,
          session_id: sessionId,
          task_id: taskId,
          from_frame_id: null,
          to_frame_id: frameId,
          triggered_by: 'task_start', // Valid: 'click', 'back_button', 'task_start', 'timeout'
          click_event_id: null,
          sequence_number: sequenceNumber++,
          time_on_from_frame_ms: 0,
          timestamp: new Date(frameStartTime).toISOString(),
        })
      }

      // Add misclicks
      for (let m = 0; m < Math.min(misclickCount, 2); m++) {
        if (Math.random() < 0.3) {
          clickEvents.push({
            id: generateId(),
            study_id: STUDY_ID,
            session_id: sessionId,
            task_id: taskId,
            frame_id: frameId,
            hotspot_id: null,
            x: randomInt(100, 1340),
            y: randomInt(100, 800),
            viewport_x: randomInt(100, 1340),
            viewport_y: randomInt(100, 800),
            was_hotspot: false,
            triggered_transition: false,
            time_since_frame_load_ms: randomInt(1000, 4000),
            timestamp: new Date(frameStartTime + randomInt(100, timeOnFrame - 100)).toISOString(),
          })
        }
      }

      frameStartTime += timeOnFrame
    }

    // Create task attempt
    taskAttempts.push({
      id: attemptId,
      study_id: STUDY_ID,
      session_id: sessionId,
      participant_id: participantId,
      task_id: taskId,
      outcome,
      path_taken: pathTaken,
      is_direct: isDirect,
      total_time_ms: totalTimeMs,
      time_to_first_click_ms: timeToFirstClickMs,
      click_count: clickCount,
      misclick_count: misclickCount,
      backtrack_count: backtrackCount,
      post_task_responses: [], // Will be stored separately
    })

    // Generate post-task question responses (unless skipped)
    if (outcome !== 'skipped') {
      const postTaskQs = taskDef.post_task_questions

      for (const ptq of postTaskQs) {
        let value: any

        switch (ptq.question_type) {
          case 'opinion_scale':
            value = weightedRandom([5, 10, 20, 35, 30]) + 1
            break
          case 'nps':
            value = { value: weightedRandom([2, 2, 3, 4, 5, 8, 12, 18, 22, 16, 8]) }
            break
          case 'multiple_choice':
            if ((ptq.config as any).mode === 'multi') {
              const opts = (ptq.config as any).options.map((o: any) => o.id)
              value = { optionIds: shuffleArray(opts).slice(0, randomInt(1, 3)) }
            } else {
              const opts = (ptq.config as any).options as Array<{ id: string; label: string }>
              value = { optionId: randomChoice(opts).id }
            }
            break
          case 'yes_no':
            value = Math.random() > 0.4
            break
          case 'multi_line_text':
            value =
              taskId === TASK_CHECKOUT_ID
                ? randomChoice(feedbackTexts.checkout)
                : taskId === TASK_ADD_TO_CART_ID
                  ? randomChoice(feedbackTexts.cart)
                  : randomChoice(feedbackTexts.general)
            break
          case 'matrix':
            const rows = (ptq.config as any).rows as Array<{ id: string; label: string }>
            const cols = (ptq.config as any).columns as Array<{ id: string; label: string }>
            value = {}
            for (const row of rows) {
              ;(value as any)[row.id] = randomChoice(cols).id
            }
            break
          case 'ranking':
            const items = (ptq.config as any).items.map((i: any) => i.id)
            value = shuffleArray(items)
            break
          default:
            value = 'Response'
        }

        postTaskResponses.push({
          id: generateId(),
          study_id: STUDY_ID,
          session_id: sessionId,
          task_attempt_id: attemptId,
          participant_id: participantId,
          task_id: taskId,
          question_id: ptq.id,
          value,
        })
      }
    }

    currentTime = frameStartTime + randomInt(2000, 5000)
  }

  const sessionEndTime = currentTime + randomInt(5000, 15000)
  const totalSessionTime = sessionEndTime - sessionStartTime

  const session = {
    id: sessionId,
    study_id: STUDY_ID,
    participant_id: participantId,
    started_at: new Date(sessionStartTime).toISOString(),
    completed_at: new Date(sessionEndTime).toISOString(),
    total_time_ms: totalSessionTime,
    device_info: {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      screenWidth: 1920,
      screenHeight: 1080,
      devicePixelRatio: 2,
    },
  }

  return {
    session,
    taskAttempts,
    clickEvents,
    navigationEvents,
    postTaskResponses,
  }
}

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

async function main() {
  const log = (msg: string) => process.stdout.write(msg + '\n')
  log('🚀 Starting Ultimate Prototype Test Seed...\n')

  // 1. Create Project (or use existing)
  if (USE_EXISTING_PROJECT) {
    log('📁 Using existing project: ' + PROJECT_ID)
  } else {
    log('📁 Creating project...')
    const { error: projErr } = await supabase.from('projects').insert({
      id: PROJECT_ID,
      user_id: USER_ID,
      name: 'Ultimate Prototype Test Project',
      description: 'Comprehensive prototype test with ALL features for testing',
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
    study_type: 'prototype_test',
    title: 'Ultimate E-Commerce Prototype Test',
    description:
      'Comprehensive prototype test with all features: multiple task types, post-task questions, session recording, and detailed analytics.',
    status: 'active',
    share_code: SHARE_CODE,
    language: 'en',
    settings: {
      studyFlow: studyFlowSettings,
      ...prototypeTestSettings,
    },
    branding: { primaryColor: '#7C3AED', backgroundColor: '#F5F3FF' },
    closing_rule: { type: 'responses', maxResponses: 500, enabled: true },
  })
  if (studyErr) {
    log('❌ Study error: ' + studyErr.message)
    return
  }
  log('✅ Study created')

  // 3. Create Prototype
  log('🎨 Creating prototype...')
  const { error: protoErr } = await supabase.from('prototype_test_prototypes').insert(prototypeData)
  if (protoErr) {
    log('❌ Prototype error: ' + protoErr.message)
    return
  }
  log('✅ Prototype created')

  // 4. Create Frames
  log('🖼️  Creating frames...')
  const { error: frameErr } = await supabase.from('prototype_test_frames').insert(prototypeFrames)
  if (frameErr) {
    log('❌ Frames error: ' + frameErr.message)
    return
  }
  log('✅ ' + prototypeFrames.length + ' frames created')

  // 4b. Update prototype with starting frame (now that frames exist)
  log('🔗 Linking starting frame...')
  const { error: updateProtoErr } = await supabase
    .from('prototype_test_prototypes')
    .update({ starting_frame_id: FRAME_HOME_ID })
    .eq('id', PROTOTYPE_ID)
  if (updateProtoErr) {
    log('⚠️ Starting frame link warning: ' + updateProtoErr.message)
  } else {
    log('✅ Starting frame linked')
  }

  // 5. Create Tasks
  log('📋 Creating tasks...')
  const { error: taskErr } = await supabase.from('prototype_test_tasks').insert(prototypeTasks)
  if (taskErr) {
    log('❌ Tasks error: ' + taskErr.message)
    return
  }
  log('✅ ' + prototypeTasks.length + ' tasks created')

  // 6. Create Screening Questions
  log('❓ Creating screening questions...')
  const { error: screenErr } = await supabase.from('study_flow_questions').insert(screeningQuestions)
  if (screenErr) {
    log('❌ Screening questions error: ' + screenErr.message)
    return
  }
  log('✅ ' + screeningQuestions.length + ' screening questions created')

  // 7. Create Pre-Study Questions
  log('📝 Creating pre-study questions...')
  const { error: preErr } = await supabase.from('study_flow_questions').insert(preStudyQuestions)
  if (preErr) {
    log('❌ Pre-study questions error: ' + preErr.message)
    return
  }
  log('✅ ' + preStudyQuestions.length + ' pre-study questions created')

  // 8. Create Post-Study Questions
  log('📝 Creating post-study questions...')
  const { error: postErr } = await supabase.from('study_flow_questions').insert(postStudyQuestions)
  if (postErr) {
    log('❌ Post-study questions error: ' + postErr.message)
    return
  }
  log('✅ ' + postStudyQuestions.length + ' post-study questions created')

  // 9. Generate Participants & Responses
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

  // 10. Generate Study Flow Responses (Screening, Pre, Post)
  log('📋 Generating study flow responses...')
  const allFlowResponses: any[] = []

  for (const p of participants) {
    // Screening responses for everyone
    allFlowResponses.push(...generateScreeningResponses(p.id, p.status === 'abandoned'))

    // Pre and post only for completed
    if (p.status === 'completed') {
      allFlowResponses.push(...generatePreStudyResponses(p.id))
      allFlowResponses.push(...generatePostStudyResponses(p.id))
    }
  }

  // Insert in batches
  for (let i = 0; i < allFlowResponses.length; i += 500) {
    const batch = allFlowResponses.slice(i, i + 500)
    const { error } = await supabase.from('study_flow_responses').insert(batch)
    if (error) log('⚠️ Flow responses batch error: ' + error.message)
  }
  log('✅ ' + allFlowResponses.length + ' study flow responses created')

  // 11. Generate Prototype Test Sessions & Related Data
  log('🎮 Generating prototype test sessions...')
  const allSessions: any[] = []
  const allTaskAttempts: any[] = []
  const allClickEvents: any[] = []
  const allNavigationEvents: any[] = []
  const allPostTaskResponses: any[] = []

  for (const p of participants.filter((p) => p.status === 'completed')) {
    const sessionData = generateSessionData(p.id, p.started_at)
    allSessions.push(sessionData.session)
    allTaskAttempts.push(...sessionData.taskAttempts)
    allClickEvents.push(...sessionData.clickEvents)
    allNavigationEvents.push(...sessionData.navigationEvents)
    allPostTaskResponses.push(...sessionData.postTaskResponses)
  }

  // Insert sessions
  const { error: sessErr } = await supabase.from('prototype_test_sessions').insert(allSessions)
  if (sessErr) log('⚠️ Sessions error: ' + sessErr.message)
  else log('✅ ' + allSessions.length + ' sessions created')

  // Insert task attempts in batches
  for (let i = 0; i < allTaskAttempts.length; i += 500) {
    const batch = allTaskAttempts.slice(i, i + 500)
    const { error } = await supabase.from('prototype_test_task_attempts').insert(batch)
    if (error) log('⚠️ Task attempts batch error: ' + error.message)
  }
  log('✅ ' + allTaskAttempts.length + ' task attempts created')

  // Insert click events in batches
  for (let i = 0; i < allClickEvents.length; i += 500) {
    const batch = allClickEvents.slice(i, i + 500)
    const { error } = await supabase.from('prototype_test_click_events').insert(batch)
    if (error) log('⚠️ Click events batch error: ' + error.message)
  }
  log('✅ ' + allClickEvents.length + ' click events created')

  // Insert navigation events in batches
  for (let i = 0; i < allNavigationEvents.length; i += 500) {
    const batch = allNavigationEvents.slice(i, i + 500)
    const { error } = await supabase.from('prototype_test_navigation_events').insert(batch)
    if (error) log('⚠️ Navigation events batch error: ' + error.message)
  }
  log('✅ ' + allNavigationEvents.length + ' navigation events created')

  // Insert post-task responses in batches
  for (let i = 0; i < allPostTaskResponses.length; i += 500) {
    const batch = allPostTaskResponses.slice(i, i + 500)
    const { error } = await supabase.from('prototype_test_post_task_responses').insert(batch)
    if (error) log('⚠️ Post-task responses batch error: ' + error.message)
  }
  log('✅ ' + allPostTaskResponses.length + ' post-task responses created')

  // Summary
  log('\n' + '='.repeat(60))
  log('✨ SEED COMPLETE!')
  log('='.repeat(60))
  log(`
📁 Project ID: ${PROJECT_ID}
📊 Study ID: ${STUDY_ID}
🔗 Share Code: ${SHARE_CODE}

Prototype Test Features Included:
✅ Welcome, Agreement, Screening (4 questions)
✅ Demographics (2 sections, 6 fields)
✅ Activity Instructions (detailed prototype guidance)
✅ Pre-study questions (2)
✅ Post-study questions (2)
✅ Thank you with redirect

Prototype Configuration:
✅ 8 frames (simulated e-commerce flow)
✅ 5 tasks with different configurations:
   - Destination success (single goal)
   - Destination success (multiple goals)
   - Pathway success (v2 multi-path)
   - Pathway success (strict single path)
   - Free flow exploration
✅ Post-task questions per task (10 total)
   - Opinion scales (numerical, stars, emotions)
   - NPS
   - Multiple choice (single & multi)
   - Yes/No
   - Matrix
   - Ranking
   - Text feedback
✅ All prototype settings enabled:
   - Track hesitation
   - Clickable area flashing
   - Tasks end automatically
   - Scale to fit
   - Session recording (screen + audio)
   - Task instruction position (top-right)
   - Randomize tasks (except first)

Data Generated:
👥 Participants: ${TOTAL} total (${REJECTED} rejected, ${TOTAL - REJECTED} completed)
📋 Study flow responses: ${allFlowResponses.length}
🎮 Sessions: ${allSessions.length}
📝 Task attempts: ${allTaskAttempts.length}
🖱️  Click events: ${allClickEvents.length}
🧭 Navigation events: ${allNavigationEvents.length}
❓ Post-task responses: ${allPostTaskResponses.length}

Participant Behavior Distribution:
- Expert users (fast, optimal paths): ~40%
- Average users (mixed outcomes): ~35%
- Struggling users (more failures): ~15%
- Abandoners (many skips): ~10%

Task Outcome Distribution:
- Success (reached goal/path): ~60%
- Failure (wrong destination): ~20%
- Abandoned (gave up): ~12%
- Skipped (didn't attempt): ~8%
`)
}

main().catch((e) => process.stderr.write('Error: ' + e.message + '\n'))
