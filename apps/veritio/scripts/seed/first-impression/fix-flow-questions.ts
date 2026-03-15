/**
 * Fix Study Flow Questions - Update to Use Correct Question Types
 *
 * This script:
 * 1. Deletes the old questions with deprecated types (radio, dropdown, checkbox, likert)
 * 2. Deletes all associated responses
 * 3. Re-creates questions with correct types (multiple_choice, opinion_scale)
 * 4. Re-seeds responses for all 90 completed participants
 *
 * Run with: bun run scripts/seed/first-impression/fix-flow-questions.ts
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
// QUESTION DEFINITIONS (CORRECTED TYPES)
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
    question_type: 'multiple_choice',  // FIXED: was 'radio'
    question_text: 'Have you used our product before?',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'opt1', label: 'Yes, regularly' },
        { id: 'opt2', label: 'Yes, occasionally' },
        { id: 'opt3', label: 'No, never' },
      ],
      shuffle: false,
    },
    position: 0,
  },
  {
    section: 'screening',
    question_type: 'multiple_choice',  // FIXED: was 'dropdown'
    question_text: 'What is your primary role?',
    is_required: true,
    config: {
      mode: 'dropdown',
      options: [
        { id: 'opt1', label: 'Designer' },
        { id: 'opt2', label: 'Developer' },
        { id: 'opt3', label: 'Product Manager' },
        { id: 'opt4', label: 'Researcher' },
        { id: 'opt5', label: 'Other' },
      ],
      placeholder: 'Select your role',
    },
    position: 1,
  },
  {
    section: 'screening',
    question_type: 'multiple_choice',  // FIXED: was 'checkbox'
    question_text: 'Which design tools do you use? (Select all that apply)',
    is_required: true,
    config: {
      mode: 'multi',
      options: [
        { id: 'opt1', label: 'Figma' },
        { id: 'opt2', label: 'Sketch' },
        { id: 'opt3', label: 'Adobe XD' },
        { id: 'opt4', label: 'InVision' },
        { id: 'opt5', label: 'Framer' },
        { id: 'opt6', label: 'None' },
      ],
      minSelections: 1,
      shuffle: false,
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
      inputType: 'text',
      placeholder: 'Your name',
      maxLength: 100,
    },
    position: 0,
  },
  {
    section: 'pre_study',
    question_type: 'multiple_choice',  // FIXED: was 'radio'
    question_text: 'How familiar are you with first impression testing?',
    is_required: true,
    config: {
      mode: 'single',
      options: [
        { id: 'opt1', label: 'Very familiar' },
        { id: 'opt2', label: 'Somewhat familiar' },
        { id: 'opt3', label: 'Not familiar' },
      ],
      shuffle: false,
    },
    position: 1,
  },
  {
    section: 'pre_study',
    question_type: 'nps',
    question_text: 'How likely are you to recommend our product to a friend?',
    is_required: true,
    config: {
      leftLabel: 'Not at all likely',
      rightLabel: 'Extremely likely',
    },
    position: 2,
  },
  {
    section: 'pre_study',
    question_type: 'opinion_scale',  // FIXED: was 'likert'
    question_text: 'How easy is it to navigate our website?',
    is_required: true,
    config: {
      scalePoints: 5,
      scaleType: 'numerical',
      startAtZero: false,
      leftLabel: 'Very difficult',
      middleLabel: 'Neutral',
      rightLabel: 'Very easy',
    },
    position: 3,
  },
]

const POST_STUDY_QUESTIONS: QuestionDef[] = [
  {
    section: 'post_study',
    question_type: 'multi_line_text',
    question_text: 'What was your first impression of the designs shown?',
    is_required: false,
    config: {
      placeholder: 'Share your thoughts...',
      maxLength: 500,
    },
    position: 0,
  },
  {
    section: 'post_study',
    question_type: 'opinion_scale',  // FIXED: was 'likert'
    question_text: 'How clear was the purpose of each design?',
    is_required: true,
    config: {
      scalePoints: 5,
      scaleType: 'numerical',
      startAtZero: false,
      leftLabel: 'Not clear at all',
      middleLabel: 'Somewhat clear',
      rightLabel: 'Very clear',
    },
    position: 1,
  },
  {
    section: 'post_study',
    question_type: 'matrix',
    question_text: 'Rate each design aspect',
    is_required: true,
    config: {
      rows: [
        { id: 'row1', label: 'Visual appeal' },
        { id: 'row2', label: 'Clarity of message' },
        { id: 'row3', label: 'Overall impression' },
      ],
      columns: [
        { id: 'col1', label: 'Poor' },
        { id: 'col2', label: 'Fair' },
        { id: 'col3', label: 'Good' },
        { id: 'col4', label: 'Excellent' },
      ],
      allowMultiplePerRow: false,
    },
    position: 2,
  },
  {
    section: 'post_study',
    question_type: 'ranking',
    question_text: 'Rank these factors by importance when viewing a new design',
    is_required: true,
    config: {
      items: [
        { id: 'item1', label: 'Visual aesthetics' },
        { id: 'item2', label: 'Clarity of content' },
        { id: 'item3', label: 'Brand consistency' },
        { id: 'item4', label: 'Call-to-action prominence' },
      ],
      randomOrder: false,
    },
    position: 3,
  },
  {
    section: 'post_study',
    question_type: 'multiple_choice',  // FIXED: was 'radio'
    question_text: 'Would you like to participate in future studies?',
    is_required: false,
    config: {
      mode: 'single',
      options: [
        { id: 'opt1', label: 'Yes' },
        { id: 'opt2', label: 'No' },
        { id: 'opt3', label: 'Maybe' },
      ],
      shuffle: false,
    },
    position: 4,
  },
  {
    section: 'post_study',
    question_type: 'yes_no',
    question_text: 'Did you find this study easy to complete?',
    is_required: true,
    config: {
      styleType: 'icons',
      yesLabel: 'Yes',
      noLabel: 'No',
    },
    position: 5,
  },
]

// =============================================================================
// RESPONSE GENERATION
// =============================================================================

function generateResponse(questionType: string, config: any): any {
  switch (questionType) {
    case 'multiple_choice':
      if (config.mode === 'multi') {
        // Checkbox - return object with optionIds array
        const selectedCount = randomInt(1, Math.min(3, config.options.length))
        const shuffled = [...config.options].sort(() => Math.random() - 0.5)
        const selectedOptions = shuffled.slice(0, selectedCount)
        return {
          optionIds: selectedOptions.map((opt: any) => opt.id)
        }
      } else {
        // Radio or dropdown - return object with optionId
        const selectedOption = randomChoice(config.options as Array<{ id: string }>)
        return {
          optionId: selectedOption.id
        }
      }

    case 'yes_no':
      return Math.random() > 0.5 ? 'Yes' : 'No'

    case 'opinion_scale':
      // 5-point scale, weighted toward positive (3, 4, 5)
      // Return object with value field (0-indexed for storage)
      const weights = [5, 10, 20, 35, 30]
      return {
        value: weightedRandom(weights) // 0-4 range (0-indexed)
      }

    case 'nps':
      // Weighted toward promoters (9-10)
      // Return object with value field
      return {
        value: weightedRandom([2, 2, 3, 4, 5, 6, 8, 10, 12, 18, 20])
      }

    case 'single_line_text':
      const names = ['Alex', 'Jordan', 'Morgan', 'Casey', 'Riley', 'Taylor', null]
      return randomChoice(names)

    case 'multi_line_text':
      const feedback = [
        'The designs looked professional and modern.',
        'I liked the color scheme but found the layout confusing.',
        'Clean and minimal. Easy to understand.',
        'Very polished! The typography really stands out.',
        null,
      ]
      return randomChoice(feedback)

    case 'matrix':
      const matrixResponse: Record<string, string> = {}
      ;(config.rows as Array<{ id: string }>).forEach((row) => {
        matrixResponse[row.id] = randomChoice(config.columns as Array<{ id: string }>).id
      })
      return matrixResponse

    case 'ranking':
      const items = config.items.map((item: any) => item.id)
      return items.sort(() => Math.random() - 0.5)

    default:
      return null
  }
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

async function main() {
  console.log('🔧 FIXING STUDY FLOW QUESTIONS\n')

  // Step 1: Delete old responses
  console.log('Step 1: Deleting old responses...')
  const { error: deleteResponsesError } = await supabase
    .from('study_flow_responses')
    .delete()
    .eq('study_id', STUDY_ID)

  if (deleteResponsesError) {
    console.error('Failed to delete responses:', deleteResponsesError)
    process.exit(1)
  }
  console.log('  ✓ Deleted old responses')

  // Step 2: Delete old questions
  console.log('\nStep 2: Deleting old questions...')
  const { error: deleteQuestionsError } = await supabase
    .from('study_flow_questions')
    .delete()
    .eq('study_id', STUDY_ID)

  if (deleteQuestionsError) {
    console.error('Failed to delete questions:', deleteQuestionsError)
    process.exit(1)
  }
  console.log('  ✓ Deleted old questions')

  // Step 3: Insert new questions with correct types
  console.log('\nStep 3: Creating questions with correct types...')
  const allQuestions = [...SCREENING_QUESTIONS, ...PRE_STUDY_QUESTIONS, ...POST_STUDY_QUESTIONS]

  const questionInserts = allQuestions.map(q => ({
    id: generateId(),
    study_id: STUDY_ID,
    section: q.section,
    question_type: q.question_type,
    question_text: q.question_text,
    question_text_html: null,
    is_required: q.is_required,
    config: q.config,
    position: q.position,
    created_at: new Date().toISOString(),
  }))

  const { data: insertedQuestions, error: insertError } = await supabase
    .from('study_flow_questions')
    .insert(questionInserts)
    .select()

  if (insertError) {
    console.error('Failed to insert questions:', insertError)
    process.exit(1)
  }

  console.log(`  ✓ Created ${insertedQuestions.length} questions`)
  console.log(`    - Screening: ${SCREENING_QUESTIONS.length}`)
  console.log(`    - Pre-study: ${PRE_STUDY_QUESTIONS.length}`)
  console.log(`    - Post-study: ${POST_STUDY_QUESTIONS.length}`)

  // Step 4: Get completed participants
  console.log('\nStep 4: Fetching participants...')
  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select('id, status')
    .eq('study_id', STUDY_ID)
    .eq('status', 'completed')

  if (participantsError || !participants) {
    console.error('Failed to fetch participants:', participantsError)
    process.exit(1)
  }

  console.log(`  ✓ Found ${participants.length} completed participants`)

  // Step 5: Generate responses
  console.log('\nStep 5: Generating responses...')
  const responseInserts = []

  for (const participant of participants) {
    for (const question of insertedQuestions) {
      // 99.7% completion rate (skip ~3 optional responses per 1000)
      const shouldSkip = !question.is_required && Math.random() < 0.003

      if (!shouldSkip) {
        const responseValue = generateResponse(question.question_type, question.config)

        // Only insert if we have a valid response (not null)
        if (responseValue !== null) {
          responseInserts.push({
            id: generateId(),
            participant_id: participant.id,
            study_id: STUDY_ID,
            question_id: question.id,
            response_value: responseValue,
            created_at: new Date(
              Date.now() - randomInt(1, 30) * 24 * 60 * 60 * 1000
            ).toISOString(),
          })
        }
      }
    }
  }

  // Insert in batches of 500
  const batchSize = 500
  for (let i = 0; i < responseInserts.length; i += batchSize) {
    const batch = responseInserts.slice(i, i + batchSize)
    const { error: batchError } = await supabase
      .from('study_flow_responses')
      .insert(batch)

    if (batchError) {
      console.error(`Failed to insert batch ${i / batchSize + 1}:`, batchError)
      process.exit(1)
    }
  }

  const totalPossibleResponses = participants.length * insertedQuestions.length
  const coveragePercent = ((responseInserts.length / totalPossibleResponses) * 100).toFixed(1)

  console.log(`  ✓ Generated ${responseInserts.length} responses`)
  console.log(`    Coverage: ${coveragePercent}%`)

  console.log('\n✨ QUESTIONS FIXED!')
  console.log('\nSummary:')
  console.log(`  Questions: ${insertedQuestions.length} total`)
  console.log(`  Responses: ${responseInserts.length} total`)
  console.log(`  Coverage: ${coveragePercent}%`)
  console.log('\n✅ The Questionnaire tab should now display visualizations!')
}

main()
