/**
 * All Question Types Survey Seed Script
 * Creates a realistic survey study with ONE question of EACH type
 *
 * FEATURES:
 * - One question per question type (14 total)
 * - Realistic questions and answer options
 * - Study kept in DRAFT mode (no participants)
 * - Clean, minimal setup
 *
 * Note: audio_response type not included (requires migration update)
 *
 * Run with: npx tsx scripts/seed/survey/all-question-types-survey.ts
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

// =============================================================================
// IDS
// =============================================================================

const PROJECT_ID = generateId()
const STUDY_ID = generateId()
// Default dev user ID (better-auth)
const USER_ID = process.env.SEED_USER_ID || 'your-better-auth-user-id'
const SHARE_CODE = `all-types-survey-${Date.now()}`

// Question IDs
const Q_SHORT_TEXT_ID = generateId()
const Q_LONG_TEXT_ID = generateId()
const Q_MULTIPLE_CHOICE_SINGLE_ID = generateId()
const Q_MULTIPLE_CHOICE_MULTI_ID = generateId()
const Q_MULTIPLE_CHOICE_DROPDOWN_ID = generateId()
const Q_IMAGE_CHOICE_ID = generateId()
const Q_YES_NO_ID = generateId()
const Q_OPINION_SCALE_ID = generateId()
const Q_NPS_ID = generateId()
const Q_MATRIX_ID = generateId()
const Q_RANKING_ID = generateId()
const Q_SLIDER_ID = generateId()
const Q_SEMANTIC_DIFFERENTIAL_ID = generateId()
const Q_CONSTANT_SUM_ID = generateId()

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

async function seed() {
  console.log('🌱 Starting All Question Types Survey Seed...\n')

  // ---------------------------------------------------------------------------
  // 1. CREATE PROJECT
  // ---------------------------------------------------------------------------

  console.log('📁 Creating project...')
  const { error: projectError } = await supabase.from('projects').insert({
    id: PROJECT_ID,
    user_id: USER_ID,
    name: 'All Question Types Demo',
    description: 'Comprehensive survey showcasing all available question types',
  })

  if (projectError) {
    console.error('❌ Project creation failed:', projectError.message)
    process.exit(1)
  }
  console.log('✅ Project created\n')

  // ---------------------------------------------------------------------------
  // 2. CREATE SURVEY STUDY (DRAFT MODE)
  // ---------------------------------------------------------------------------

  console.log('📋 Creating survey study (DRAFT)...')
  const { error: studyError } = await supabase.from('studies').insert({
    id: STUDY_ID,
    project_id: PROJECT_ID,
    user_id: USER_ID,
    study_type: 'survey',
    status: 'draft', // Keep in draft - no participants
    share_code: SHARE_CODE,
    title: 'Product Feedback Survey - All Question Types',
    description: 'A comprehensive survey demonstrating every question type available',
    settings: {
      showOneQuestionPerPage: true,
      randomizeQuestions: false,
      showProgressBar: true,
      allowSkipQuestions: false,
      studyFlow: {
        welcome: {
          enabled: true,
          title: 'Welcome to Our Product Survey',
          message:
            '<p>Thank you for taking the time to share your feedback with us!</p><p>This survey will help us understand your experience and improve our product.</p>',
          includeStudyTitle: false,
          includeDescription: true,
        },
        participantAgreement: {
          enabled: false,
          title: 'Consent',
          message: '',
          agreementText: '',
          rejectionTitle: '',
          rejectionMessage: '',
        },
        screening: {
          enabled: false,
          rejectionTitle: '',
          rejectionMessage: '',
        },
        participantIdentifier: {
          type: 'anonymous',
        },
        preStudyQuestions: {
          enabled: false,
        },
        activityInstructions: {
          enabled: false,
          title: '',
          part1: '',
        },
        surveyQuestionnaire: {
          enabled: true,
          showIntro: true,
          introTitle: 'Share Your Thoughts',
          introMessage:
            '<p>Please answer the following questions honestly. There are no right or wrong answers.</p>',
          pageMode: 'one_per_page',
          randomizeQuestions: false,
          showProgressBar: true,
          allowSkipQuestions: false,
        },
        postStudyQuestions: {
          enabled: false,
        },
        thankYou: {
          enabled: true,
          title: 'Thank You!',
          message: '<p>Your feedback has been recorded. We truly appreciate your time!</p>',
          redirectDelay: 0,
        },
        closedStudy: {
          title: 'Study Closed',
          message: '<p>This study is currently not accepting responses.</p>',
          redirectImmediately: false,
        },
      },
    },
  })

  if (studyError) {
    console.error('❌ Study creation failed:', studyError.message)
    process.exit(1)
  }
  console.log('✅ Survey study created (DRAFT)\n')

  // ---------------------------------------------------------------------------
  // 3. CREATE ALL QUESTION TYPES
  // ---------------------------------------------------------------------------

  console.log('📝 Creating survey questions (all types)...')

  const questions = [
    // 1. Single Line Text (Email)
    {
      id: Q_SHORT_TEXT_ID,
      study_id: STUDY_ID,
      section: 'survey',
      position: 1,
      question_type: 'single_line_text',
      question_text: 'What is your email address?',
      description: 'We will only use this to follow up if needed',
      is_required: true,
      config: {
        inputType: 'email',
        placeholder: 'you@example.com',
      },
    },

    // 2. Multi Line Text
    {
      id: Q_LONG_TEXT_ID,
      study_id: STUDY_ID,
      section: 'survey',
      position: 2,
      question_type: 'multi_line_text',
      question_text: 'What do you like most about our product?',
      description: 'Share as much detail as you like',
      is_required: true,
      config: {
        placeholder: 'I really appreciate...',
        maxLength: 1000,
      },
    },

    // 3. Multiple Choice - Single Select (Radio)
    {
      id: Q_MULTIPLE_CHOICE_SINGLE_ID,
      study_id: STUDY_ID,
      section: 'survey',
      position: 3,
      question_type: 'multiple_choice',
      question_text: 'How often do you use our product?',
      is_required: true,
      config: {
        mode: 'single',
        options: [
          { id: generateId(), label: 'Daily' },
          { id: generateId(), label: 'A few times a week' },
          { id: generateId(), label: 'Weekly' },
          { id: generateId(), label: 'Monthly' },
          { id: generateId(), label: 'Rarely' },
        ],
        shuffle: false,
        allowOther: true,
        otherLabel: 'Other frequency',
      },
    },

    // 4. Multiple Choice - Multi Select (Checkbox)
    {
      id: Q_MULTIPLE_CHOICE_MULTI_ID,
      study_id: STUDY_ID,
      section: 'survey',
      position: 4,
      question_type: 'multiple_choice',
      question_text: 'Which features do you use regularly?',
      description: 'Select all that apply',
      is_required: true,
      config: {
        mode: 'multi',
        options: [
          { id: generateId(), label: 'Dashboard' },
          { id: generateId(), label: 'Reports' },
          { id: generateId(), label: 'Analytics' },
          { id: generateId(), label: 'Collaboration tools' },
          { id: generateId(), label: 'Mobile app' },
          { id: generateId(), label: 'API integration' },
        ],
        shuffle: false,
        allowOther: true,
        otherLabel: 'Other features',
        minSelections: 1,
        maxSelections: undefined,
      },
    },

    // 5. Multiple Choice - Dropdown
    {
      id: Q_MULTIPLE_CHOICE_DROPDOWN_ID,
      study_id: STUDY_ID,
      section: 'survey',
      position: 5,
      question_type: 'multiple_choice',
      question_text: 'What is your industry?',
      is_required: true,
      config: {
        mode: 'dropdown',
        options: [
          { id: generateId(), label: 'Technology' },
          { id: generateId(), label: 'Healthcare' },
          { id: generateId(), label: 'Education' },
          { id: generateId(), label: 'Finance' },
          { id: generateId(), label: 'Retail' },
          { id: generateId(), label: 'Manufacturing' },
          { id: generateId(), label: 'Marketing & Advertising' },
          { id: generateId(), label: 'Real Estate' },
          { id: generateId(), label: 'Government' },
          { id: generateId(), label: 'Non-profit' },
        ],
        placeholder: 'Select your industry',
        shuffle: false,
        allowOther: true,
        otherLabel: 'Other industry',
      },
    },

    // 6. Image Choice
    {
      id: Q_IMAGE_CHOICE_ID,
      study_id: STUDY_ID,
      section: 'survey',
      position: 6,
      question_type: 'image_choice',
      question_text: 'Which interface design do you prefer?',
      description: 'Select the design that appeals to you most',
      is_required: true,
      config: {
        mode: 'single',
        options: [
          {
            id: generateId(),
            label: 'Classic Design',
            imageUrl: null,
            imageFilename: null,
          },
          {
            id: generateId(),
            label: 'Modern Design',
            imageUrl: null,
            imageFilename: null,
          },
          {
            id: generateId(),
            label: 'Minimalist Design',
            imageUrl: null,
            imageFilename: null,
          },
        ],
        gridColumns: 3,
        showLabels: true,
        shuffle: false,
        allowOther: false,
      },
    },

    // 7. Yes/No
    {
      id: Q_YES_NO_ID,
      study_id: STUDY_ID,
      section: 'survey',
      position: 7,
      question_type: 'yes_no',
      question_text: 'Would you recommend our product to a colleague?',
      is_required: true,
      config: {
        styleType: 'icons',
        yesLabel: 'Yes',
        noLabel: 'No',
      },
    },

    // 8. Opinion Scale
    {
      id: Q_OPINION_SCALE_ID,
      study_id: STUDY_ID,
      section: 'survey',
      position: 8,
      question_type: 'opinion_scale',
      question_text: 'How easy is our product to use?',
      is_required: true,
      config: {
        scalePoints: 5,
        startAtZero: false,
        scaleType: 'stars',
        leftLabel: 'Very difficult',
        middleLabel: 'Neutral',
        rightLabel: 'Very easy',
      },
    },

    // 9. NPS
    {
      id: Q_NPS_ID,
      study_id: STUDY_ID,
      section: 'survey',
      position: 9,
      question_type: 'nps',
      question_text:
        'On a scale of 0-10, how likely are you to recommend our product to a friend or colleague?',
      is_required: true,
      config: {
        leftLabel: 'Not at all likely',
        rightLabel: 'Extremely likely',
      },
    },

    // 10. Matrix
    {
      id: Q_MATRIX_ID,
      study_id: STUDY_ID,
      section: 'survey',
      position: 10,
      question_type: 'matrix',
      question_text: 'Please rate the following aspects of our product:',
      is_required: true,
      config: {
        rows: [
          { id: generateId(), label: 'Performance' },
          { id: generateId(), label: 'User Interface' },
          { id: generateId(), label: 'Customer Support' },
          { id: generateId(), label: 'Value for Money' },
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

    // 11. Ranking
    {
      id: Q_RANKING_ID,
      study_id: STUDY_ID,
      section: 'survey',
      position: 11,
      question_type: 'ranking',
      question_text: 'Rank these features by importance (most to least important):',
      description: 'Drag and drop to reorder',
      is_required: true,
      config: {
        items: [
          { id: generateId(), label: 'Speed and Performance' },
          { id: generateId(), label: 'User-Friendly Interface' },
          { id: generateId(), label: 'Advanced Features' },
          { id: generateId(), label: 'Reliable Customer Support' },
          { id: generateId(), label: 'Competitive Pricing' },
        ],
        randomOrder: false,
      },
    },

    // 12. Slider
    {
      id: Q_SLIDER_ID,
      study_id: STUDY_ID,
      section: 'survey',
      position: 12,
      question_type: 'slider',
      question_text: 'How satisfied are you with our product overall?',
      is_required: true,
      config: {
        minValue: 0,
        maxValue: 100,
        step: 5,
        leftLabel: 'Not satisfied',
        middleLabel: 'Neutral',
        rightLabel: 'Very satisfied',
        showTicks: true,
        showValue: true,
      },
    },

    // 13. Semantic Differential
    {
      id: Q_SEMANTIC_DIFFERENTIAL_ID,
      study_id: STUDY_ID,
      section: 'survey',
      position: 13,
      question_type: 'semantic_differential',
      question_text: 'How would you describe our product?',
      description: 'Rate each characteristic on the scale provided',
      is_required: true,
      config: {
        scalePoints: 7,
        scales: [
          { id: generateId(), leftLabel: 'Outdated', rightLabel: 'Modern' },
          { id: generateId(), leftLabel: 'Complex', rightLabel: 'Simple' },
          { id: generateId(), leftLabel: 'Boring', rightLabel: 'Exciting' },
          { id: generateId(), leftLabel: 'Unreliable', rightLabel: 'Reliable' },
        ],
        showMiddleLabel: true,
        middleLabel: 'Neutral',
        randomizeScales: false,
        showNumbers: false,
        presetId: 'custom',
      },
    },

    // 14. Constant Sum
    {
      id: Q_CONSTANT_SUM_ID,
      study_id: STUDY_ID,
      section: 'survey',
      position: 14,
      question_type: 'constant_sum',
      question_text: 'Distribute 100 points across these factors based on their importance to you:',
      description: 'The total must equal 100 points',
      is_required: true,
      config: {
        items: [
          {
            id: generateId(),
            label: 'Price',
            description: 'Cost and affordability',
          },
          {
            id: generateId(),
            label: 'Quality',
            description: 'Build quality and reliability',
          },
          {
            id: generateId(),
            label: 'Features',
            description: 'Available functionality',
          },
          {
            id: generateId(),
            label: 'Support',
            description: 'Customer service and documentation',
          },
        ],
        totalPoints: 100,
        displayMode: 'inputs',
        showBars: true,
        randomOrder: false,
      },
    },

  ]

  const { error: questionsError } = await supabase
    .from('study_flow_questions')
    .insert(questions)

  if (questionsError) {
    console.error('❌ Questions creation failed:', questionsError.message)
    process.exit(1)
  }
  console.log(`✅ Created ${questions.length} survey questions (all types)\n`)

  // ---------------------------------------------------------------------------
  // DONE
  // ---------------------------------------------------------------------------

  console.log('🎉 All Question Types Survey Seed Complete!\n')
  console.log('📊 Summary:')
  console.log(`   Study ID: ${STUDY_ID}`)
  console.log(`   Share Code: ${SHARE_CODE}`)
  console.log(`   Status: DRAFT (no participants)`)
  console.log(`   Total Questions: ${questions.length}`)
  console.log(`   URL: http://localhost:4001/${SHARE_CODE}\n`)
  console.log('✨ Navigate to the dashboard to view and edit the survey!')
}

// =============================================================================
// RUN
// =============================================================================

seed()
  .then(() => {
    console.log('✅ Seed completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  })
