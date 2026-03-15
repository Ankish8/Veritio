/**
 * Seed Script for "Sample FIT" First Impression Study
 *
 * Seeds 100 participants with realistic data for study 8c8bdd86-26a2-4d7d-a18c-ba0b262b7fb3
 *
 * This study uses:
 * - random_single design assignment (each participant sees ONE design)
 * - Shared questions across designs (5 questions: yes_no, opinion_scale x2, text, multiple_choice)
 * - Pre-study questions (3 questions: radio, checkbox, nps)
 * - Post-study questions (5 questions: text, opinion_scale, matrix, ranking, radio)
 * - 2 designs: Monkey and Dog (50/50 weight)
 *
 * Run with: npx tsx scripts/seed/first-impression/seed-sample-fit.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  process.stderr.write('Missing environment variables\n')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// =============================================================================
// STUDY CONFIG
// =============================================================================

const STUDY_ID = '8c8bdd86-26a2-4d7d-a18c-ba0b262b7fb3'
const PROJECT_ID = 'ea685d0e-9972-4a1f-b647-92e4dbe7f356'

const DESIGN_MONKEY_ID = '0d211a22-558d-4187-8a64-308d3b8a902a'
const DESIGN_DOG_ID = '16d5205c-c535-4ffd-8da4-fd9eefc229ad'
const DESIGNS = [DESIGN_MONKEY_ID, DESIGN_DOG_ID]

const EXPOSURE_DURATION_MS = 5000
const COUNTDOWN_DURATION_MS = 3000

// Shared design question IDs (must match what we inserted in the designs JSONB)
const SHARED_QUESTIONS = [
  { id: 'q1-yes-no-appeal', type: 'yes_no' },
  { id: 'q2-opinion-visual-quality', type: 'opinion_scale' },
  { id: 'q3-text-first-word', type: 'single_line_text' },
  { id: 'q4-multi-choice-elements', type: 'multiple_choice' },
  { id: 'q5-opinion-first-impression', type: 'opinion_scale' },
]

// Study flow question IDs (must match what we inserted in study_flow_questions)
const FLOW_QUESTIONS = {
  pre_study: [
    { id: 'a1000001-0000-0000-0000-000000000001', type: 'multiple_choice', mode: 'radio', options: ['Expert – I work in design professionally', 'Advanced – I have significant experience', 'Intermediate – I have some knowledge', 'Beginner – I know very little', 'No experience at all'] },
    { id: 'a1000001-0000-0000-0000-000000000002', type: 'multiple_choice', mode: 'checkbox', options: ['Social media', 'News articles', 'E-commerce / Shopping', 'Video streaming', 'Educational content', 'Gaming'] },
    { id: 'a1000001-0000-0000-0000-000000000003', type: 'nps' },
  ],
  post_study: [
    { id: 'a1000001-0000-0000-0000-000000000004', type: 'multi_line_text' },
    { id: 'a1000001-0000-0000-0000-000000000005', type: 'opinion_scale' },
    { id: 'a1000001-0000-0000-0000-000000000006', type: 'matrix', rows: ['Visual Appeal', 'Clarity of Message', 'Professionalism', 'Creativity', 'Trustworthiness'], columns: ['Poor', 'Below Average', 'Average', 'Good', 'Excellent'] },
    { id: 'a1000001-0000-0000-0000-000000000007', type: 'ranking', items: ['Color scheme', 'Typography', 'Layout & spacing', 'Image quality', 'Brand consistency'] },
    { id: 'a1000001-0000-0000-0000-000000000008', type: 'multiple_choice', mode: 'radio', options: ['Definitely yes', 'Probably yes', 'Not sure', 'Probably not', 'Definitely not'] },
  ],
}

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
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// =============================================================================
// NAME & DEMOGRAPHIC DATA
// =============================================================================

const firstNames = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'James',
  'Mia', 'Benjamin', 'Charlotte', 'Lucas', 'Amelia', 'Henry', 'Harper', 'Alexander', 'Evelyn', 'Daniel',
  'Abigail', 'Michael', 'Emily', 'Elijah', 'Elizabeth', 'William', 'Sofia', 'Sebastian', 'Avery', 'Jack',
  'Chloe', 'Owen', 'Aria', 'Jacob', 'Lily', 'Theodore', 'Zoey', 'Aiden', 'Grace', 'Matthew',
  'Scarlett', 'Leo', 'Victoria', 'Oliver', 'Madison', 'David', 'Hannah', 'Joseph', 'Nora', 'Samuel',
  'Priya', 'Raj', 'Yuki', 'Chen', 'Fatima', 'Ahmed', 'Mei', 'Kenji', 'Ines', 'Lars',
]

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee',
  'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'King', 'Wright', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Hill', 'Campbell',
  'Patel', 'Nakamura', 'Johansson', 'Kim', 'Muller', 'Fischer', 'Dubois', 'Costa', 'Singh', 'Zhang',
]

const countries = ['US', 'US', 'US', 'UK', 'UK', 'CA', 'CA', 'AU', 'DE', 'FR', 'NL', 'SE', 'BR', 'IN', 'JP']
const cities: Record<string, string[]> = {
  US: ['New York', 'San Francisco', 'Chicago', 'Los Angeles', 'Austin', 'Seattle', 'Boston', 'Denver'],
  UK: ['London', 'Manchester', 'Edinburgh', 'Birmingham', 'Bristol'],
  CA: ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
  AU: ['Sydney', 'Melbourne', 'Brisbane'],
  DE: ['Berlin', 'Munich', 'Hamburg'],
  FR: ['Paris', 'Lyon', 'Marseille'],
  NL: ['Amsterdam', 'Rotterdam'],
  SE: ['Stockholm', 'Gothenburg'],
  BR: ['Sao Paulo', 'Rio de Janeiro'],
  IN: ['Mumbai', 'Bangalore', 'Delhi'],
  JP: ['Tokyo', 'Osaka'],
}
const regions: Record<string, string[]> = {
  US: ['New York', 'California', 'Illinois', 'Texas', 'Washington', 'Massachusetts', 'Colorado'],
  UK: ['England', 'Scotland', 'Wales'],
  CA: ['Ontario', 'British Columbia', 'Quebec', 'Alberta'],
  AU: ['New South Wales', 'Victoria', 'Queensland'],
  DE: ['Bavaria', 'Berlin', 'Hamburg'],
  FR: ['Ile-de-France', 'Auvergne-Rhone-Alpes'],
  NL: ['North Holland', 'South Holland'],
  SE: ['Stockholm County', 'Vastra Gotaland'],
  BR: ['Sao Paulo', 'Rio de Janeiro'],
  IN: ['Maharashtra', 'Karnataka', 'Delhi'],
  JP: ['Tokyo', 'Osaka'],
}

const devices = ['desktop', 'desktop', 'desktop', 'tablet', 'mobile', 'mobile']
const browsers = ['Chrome', 'Chrome', 'Chrome', 'Safari', 'Safari', 'Firefox', 'Edge', 'Brave']
const operatingSystems = ['Windows', 'Windows', 'macOS', 'macOS', 'iOS', 'Android', 'Linux']

// =============================================================================
// FIRST WORD RESPONSES (for the "first word that comes to mind" question)
// =============================================================================

const firstWordsMonkey: string[] = [
  'fun', 'playful', 'colorful', 'energetic', 'creative', 'bold', 'lively', 'dynamic',
  'vibrant', 'cool', 'modern', 'quirky', 'amusing', 'eye-catching', 'bright',
  'interesting', 'unique', 'youthful', 'graphic', 'artistic', 'wild', 'exciting',
  'cartoon', 'loud', 'catchy', 'engaging', 'whimsical', 'fresh', 'striking', 'animated',
]

const firstWordsDog: string[] = [
  'cute', 'professional', 'artistic', 'clean', 'elegant', 'detailed', 'beautiful',
  'polished', 'creative', 'refined', 'illustrative', 'sophisticated', 'quality',
  'vector', 'sharp', 'editable', 'premium', 'skillful', 'impressive', 'crisp',
  'stylish', 'intricate', 'diverse', 'well-made', 'versatile', 'expressive', 'modern',
  'distinguished', 'confident', 'charismatic',
]

// =============================================================================
// TEXT FEEDBACK RESPONSES (for post-study multi_line_text)
// =============================================================================

const feedbacksMonkey: string[] = [
  'The monkey design is really eye-catching with its bold colors. It grabs attention immediately and feels very energetic.',
  'I liked the contrast between raster and vector styles shown in the design. It\'s educational and visually interesting.',
  'Very playful and fun design. The monkey character is memorable and the "Learn More" button is clear.',
  'The colors are vibrant but maybe a bit too loud for a professional setting. Works well for creative/casual contexts though.',
  'Great design that shows the difference between file formats clearly. The monkey adds personality.',
  'The yellow background really pops. I think this would work well for a design tutorial or educational content.',
  'It feels very graphic-design focused, which makes sense for its purpose. The composition is balanced.',
  'Interesting concept but slightly busy. There\'s a lot going on - might benefit from more whitespace.',
  'Love the character design! The monkey is charming and makes the technical content more approachable.',
  'The design is informative and visually appealing. Good use of contrast between different graphic styles.',
  'Bold and attention-grabbing. The design clearly communicates its purpose about graphic file formats.',
  'The vibrant color palette makes it stand out. It feels modern and suited for a younger audience.',
  'I appreciate the creativity. The monkey character makes what could be boring content feel engaging.',
  'Slightly overwhelming at first glance, but the message comes through. Good for educational purposes.',
  'The design effectively uses visual hierarchy. The "Learn More" CTA is well-placed.',
]

const feedbacksDog: string[] = [
  'The dog illustrations are beautifully done. Very professional and showcase strong artistic skill.',
  'Clean, elegant design that highlights the vector art style. The dogs look very well-crafted.',
  'I love the variety of dog breeds shown. The illustrations have great personality and detail.',
  'Professional and polished. This looks like it could be from a premium design marketplace.',
  'The vector style is crisp and modern. Each dog has its own character which is impressive.',
  'Beautiful illustrations with excellent line work. This feels very premium and high-quality.',
  'The design showcases versatility in illustration styles. Very impressive craftsmanship.',
  'Clean background helps the illustrations pop. The dogs are expressive and well-designed.',
  'This feels like a professional portfolio piece. The quality of the illustrations is outstanding.',
  'The "Editable Vectors" messaging is clear and the illustrations back up that claim perfectly.',
  'Great composition. The two dog styles shown give a sense of the range available.',
  'The design feels trustworthy and professional. I would consider purchasing these vectors.',
  'Minimalist yet impactful. The illustrations speak for themselves without needing extra decoration.',
  'High-quality vector artwork. The dogs have real personality and the style is contemporary.',
  'Very appealing design. It communicates quality and professionalism at a glance.',
]

// =============================================================================
// RESPONSE GENERATORS
// =============================================================================

function generateDesignQuestionResponse(questionType: string, questionId: string, designId: string): unknown {
  switch (questionType) {
    case 'yes_no': {
      // Monkey: 70% yes, Dog: 80% yes (Dog is more "polished")
      const yesRate = designId === DESIGN_MONKEY_ID ? 0.70 : 0.80
      return Math.random() < yesRate
    }
    case 'opinion_scale': {
      if (questionId === 'q2-opinion-visual-quality') {
        // Stars 1-5, weighted toward 3-5. Dog slightly higher on average
        const weights = designId === DESIGN_MONKEY_ID
          ? [3, 8, 22, 38, 29] // avg ~3.8
          : [2, 5, 18, 35, 40]  // avg ~4.1
        return weightedRandom(weights) + 1
      }
      if (questionId === 'q5-opinion-first-impression') {
        // Emotions 1-5
        const weights = designId === DESIGN_MONKEY_ID
          ? [4, 10, 25, 35, 26] // avg ~3.7
          : [2, 7, 20, 38, 33]  // avg ~3.9
        return weightedRandom(weights) + 1
      }
      return weightedRandom([5, 10, 25, 35, 25]) + 1
    }
    case 'single_line_text': {
      const words = designId === DESIGN_MONKEY_ID ? firstWordsMonkey : firstWordsDog
      return randomChoice(words)
    }
    case 'multiple_choice': {
      // Checkbox mode: select 1-4 options
      const allOptions = ['Colors', 'Typography', 'Layout', 'Images / Graphics', 'Text content', 'Overall composition']
      // Weight certain options higher per design
      let weighted: string[]
      if (designId === DESIGN_MONKEY_ID) {
        weighted = ['Colors', 'Colors', 'Images / Graphics', 'Images / Graphics', 'Text content', 'Layout', 'Overall composition', 'Typography']
      } else {
        weighted = ['Images / Graphics', 'Images / Graphics', 'Images / Graphics', 'Typography', 'Layout', 'Colors', 'Overall composition', 'Text content']
      }
      const numSelections = weightedRandom([5, 30, 40, 20, 5]) + 1 // 1-5 selections
      const selected = new Set<string>()
      for (let i = 0; i < numSelections && selected.size < allOptions.length; i++) {
        selected.add(randomChoice(weighted))
      }
      return Array.from(selected)
    }
    default:
      return null
  }
}

function generateFlowQuestionResponse(question: typeof FLOW_QUESTIONS.pre_study[0] | typeof FLOW_QUESTIONS.post_study[0]): unknown {
  switch (question.type) {
    case 'multiple_choice': {
      const q = question as any
      if (q.mode === 'radio') {
        // Weighted selection - favor middle options
        const opts = q.options as string[]
        if (opts.length === 5) {
          // For design familiarity: skew toward intermediate/beginner
          if (question.id.endsWith('0001')) {
            return opts[weightedRandom([5, 15, 40, 30, 10])]
          }
          // For trust question: skew toward positive
          if (question.id.endsWith('0008')) {
            return opts[weightedRandom([25, 40, 20, 10, 5])]
          }
          return opts[weightedRandom([10, 25, 35, 20, 10])]
        }
        return randomChoice(opts)
      }
      if (q.mode === 'checkbox') {
        const opts = q.options as string[]
        const numSelections = weightedRandom([5, 25, 35, 25, 8, 2]) + 1
        const selected = new Set<string>()
        for (let i = 0; i < numSelections && selected.size < opts.length; i++) {
          selected.add(randomChoice(opts))
        }
        return Array.from(selected)
      }
      return null
    }
    case 'nps': {
      // NPS 0-10, weighted toward promoters
      return weightedRandom([2, 2, 3, 4, 5, 8, 10, 14, 18, 18, 16])
    }
    case 'multi_line_text': {
      // Will be overridden per-design in the caller
      return 'Good design overall.'
    }
    case 'opinion_scale': {
      // 1-5, weighted positive
      return weightedRandom([4, 8, 22, 38, 28]) + 1
    }
    case 'matrix': {
      const q = question as any
      const matrixResponse: Record<string, string> = {}
      for (const row of q.rows) {
        // Weight toward Good/Excellent
        matrixResponse[row] = q.columns[weightedRandom([3, 8, 22, 38, 29])]
      }
      return matrixResponse
    }
    case 'ranking': {
      const q = question as any
      return shuffleArray(q.items)
    }
    default:
      return null
  }
}

// =============================================================================
// PARTICIPANT GENERATION
// =============================================================================

function generateParticipant(index: number, status: 'completed' | 'abandoned' | 'in_progress') {
  const firstName = randomChoice(firstNames)
  const lastName = randomChoice(lastNames)
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`
  const country = randomChoice(countries)

  // Spread completions over the last 14 days for realistic time distribution
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() - randomInt(1, 14))
  baseDate.setHours(randomInt(6, 23), randomInt(0, 59), randomInt(0, 59))

  const totalStudyTimeMs = status === 'completed'
    ? randomInt(45000, 240000) // 45s to 4min for completed
    : randomInt(5000, 60000)   // 5s to 60s for abandoned/in_progress

  const completedAt = status === 'completed'
    ? new Date(baseDate.getTime() + totalStudyTimeMs).toISOString()
    : null

  return {
    id: generateId(),
    study_id: STUDY_ID,
    session_token: `fit_${Date.now()}_${index}_${randomInt(1000, 9999)}`,
    status,
    started_at: baseDate.toISOString(),
    completed_at: completedAt,
    identifier_type: 'anonymous' as const,
    identifier_value: null,
    screening_result: null,
    country,
    city: randomChoice(cities[country] || ['Unknown']),
    region: randomChoice(regions[country] || ['Unknown']),
    source_app: 'optimal',
    metadata: {
      email,
      firstName,
      lastName,
      device: randomChoice(devices),
      browser: randomChoice(browsers),
      os: randomChoice(operatingSystems),
      userAgent: `Mozilla/5.0 (${randomChoice(['Windows NT 10.0', 'Macintosh; Intel Mac OS X 10_15_7', 'X11; Linux x86_64', 'iPhone; CPU iPhone OS 17_0'])})`,
    },
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const log = (msg: string) => process.stdout.write(msg + '\n')
  log('Starting Sample FIT seed...\n')

  // Verify study exists
  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, title, status, settings')
    .eq('id', STUDY_ID)
    .single()

  if (studyError || !study) {
    log('Study not found: ' + STUDY_ID)
    process.exit(1)
  }
  log(`Found study: "${study.title}" (${study.status})`)

  // Verify designs
  const { data: designs } = await (supabase as any)
    .from('first_impression_designs')
    .select('id, name, is_practice, weight, questions')
    .eq('study_id', STUDY_ID)
    .order('position')

  if (!designs || designs.length === 0) {
    log('No designs found')
    process.exit(1)
  }
  log(`Found ${designs.length} designs: ${designs.map((d: any) => d.name).join(', ')}`)
  log(`Questions per design: ${designs[0].questions?.length || 0}`)

  // Generate participants
  const TOTAL = 100
  const COMPLETED = 88
  const ABANDONED = 9
  const IN_PROGRESS = 3

  log(`\nGenerating ${TOTAL} participants...`)

  const participants: ReturnType<typeof generateParticipant>[] = []
  for (let i = 0; i < COMPLETED; i++) participants.push(generateParticipant(i, 'completed'))
  for (let i = 0; i < ABANDONED; i++) participants.push(generateParticipant(COMPLETED + i, 'abandoned'))
  for (let i = 0; i < IN_PROGRESS; i++) participants.push(generateParticipant(COMPLETED + ABANDONED + i, 'in_progress'))
  participants.sort(() => Math.random() - 0.5)

  // Insert participants
  const { error: partError } = await supabase.from('participants').insert(participants)
  if (partError) {
    log('Failed to insert participants: ' + partError.message)
    process.exit(1)
  }
  log(`Inserted ${participants.length} participants`)

  // Generate sessions, exposures, responses
  const allSessions: any[] = []
  const allExposures: any[] = []
  const allFiResponses: any[] = []
  const allFlowResponses: any[] = []

  const viewports = [
    { width: 1920, height: 1080, device: 'desktop' },
    { width: 1440, height: 900, device: 'desktop' },
    { width: 1366, height: 768, device: 'desktop' },
    { width: 2560, height: 1440, device: 'desktop' },
    { width: 768, height: 1024, device: 'tablet' },
    { width: 1024, height: 768, device: 'tablet' },
    { width: 390, height: 844, device: 'mobile' },
    { width: 375, height: 812, device: 'mobile' },
    { width: 414, height: 896, device: 'mobile' },
  ]

  for (const participant of participants) {
    const startTs = new Date(participant.started_at).getTime()
    const viewport = randomChoice(viewports)

    // random_single mode: each participant gets ONE design
    const assignedDesignId = randomChoice(DESIGNS)

    // Create session
    const sessionId = generateId()
    const session = {
      id: sessionId,
      participant_id: participant.id,
      study_id: STUDY_ID,
      assignment_mode: 'random_single',
      assigned_design_id: assignedDesignId,
      design_sequence: [assignedDesignId],
      device_type: viewport.device,
      viewport_width: viewport.width,
      viewport_height: viewport.height,
      started_at: participant.started_at,
      completed_at: participant.completed_at,
      total_time_ms: participant.completed_at
        ? new Date(participant.completed_at).getTime() - startTs
        : null,
    }
    allSessions.push(session)

    // Abandoned participants with very early exit might not even see the design
    if (participant.status === 'abandoned' && Math.random() < 0.3) {
      continue // 30% of abandoned left before seeing the design
    }

    // Generate exposure
    const exposureId = generateId()
    const countdownStart = startTs + randomInt(2000, 5000) // pre-study time
    const exposureStart = countdownStart + COUNTDOWN_DURATION_MS
    const baseVariance = randomInt(-300, 300)
    const actualDisplayMs = Math.max(EXPOSURE_DURATION_MS + baseVariance, 4500)
    const exposureEnd = exposureStart + actualDisplayMs

    // For abandoned, some might leave during the exposure
    const abandonedDuringExposure = participant.status === 'abandoned' && Math.random() < 0.4
    const abandonedDuringQuestions = participant.status === 'abandoned' && !abandonedDuringExposure

    const questionsStartedAt = abandonedDuringExposure ? null : exposureEnd + randomInt(100, 400)
    const questionTime = randomInt(8000, 45000) // 8-45 seconds to answer 5 questions
    const questionsCompletedAt = (participant.status === 'completed' && questionsStartedAt)
      ? questionsStartedAt + questionTime
      : null

    const exposure = {
      id: exposureId,
      session_id: sessionId,
      participant_id: participant.id,
      study_id: STUDY_ID,
      design_id: assignedDesignId,
      exposure_sequence: 1,
      configured_duration_ms: EXPOSURE_DURATION_MS,
      actual_display_ms: abandonedDuringExposure ? randomInt(500, actualDisplayMs) : actualDisplayMs,
      countdown_duration_ms: COUNTDOWN_DURATION_MS,
      countdown_started_at: new Date(countdownStart).toISOString(),
      exposure_started_at: new Date(exposureStart).toISOString(),
      exposure_ended_at: abandonedDuringExposure ? null : new Date(exposureEnd).toISOString(),
      questions_started_at: questionsStartedAt ? new Date(questionsStartedAt).toISOString() : null,
      questions_completed_at: questionsCompletedAt ? new Date(questionsCompletedAt).toISOString() : null,
      viewport_width: viewport.width,
      viewport_height: viewport.height,
      image_rendered_width: Math.min(viewport.width - 40, 1200),
      image_rendered_height: Math.round(Math.min(viewport.width - 40, 1200) * (1080 / 1080)),
      used_mobile_image: viewport.width < 768,
    }
    allExposures.push(exposure)

    // Generate design question responses (only for completed + those who reached questions)
    if (questionsStartedAt && (participant.status === 'completed' || !abandonedDuringQuestions || Math.random() < 0.5)) {
      const numQuestionsAnswered = participant.status === 'completed'
        ? SHARED_QUESTIONS.length
        : randomInt(1, SHARED_QUESTIONS.length - 1)

      for (let qi = 0; qi < numQuestionsAnswered; qi++) {
        const q = SHARED_QUESTIONS[qi]
        const perQuestionTime = questionTime / SHARED_QUESTIONS.length
        const qShownAt = questionsStartedAt + qi * perQuestionTime
        const timeToFirstInteraction = randomInt(200, Math.min(1500, perQuestionTime / 2))
        const qCompletedAt = qShownAt + perQuestionTime

        allFiResponses.push({
          id: generateId(),
          exposure_id: exposureId,
          session_id: sessionId,
          participant_id: participant.id,
          study_id: STUDY_ID,
          design_id: assignedDesignId,
          question_id: q.id,
          response_value: generateDesignQuestionResponse(q.type, q.id, assignedDesignId),
          response_time_ms: Math.round(perQuestionTime),
          time_to_first_interaction_ms: timeToFirstInteraction,
          time_to_completion_ms: Math.round(perQuestionTime - timeToFirstInteraction),
          question_shown_at: new Date(qShownAt).toISOString(),
          first_interaction_at: new Date(qShownAt + timeToFirstInteraction).toISOString(),
          submitted_at: new Date(qCompletedAt).toISOString(),
        })
      }
    }

    // Generate study flow responses (only for completed participants)
    if (participant.status === 'completed') {
      // Pre-study questions
      for (const q of FLOW_QUESTIONS.pre_study) {
        allFlowResponses.push({
          participant_id: participant.id,
          study_id: STUDY_ID,
          question_id: q.id,
          response_value: generateFlowQuestionResponse(q),
          response_time_ms: randomInt(2000, 12000),
        })
      }

      // Post-study questions
      for (const q of FLOW_QUESTIONS.post_study) {
        let responseValue = generateFlowQuestionResponse(q)

        // Override multi_line_text with design-specific feedback
        if (q.type === 'multi_line_text') {
          const feedbacks = assignedDesignId === DESIGN_MONKEY_ID ? feedbacksMonkey : feedbacksDog
          responseValue = randomChoice(feedbacks)
        }

        allFlowResponses.push({
          participant_id: participant.id,
          study_id: STUDY_ID,
          question_id: q.id,
          response_value: responseValue,
          response_time_ms: randomInt(2000, 20000),
        })
      }
    }
  }

  // Insert sessions
  log(`\nInserting ${allSessions.length} sessions...`)
  for (let i = 0; i < allSessions.length; i += 50) {
    const batch = allSessions.slice(i, i + 50)
    const { error } = await (supabase as any).from('first_impression_sessions').insert(batch)
    if (error) log(`  Session batch error: ${error.message}`)
  }
  log('Sessions done')

  // Insert exposures
  log(`Inserting ${allExposures.length} exposures...`)
  for (let i = 0; i < allExposures.length; i += 50) {
    const batch = allExposures.slice(i, i + 50)
    const { error } = await (supabase as any).from('first_impression_exposures').insert(batch)
    if (error) log(`  Exposure batch error: ${error.message}`)
  }
  log('Exposures done')

  // Insert first impression responses
  log(`Inserting ${allFiResponses.length} first impression responses...`)
  for (let i = 0; i < allFiResponses.length; i += 50) {
    const batch = allFiResponses.slice(i, i + 50)
    const { error } = await (supabase as any).from('first_impression_responses').insert(batch)
    if (error) log(`  FI response batch error: ${error.message}`)
  }
  log('FI responses done')

  // Insert study flow responses
  log(`Inserting ${allFlowResponses.length} study flow responses...`)
  for (let i = 0; i < allFlowResponses.length; i += 50) {
    const batch = allFlowResponses.slice(i, i + 50)
    const { error } = await supabase.from('study_flow_responses').insert(batch)
    if (error) log(`  Flow response batch error: ${error.message}`)
  }
  log('Flow responses done')

  // Summary stats
  const _completedParticipants = participants.filter(p => p.status === 'completed')
  const monkeyParticipants = allSessions.filter(s => s.assigned_design_id === DESIGN_MONKEY_ID).length
  const dogParticipants = allSessions.filter(s => s.assigned_design_id === DESIGN_DOG_ID).length

  const yesNoResponses = allFiResponses.filter(r => r.question_id === 'q1-yes-no-appeal')
  const yesCount = yesNoResponses.filter(r => r.response_value === true).length
  const yesRate = yesNoResponses.length > 0 ? ((yesCount / yesNoResponses.length) * 100).toFixed(1) : '0'

  const visualQualityResponses = allFiResponses.filter(r => r.question_id === 'q2-opinion-visual-quality')
  const avgVisualQuality = visualQualityResponses.length > 0
    ? (visualQualityResponses.reduce((sum, r) => sum + (r.response_value as number), 0) / visualQualityResponses.length).toFixed(2)
    : '0'

  log('\n' + '='.repeat(60))
  log('SEED COMPLETE')
  log('='.repeat(60))
  log(`
Study: "${study.title}" (${study.status})
Project: ${PROJECT_ID}

Design Assignment: random_single (each participant sees 1 design)
  Monkey: ${monkeyParticipants} participants
  Dog: ${dogParticipants} participants

Participants: ${TOTAL} total
  Completed: ${COMPLETED}
  Abandoned: ${ABANDONED}
  In Progress: ${IN_PROGRESS}

Data Generated:
  Sessions: ${allSessions.length}
  Exposures: ${allExposures.length}
  Design Responses: ${allFiResponses.length}
  Study Flow Responses: ${allFlowResponses.length}

Design Question Types:
  yes_no: "Did you find this design visually appealing?" (${yesRate}% yes)
  opinion_scale (stars): "Rate the visual quality" (avg ${avgVisualQuality}/5)
  single_line_text: "First word that comes to mind"
  multiple_choice (checkbox): "Which elements caught your attention?"
  opinion_scale (emoji): "Overall first impression"

Study Flow Questions:
  Pre-study: design familiarity (radio), content engagement (checkbox), NPS
  Post-study: open feedback (text), message clarity (scale), design aspects (matrix), quality ranking, trust (radio)

Results URL:
  http://localhost:4001/projects/${PROJECT_ID}/studies/${STUDY_ID}/results
`)
}

main().catch(e => {
  process.stderr.write('Error: ' + e.message + '\n')
  process.exit(1)
})
