/**
 * Add Study Flow Questions to Ultimate First Impression Study
 *
 * This script:
 * 1. Adds screening, pre-study, and post-study questions to the existing study
 * 2. Enables these sections in the study settings
 * 3. Seeds responses for all 100 existing participants
 *
 * Question types covered:
 * - single_line_text, multi_line_text
 * - radio, dropdown, checkbox
 * - likert, nps, matrix, ranking
 *
 * Run with: npx tsx scripts/seed/first-impression/add-study-flow-questions.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const STUDY_ID = 'c44a8ead-221d-4d93-9c39-a5c102a6a03b'

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
// QUESTION DEFINITIONS
// =============================================================================

interface QuestionDef {
  section: 'screening' | 'pre_study' | 'post_study'
  question_type: string
  question_text: string
  is_required: boolean
  config: any
  position: number
}

const SCREENING_QUESTIONS: QuestionDef[] = [
  {
    section: 'screening',
    question_type: 'radio',
    question_text: 'Have you used our product before?',
    is_required: true,
    config: {
      options: ['Yes, regularly', 'Yes, occasionally', 'No, never'],
      randomizeOptions: false,
    },
    position: 0,
  },
  {
    section: 'screening',
    question_type: 'dropdown',
    question_text: 'What is your primary role?',
    is_required: true,
    config: {
      options: ['Designer', 'Developer', 'Product Manager', 'Researcher', 'Other'],
    },
    position: 1,
  },
  {
    section: 'screening',
    question_type: 'checkbox',
    question_text: 'Which design tools do you use? (Select all that apply)',
    is_required: true,
    config: {
      options: ['Figma', 'Sketch', 'Adobe XD', 'InVision', 'Framer', 'None'],
      minSelections: 1,
      maxSelections: null,
      randomizeOptions: false,
    },
    position: 2,
  },
]

const PRE_STUDY_QUESTIONS: QuestionDef[] = [
  {
    section: 'pre_study',
    question_type: 'single_line_text',
    question_text: 'What is your name? (Optional)',
    is_required: false,
    config: {
      placeholder: 'Your name',
      maxLength: 100,
    },
    position: 0,
  },
  {
    section: 'pre_study',
    question_type: 'radio',
    question_text: 'How often do you shop online?',
    is_required: true,
    config: {
      options: ['Daily', 'Weekly', 'Monthly', 'Rarely', 'Never'],
      randomizeOptions: false,
    },
    position: 1,
  },
  {
    section: 'pre_study',
    question_type: 'nps',
    question_text: 'How likely are you to recommend our service to a friend?',
    is_required: true,
    config: {
      minLabel: 'Not at all likely',
      maxLabel: 'Extremely likely',
    },
    position: 2,
  },
  {
    section: 'pre_study',
    question_type: 'likert',
    question_text: 'I find the current website easy to navigate',
    is_required: true,
    config: {
      scale: 5,
      leftLabel: 'Strongly Disagree',
      rightLabel: 'Strongly Agree',
      includeNeutral: true,
    },
    position: 3,
  },
]

const POST_STUDY_QUESTIONS: QuestionDef[] = [
  {
    section: 'post_study',
    question_type: 'multi_line_text',
    question_text: 'What were your overall impressions of the designs you saw?',
    is_required: true,
    config: {
      placeholder: 'Share your thoughts...',
      maxLength: 500,
      rows: 4,
    },
    position: 0,
  },
  {
    section: 'post_study',
    question_type: 'likert',
    question_text: 'The designs were visually appealing',
    is_required: true,
    config: {
      scale: 5,
      leftLabel: 'Strongly Disagree',
      rightLabel: 'Strongly Agree',
      includeNeutral: true,
    },
    position: 1,
  },
  {
    section: 'post_study',
    question_type: 'likert',
    question_text: 'The designs were easy to understand',
    is_required: true,
    config: {
      scale: 5,
      leftLabel: 'Strongly Disagree',
      rightLabel: 'Strongly Agree',
      includeNeutral: true,
    },
    position: 2,
  },
  {
    section: 'post_study',
    question_type: 'matrix',
    question_text: 'Please rate the following aspects of the designs:',
    is_required: true,
    config: {
      rows: ['Visual Design', 'Clarity', 'Professionalism', 'Trustworthiness'],
      columns: ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'],
      isRequired: true,
    },
    position: 3,
  },
  {
    section: 'post_study',
    question_type: 'ranking',
    question_text: 'Rank these qualities in order of importance for a website:',
    is_required: true,
    config: {
      items: ['Visual Appeal', 'Easy Navigation', 'Fast Loading', 'Mobile Friendly', 'Clear Information'],
    },
    position: 4,
  },
  {
    section: 'post_study',
    question_type: 'radio',
    question_text: 'Would you visit a website with this design?',
    is_required: true,
    config: {
      options: ['Definitely yes', 'Probably yes', 'Not sure', 'Probably not', 'Definitely not'],
      randomizeOptions: false,
    },
    position: 5,
  },
]

// =============================================================================
// RESPONSE GENERATION
// =============================================================================

function generateResponseValue(question: any): any {
  const { question_type, config } = question

  switch (question_type) {
    case 'single_line_text':
      // Optional name field
      if (question.question_text.includes('name')) {
        return Math.random() > 0.3
          ? randomChoice(['Alice', 'Bob', 'Charlie', 'Diana', 'Emma', 'Frank', 'Grace', 'Henry'])
          : '' // 30% leave blank
      }
      return 'Sample text response'

    case 'multi_line_text':
      // Varied feedback lengths
      const feedbacks = [
        'The designs looked professional and modern. I particularly liked the use of whitespace.',
        'Clean and minimalist. Easy on the eyes. Would definitely use a site with this design.',
        'Very impressive! The color scheme works well and the layout is intuitive.',
        'Good overall, but some elements felt a bit cluttered. Could be simplified.',
        'Love the modern aesthetic. The typography is excellent and very readable.',
        'The designs are okay but nothing special. Similar to many other websites I\'ve seen.',
        'Excellent work! Professional, clean, and user-friendly. Would recommend.',
        'Not a fan of the color choices, but the layout is solid.',
      ]
      return randomChoice(feedbacks)

    case 'radio':
    case 'dropdown':
      return randomChoice(config.options)

    case 'checkbox':
      // Select 1-3 random options
      const numSelections = randomInt(1, Math.min(3, config.options.length))
      const selected = []
      const availableOptions = [...config.options]
      for (let i = 0; i < numSelections; i++) {
        const idx = randomInt(0, availableOptions.length - 1)
        selected.push(availableOptions[idx])
        availableOptions.splice(idx, 1)
      }
      return selected

    case 'nps':
      // NPS: 0-10, weighted toward promoters (9-10)
      // Weights: [0,1,2,3,4,5,6,7,8,9,10]
      return weightedRandom([2, 2, 3, 4, 5, 6, 8, 10, 12, 18, 20])

    case 'likert':
      // 5-point scale, weighted toward positive
      // Weights for [1, 2, 3, 4, 5]
      return weightedRandom([5, 10, 20, 35, 30]) + 1

    case 'matrix':
      // Return an object with ratings for each row
      const matrixResponse: Record<string, string> = {}
      config.rows.forEach((row: string) => {
        matrixResponse[row] = randomChoice(config.columns)
      })
      return matrixResponse

    case 'ranking':
      // Shuffle items to create random ranking
      const items = [...config.items]
      const ranking = []
      while (items.length > 0) {
        const idx = randomInt(0, items.length - 1)
        ranking.push(items[idx])
        items.splice(idx, 1)
      }
      return ranking

    default:
      return null
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const log = (msg: string) => process.stdout.write(msg + '\n')
  log('🎯 Adding Study Flow Questions to First Impression Study...\n')

  // 1. Fetch study to verify it exists
  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, title, settings')
    .eq('id', STUDY_ID)
    .single()

  if (studyError || !study) {
    log('❌ Study not found')
    process.exit(1)
  }
  log(`✅ Found study: "${study.title}"`)

  // 2. Fetch existing participants
  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select('id, status, started_at, completed_at')
    .eq('study_id', STUDY_ID)
    .order('started_at')

  if (participantsError || !participants) {
    log('❌ Failed to fetch participants')
    process.exit(1)
  }
  log(`✅ Found ${participants.length} existing participants`)

  // 3. Delete existing study flow questions and responses (if any)
  log('\n🗑️  Cleaning existing study flow data...')

  await supabase
    .from('study_flow_responses')
    .delete()
    .eq('study_id', STUDY_ID)

  await supabase
    .from('study_flow_questions')
    .delete()
    .eq('study_id', STUDY_ID)

  log('   ✓ Cleaned existing data')

  // 4. Insert study flow questions
  log('\n📝 Creating study flow questions...')

  const allQuestions = [
    ...SCREENING_QUESTIONS,
    ...PRE_STUDY_QUESTIONS,
    ...POST_STUDY_QUESTIONS,
  ]

  const questionRows = allQuestions.map(q => ({
    id: generateId(),
    study_id: STUDY_ID,
    ...q,
  }))

  const { error: questionsError } = await supabase
    .from('study_flow_questions')
    .insert(questionRows)

  if (questionsError) {
    log('❌ Failed to insert questions: ' + questionsError.message)
    process.exit(1)
  }

  log(`   ✓ Screening: ${SCREENING_QUESTIONS.length} questions`)
  log(`   ✓ Pre-study: ${PRE_STUDY_QUESTIONS.length} questions`)
  log(`   ✓ Post-study: ${POST_STUDY_QUESTIONS.length} questions`)
  log(`   ✓ Total: ${questionRows.length} questions`)

  // 5. Generate responses for each participant
  log('\n💬 Generating responses for participants...')

  const allResponses: any[] = []

  for (const participant of participants) {
    // Only generate responses for completed participants
    if (participant.status !== 'completed') continue

    // Screening responses (everyone gets these)
    const screeningQuestions = questionRows.filter(q => q.section === 'screening')
    for (const question of screeningQuestions) {
      allResponses.push({
        participant_id: participant.id,
        study_id: STUDY_ID,
        question_id: question.id,
        response_value: generateResponseValue(question),
      })
    }

    // Pre-study responses (everyone gets these)
    const preStudyQuestions = questionRows.filter(q => q.section === 'pre_study')
    for (const question of preStudyQuestions) {
      // 95% answer optional questions
      if (!question.is_required && Math.random() > 0.95) continue

      allResponses.push({
        participant_id: participant.id,
        study_id: STUDY_ID,
        question_id: question.id,
        response_value: generateResponseValue(question),
      })
    }

    // Post-study responses (everyone gets these)
    const postStudyQuestions = questionRows.filter(q => q.section === 'post_study')
    for (const question of postStudyQuestions) {
      allResponses.push({
        participant_id: participant.id,
        study_id: STUDY_ID,
        question_id: question.id,
        response_value: generateResponseValue(question),
      })
    }
  }

  log(`   Generated ${allResponses.length} responses`)

  // 6. Insert responses in batches
  log('   Inserting responses...')
  const batchSize = 100
  for (let i = 0; i < allResponses.length; i += batchSize) {
    const batch = allResponses.slice(i, i + batchSize)
    const { error } = await supabase
      .from('study_flow_responses')
      .insert(batch)

    if (error) {
      log(`   ⚠️  Batch ${Math.floor(i / batchSize) + 1} error: ${error.message}`)
    }
  }
  log('   ✓ Responses inserted')

  // 7. Update study settings to enable these sections
  log('\n⚙️  Updating study settings...')

  const currentSettings = study.settings as any
  const updatedSettings = {
    ...currentSettings,
    studyFlow: {
      ...currentSettings.studyFlow,
      screening: {
        enabled: true,
        pageMode: 'one_per_page',
        introTitle: 'Screening Questions',
        introMessage: 'Please answer these questions to help us determine your eligibility for this study.',
        rejectionTitle: 'Thank You for Your Interest',
        rejectionMessage: 'Unfortunately, you don\'t meet the criteria for this study. We appreciate your willingness to participate.',
        redirectImmediately: false,
      },
      preStudyQuestions: {
        enabled: true,
        pageMode: 'one_per_page',
        introTitle: 'Before We Begin',
        introMessage: 'Please answer a few questions to help us understand your background.',
        randomizeQuestions: false,
      },
      postStudyQuestions: {
        enabled: true,
        pageMode: 'one_per_page',
        introTitle: 'Almost Done',
        introMessage: 'Please answer a few final questions about your experience.',
        randomizeQuestions: false,
      },
    },
  }

  const { error: updateError } = await supabase
    .from('studies')
    .update({ settings: updatedSettings })
    .eq('id', STUDY_ID)

  if (updateError) {
    log('❌ Failed to update settings: ' + updateError.message)
    process.exit(1)
  }
  log('   ✓ Settings updated')

  // 8. Summary
  const completedParticipants = participants.filter(p => p.status === 'completed').length
  const responsesPerParticipant = allQuestions.length
  const expectedResponses = completedParticipants * responsesPerParticipant

  log('\n' + '='.repeat(60))
  log('✨ STUDY FLOW QUESTIONS ADDED!')
  log('='.repeat(60))
  log(`
📊 Study ID: ${STUDY_ID}

Questions Added:
   📋 Screening: ${SCREENING_QUESTIONS.length} questions
   📝 Pre-study: ${PRE_STUDY_QUESTIONS.length} questions
   ✅ Post-study: ${POST_STUDY_QUESTIONS.length} questions
   📊 Total: ${allQuestions.length} questions

Responses Generated:
   👥 Participants: ${completedParticipants} completed
   💬 Total Responses: ${allResponses.length}
   📈 Expected: ${expectedResponses}
   ✓ Coverage: ${((allResponses.length / expectedResponses) * 100).toFixed(1)}%

Question Types Covered:
   ✓ single_line_text (name field)
   ✓ multi_line_text (feedback)
   ✓ radio (multiple choice)
   ✓ dropdown (role selection)
   ✓ checkbox (multi-select)
   ✓ likert (5-point scale)
   ✓ nps (0-10 scale)
   ✓ matrix (grid of ratings)
   ✓ ranking (drag-and-drop order)

🌐 View Results:
   http://localhost:4001/projects/${PROJECT_ID}/studies/${STUDY_ID}/results

   → Click on "Questionnaire" tab to see the study flow questions and responses!
`)
}

main().catch(e => {
  process.stderr.write('Error: ' + e.message + '\n')
  process.exit(1)
})
