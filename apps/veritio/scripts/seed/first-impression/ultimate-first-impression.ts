/**
 * ULTIMATE Comprehensive First Impression Test Seed Script
 * Seeds participant data for an EXISTING first impression study.
 *
 * IMPORTANT: This script uses the existing "Ultimate First Impression Study"
 * which already has designs and questions configured. It only seeds:
 * - 100 participants with varied demographics
 * - Sessions, exposures, and responses for each participant
 *
 * FEATURES COVERED:
 * - Sequential_all design assignment mode (all designs shown to each participant)
 * - Practice round (first design is marked as practice)
 * - Various question types (yes_no, opinion_scale)
 * - Realistic timing and exposure data
 * - Focus/blur events during exposure
 * - Completed vs abandoned participants
 * - Varied demographic data
 *
 * Run with: npx tsx scripts/seed/first-impression/ultimate-first-impression.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  process.stderr.write('❌ Missing environment variables\n')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// =============================================================================
// EXISTING STUDY CONFIGURATION
// These IDs are from the actual "Ultimate First Impression Study" in the database
// =============================================================================

const STUDY_ID = 'c44a8ead-221d-4d93-9c39-a5c102a6a03b'
const PROJECT_ID = process.env.SEED_PROJECT_ID || generateId()
const SHARE_CODE = 'ZXuGsbPkHr'

// Design IDs (from the existing study)
const DESIGN_1_ID = '16ec0285-9ada-42a2-b373-d582df0e64fc' // Practice design
const DESIGN_2_ID = '1bdad4db-732b-4630-b0ac-ef4a039b732b'
const DESIGN_3_ID = '0788d914-79c3-47bf-a473-b36b5ec2eab9'

// Question IDs (embedded in each design)
const QUESTION_1_ID = '8e5590bf-3e1f-4e8a-af86-55debba4cf65' // yes_no (emotions)
const QUESTION_2_ID = 'f4e8ee59-1a07-4392-882c-9f032ae3a1c8' // opinion_scale (stars, 5-point)
const QUESTION_3_ID = 'e0592c41-e413-4cfd-82e4-e9c8ef0b9501' // opinion_scale (emotions, 5-point)

// Exposure settings from the study
const EXPOSURE_DURATION_MS = 5000
const COUNTDOWN_DURATION_MS = 3000

// Design order (sequential_all mode)
const DESIGN_ORDER = [DESIGN_1_ID, DESIGN_2_ID, DESIGN_3_ID]

// Question mapping by design
const QUESTIONS_BY_DESIGN: Record<string, { id: string; type: string }> = {
  [DESIGN_1_ID]: { id: QUESTION_1_ID, type: 'yes_no' },
  [DESIGN_2_ID]: { id: QUESTION_2_ID, type: 'opinion_scale' },
  [DESIGN_3_ID]: { id: QUESTION_3_ID, type: 'opinion_scale' },
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

// =============================================================================
// PARTICIPANT DATA GENERATION
// =============================================================================

const firstNames = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'James',
  'Mia', 'Benjamin', 'Charlotte', 'Lucas', 'Amelia', 'Henry', 'Harper', 'Alexander', 'Evelyn', 'Daniel',
  'Abigail', 'Michael', 'Emily', 'Elijah', 'Elizabeth', 'William', 'Sofia', 'Sebastian', 'Avery', 'Jack',
  'Chloe', 'Owen', 'Aria', 'Jacob', 'Lily', 'Theodore', 'Zoey', 'Aiden', 'Grace', 'Matthew',
  'Scarlett', 'Leo', 'Victoria', 'Oliver', 'Madison', 'David', 'Hannah', 'Joseph', 'Nora', 'Samuel',
]

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee',
  'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'King', 'Wright', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Hill', 'Campbell',
  'Mitchell', 'Roberts', 'Carter', 'Phillips', 'Evans', 'Turner', 'Torres', 'Parker', 'Collins', 'Edwards',
]

const countries = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'NL', 'SE', 'NO', 'DK', 'ES', 'IT', 'JP', 'KR', 'BR']
const devices = ['desktop', 'tablet', 'mobile']
const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Brave']
const operatingSystems = ['Windows', 'macOS', 'iOS', 'Android', 'Linux']

function generateParticipant(index: number, status: 'completed' | 'abandoned' | 'in_progress') {
  const firstName = randomChoice(firstNames)
  const lastName = randomChoice(lastNames)
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() - randomInt(1, 30))

  // Completed participants have both started_at and completed_at
  // Abandoned participants have started_at but null completed_at
  // In-progress participants are also mid-study
  const completedAt = status === 'completed'
    ? new Date(baseDate.getTime() + randomInt(30000, 180000)).toISOString()
    : null

  return {
    id: generateId(),
    study_id: STUDY_ID,
    session_token: `fi_session_${Date.now()}_${index}`,
    status,
    started_at: baseDate.toISOString(),
    completed_at: completedAt,
    identifier_type: 'demographic_profile' as const,
    identifier_value: email,
    screening_result: null, // Screening not enabled in this study
    country: randomChoice(countries),
    metadata: {
      email,
      firstName,
      lastName,
      device: randomChoice(devices),
      browser: randomChoice(browsers),
      os: randomChoice(operatingSystems),
    },
  }
}

// =============================================================================
// SESSION GENERATION
// =============================================================================

interface SessionData {
  id: string
  participant_id: string
  study_id: string
  assignment_mode: 'random_single' | 'sequential_all'
  assigned_design_id: string | null
  design_sequence: string[]
  device_type: 'desktop' | 'tablet' | 'mobile' | null
  viewport_width: number | null
  viewport_height: number | null
  started_at: string
  completed_at: string | null
  total_time_ms: number | null
}

function generateSession(
  participantId: string,
  startedAt: string,
  completedAt: string | null,
  designsShown: string[]
): SessionData {
  const viewports = [
    { width: 1920, height: 1080, device: 'desktop' as const },
    { width: 1440, height: 900, device: 'desktop' as const },
    { width: 1366, height: 768, device: 'desktop' as const },
    { width: 768, height: 1024, device: 'tablet' as const },
    { width: 390, height: 844, device: 'mobile' as const },
  ]
  const viewport = randomChoice(viewports)

  const totalTimeMs = completedAt
    ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
    : null

  return {
    id: generateId(),
    participant_id: participantId,
    study_id: STUDY_ID,
    assignment_mode: 'sequential_all', // This study uses sequential_all mode
    assigned_design_id: null, // Only used for random_single mode
    design_sequence: designsShown,
    device_type: viewport.device,
    viewport_width: viewport.width,
    viewport_height: viewport.height,
    started_at: startedAt,
    completed_at: completedAt,
    total_time_ms: totalTimeMs,
  }
}

// =============================================================================
// EXPOSURE GENERATION
// =============================================================================

interface ExposureData {
  id: string
  session_id: string
  participant_id: string
  study_id: string
  design_id: string
  exposure_sequence: number
  configured_duration_ms: number
  actual_display_ms: number
  countdown_duration_ms: number
  countdown_started_at: string
  exposure_started_at: string
  exposure_ended_at: string
  questions_started_at: string | null
  questions_completed_at: string | null
  viewport_width: number
  viewport_height: number
  image_rendered_width: number | null
  image_rendered_height: number | null
  used_mobile_image: boolean
}

function generateExposure(
  sessionId: string,
  participantId: string,
  designId: string,
  exposureSequence: number,
  baseTimestamp: number,
  isPractice: boolean,
  viewport: { width: number; height: number }
): { exposure: ExposureData; endTimestamp: number } {
  // Add some variance to the actual exposure duration
  // Practice rounds might be slightly longer as users are learning
  const baseVariance = isPractice ? randomInt(-200, 500) : randomInt(-300, 300)
  const actualDisplayMs = Math.max(EXPOSURE_DURATION_MS + baseVariance, EXPOSURE_DURATION_MS - 500)

  const countdownStartedAt = baseTimestamp
  const exposureStartedAt = baseTimestamp + COUNTDOWN_DURATION_MS
  const exposureEndedAt = exposureStartedAt + actualDisplayMs

  // Add question answering time (2-10 seconds)
  const questionTime = randomInt(2000, 10000)
  const questionsStartedAt = exposureEndedAt + randomInt(100, 500)
  const questionsCompletedAt = questionsStartedAt + questionTime

  const useMobileImage = viewport.width < 768

  return {
    exposure: {
      id: generateId(),
      session_id: sessionId,
      participant_id: participantId,
      study_id: STUDY_ID,
      design_id: designId,
      exposure_sequence: exposureSequence,
      configured_duration_ms: EXPOSURE_DURATION_MS,
      actual_display_ms: actualDisplayMs,
      countdown_duration_ms: COUNTDOWN_DURATION_MS,
      countdown_started_at: new Date(countdownStartedAt).toISOString(),
      exposure_started_at: new Date(exposureStartedAt).toISOString(),
      exposure_ended_at: new Date(exposureEndedAt).toISOString(),
      questions_started_at: new Date(questionsStartedAt).toISOString(),
      questions_completed_at: new Date(questionsCompletedAt).toISOString(),
      viewport_width: viewport.width,
      viewport_height: viewport.height,
      image_rendered_width: Math.min(viewport.width - 40, 1200), // Typical rendered size
      image_rendered_height: null, // Depends on aspect ratio
      used_mobile_image: useMobileImage,
    },
    endTimestamp: questionsCompletedAt,
  }
}

// =============================================================================
// RESPONSE GENERATION
// =============================================================================

interface ResponseData {
  id: string
  exposure_id: string
  session_id: string
  participant_id: string
  study_id: string
  design_id: string
  question_id: string
  response_value: unknown
  response_time_ms: number
  time_to_first_interaction_ms: number
  time_to_completion_ms: number
  question_shown_at: string
  first_interaction_at: string
  submitted_at: string
}

function generateQuestionResponse(
  exposureId: string,
  sessionId: string,
  participantId: string,
  designId: string,
  questionInfo: { id: string; type: string },
  questionsStartedAt: number,
  questionsCompletedAt: number
): ResponseData {
  let responseValue: unknown

  if (questionInfo.type === 'yes_no') {
    // yes_no responses are boolean
    // Slightly favor "yes" (true) - 65% yes, 35% no
    responseValue = Math.random() > 0.35
  } else if (questionInfo.type === 'opinion_scale') {
    // opinion_scale responses are numbers 1-5
    // Distribution: more responses in the middle-high range
    // Weights for [1, 2, 3, 4, 5]
    responseValue = weightedRandom([5, 10, 25, 35, 25]) + 1
  } else {
    responseValue = null
  }

  // Calculate timing metrics
  const totalTime = questionsCompletedAt - questionsStartedAt
  const timeToFirstInteraction = randomInt(300, Math.min(2000, totalTime / 2))
  const timeToCompletion = totalTime - timeToFirstInteraction

  const firstInteractionAt = questionsStartedAt + timeToFirstInteraction

  return {
    id: generateId(),
    exposure_id: exposureId,
    session_id: sessionId,
    participant_id: participantId,
    study_id: STUDY_ID,
    design_id: designId,
    question_id: questionInfo.id,
    response_value: responseValue,
    response_time_ms: totalTime,
    time_to_first_interaction_ms: timeToFirstInteraction,
    time_to_completion_ms: timeToCompletion,
    question_shown_at: new Date(questionsStartedAt).toISOString(),
    first_interaction_at: new Date(firstInteractionAt).toISOString(),
    submitted_at: new Date(questionsCompletedAt).toISOString(),
  }
}

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

async function main() {
  const log = (msg: string) => process.stdout.write(msg + '\n')
  log('🚀 Starting Ultimate First Impression Test Seed...\n')

  // First, verify the study exists
  log('🔍 Verifying study exists...')
  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, title, status')
    .eq('id', STUDY_ID)
    .single()

  if (studyError || !study) {
    log('❌ Study not found: ' + STUDY_ID)
    log('   Please ensure the "Ultimate First Impression Study" exists in the database.')
    process.exit(1)
  }
  log(`✅ Found study: "${study.title}" (Status: ${study.status})`)

  // Verify designs exist
  log('\n🔍 Verifying designs...')
  const { data: designs, error: designsError } = await (supabase as any)
    .from('first_impression_designs')
    .select('id, name, is_practice')
    .eq('study_id', STUDY_ID)
    .order('position')

  if (designsError || !designs || designs.length === 0) {
    log('❌ No designs found for study')
    process.exit(1)
  }
  log(`✅ Found ${designs.length} designs:`)
  designs.forEach((d: any) => {
    log(`   - ${d.name} (${d.is_practice ? 'Practice' : 'Regular'})`)
  })

  // Check for existing participants
  log('\n🔍 Checking for existing participants...')
  const { data: existingParticipants } = await supabase
    .from('participants')
    .select('id')
    .eq('study_id', STUDY_ID)
    .limit(1)

  if (existingParticipants && existingParticipants.length > 0) {
    log('⚠️  Warning: Study already has participants.')
    log('   To avoid duplicates, this script will delete existing seed data first.')

    // Delete existing data in reverse order of dependencies
    log('\n🗑️  Deleting existing seed data...')

    await (supabase as any).from('first_impression_responses').delete().eq('study_id', STUDY_ID)
    log('   ✓ Deleted responses')

    await (supabase as any).from('first_impression_exposures').delete().eq('study_id', STUDY_ID)
    log('   ✓ Deleted exposures')

    await (supabase as any).from('first_impression_sessions').delete().eq('study_id', STUDY_ID)
    log('   ✓ Deleted sessions')

    await supabase.from('study_flow_responses').delete().eq('study_id', STUDY_ID)
    log('   ✓ Deleted study flow responses')

    await supabase.from('participants').delete().eq('study_id', STUDY_ID)
    log('   ✓ Deleted participants')
  }

  // Generate participants
  const TOTAL_PARTICIPANTS = 100
  const ABANDONED_COUNT = 8 // 8% abandoned
  const IN_PROGRESS_COUNT = 2 // 2% in progress
  const COMPLETED_COUNT = TOTAL_PARTICIPANTS - ABANDONED_COUNT - IN_PROGRESS_COUNT

  log(`\n👥 Generating ${TOTAL_PARTICIPANTS} participants...`)
  log(`   - ${COMPLETED_COUNT} completed`)
  log(`   - ${ABANDONED_COUNT} abandoned`)
  log(`   - ${IN_PROGRESS_COUNT} in progress`)

  const participants: ReturnType<typeof generateParticipant>[] = []

  // Generate completed participants
  for (let i = 0; i < COMPLETED_COUNT; i++) {
    participants.push(generateParticipant(i, 'completed'))
  }

  // Generate abandoned participants
  for (let i = 0; i < ABANDONED_COUNT; i++) {
    participants.push(generateParticipant(COMPLETED_COUNT + i, 'abandoned'))
  }

  // Generate in-progress participants
  for (let i = 0; i < IN_PROGRESS_COUNT; i++) {
    participants.push(generateParticipant(COMPLETED_COUNT + ABANDONED_COUNT + i, 'in_progress'))
  }

  // Shuffle participants
  participants.sort(() => Math.random() - 0.5)

  // Insert participants
  const { error: partError } = await supabase.from('participants').insert(participants)
  if (partError) {
    log('❌ Failed to insert participants: ' + partError.message)
    process.exit(1)
  }
  log('✅ Inserted participants')

  // Generate sessions, exposures, and responses
  log('\n📊 Generating sessions and responses...')

  const allSessions: SessionData[] = []
  const allExposures: ExposureData[] = []
  const allResponses: ResponseData[] = []

  let completedExposures = 0
  let practiceExposures = 0
  let totalResponses = 0

  for (const participant of participants) {
    const startTimestamp = new Date(participant.started_at).getTime()

    // Determine how many designs this participant saw
    let designsToShow: string[] = []

    if (participant.status === 'completed') {
      // Completed participants saw all designs
      designsToShow = [...DESIGN_ORDER]
    } else if (participant.status === 'abandoned') {
      // Abandoned participants saw 0-2 designs (randomly)
      const numDesigns = randomInt(0, 2)
      designsToShow = DESIGN_ORDER.slice(0, numDesigns)
    } else {
      // In-progress participants are mid-study (1-2 designs)
      const numDesigns = randomInt(1, 2)
      designsToShow = DESIGN_ORDER.slice(0, numDesigns)
    }

    // Create session first (needs designsToShow)
    const session = generateSession(
      participant.id,
      participant.started_at,
      participant.completed_at,
      designsToShow
    )
    allSessions.push(session)

    // Pick a viewport for this session
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 768, height: 1024 }, // tablet
      { width: 390, height: 844 }, // mobile
    ]
    const viewport = randomChoice(viewports)

    // Generate exposures and responses for each design
    let currentTimestamp = startTimestamp

    for (let i = 0; i < designsToShow.length; i++) {
      const designId = designsToShow[i]
      const isPractice = designId === DESIGN_1_ID

      // Generate exposure (includes countdown and question timing)
      const { exposure, endTimestamp } = generateExposure(
        session.id,
        participant.id,
        designId,
        i + 1, // exposure_sequence (1-indexed)
        currentTimestamp,
        isPractice,
        viewport
      )
      allExposures.push(exposure)
      completedExposures++
      if (isPractice) practiceExposures++

      // Generate response
      const questionInfo = QUESTIONS_BY_DESIGN[designId]
      if (questionInfo && exposure.questions_started_at && exposure.questions_completed_at) {
        const questionsStartedAt = new Date(exposure.questions_started_at).getTime()
        const questionsCompletedAt = new Date(exposure.questions_completed_at).getTime()

        const response = generateQuestionResponse(
          exposure.id,
          session.id,
          participant.id,
          designId,
          questionInfo,
          questionsStartedAt,
          questionsCompletedAt
        )
        allResponses.push(response)
        totalResponses++
      }

      // Move to after this design's completion plus small gap
      currentTimestamp = endTimestamp + randomInt(500, 1500)
    }
  }

  // Insert sessions in batches
  log(`\n📝 Inserting ${allSessions.length} sessions...`)
  for (let i = 0; i < allSessions.length; i += 100) {
    const batch = allSessions.slice(i, i + 100)
    const { error } = await (supabase as any).from('first_impression_sessions').insert(batch)
    if (error) {
      log(`⚠️  Session batch ${i / 100 + 1} error: ${error.message}`)
    }
  }
  log('✅ Sessions inserted')

  // Insert exposures in batches
  log(`📝 Inserting ${allExposures.length} exposures...`)
  for (let i = 0; i < allExposures.length; i += 100) {
    const batch = allExposures.slice(i, i + 100)
    const { error } = await (supabase as any).from('first_impression_exposures').insert(batch)
    if (error) {
      log(`⚠️  Exposure batch ${i / 100 + 1} error: ${error.message}`)
    }
  }
  log('✅ Exposures inserted')

  // Insert responses in batches
  log(`📝 Inserting ${allResponses.length} responses...`)
  for (let i = 0; i < allResponses.length; i += 100) {
    const batch = allResponses.slice(i, i + 100)
    const { error } = await (supabase as any).from('first_impression_responses').insert(batch)
    if (error) {
      log(`⚠️  Response batch ${i / 100 + 1} error: ${error.message}`)
    }
  }
  log('✅ Responses inserted')

  // Calculate metrics for summary
  const yesNoResponses = allResponses.filter(r => {
    const q = QUESTIONS_BY_DESIGN[r.design_id]
    return q?.type === 'yes_no'
  })
  const yesCount = yesNoResponses.filter(r => r.response_value === true).length
  const yesPercentage = yesNoResponses.length > 0
    ? ((yesCount / yesNoResponses.length) * 100).toFixed(1)
    : '0'

  const opinionResponses = allResponses.filter(r => {
    const q = QUESTIONS_BY_DESIGN[r.design_id]
    return q?.type === 'opinion_scale'
  })
  const avgRating = opinionResponses.length > 0
    ? (opinionResponses.reduce((sum, r) => sum + (r.response_value as number), 0) / opinionResponses.length).toFixed(2)
    : '0'

  // Summary
  log('\n' + '='.repeat(60))
  log('✨ SEED COMPLETE!')
  log('='.repeat(60))
  log(`
📁 Project ID: ${PROJECT_ID}
📊 Study ID: ${STUDY_ID}
🔗 Share Code: ${SHARE_CODE}
🌐 Participate URL: http://localhost:4001/s/${SHARE_CODE}
📈 Results URL: http://localhost:4001/projects/${PROJECT_ID}/studies/${STUDY_ID}/results

Study Configuration:
✅ Design Assignment: sequential_all (all designs shown)
✅ Practice Design: Design 1 (is_practice: true)
✅ Exposure Duration: ${EXPOSURE_DURATION_MS}ms
✅ Countdown Duration: ${COUNTDOWN_DURATION_MS}ms

Participants: ${TOTAL_PARTICIPANTS} total
   ├─ ${COMPLETED_COUNT} completed (${((COMPLETED_COUNT / TOTAL_PARTICIPANTS) * 100).toFixed(0)}%)
   ├─ ${ABANDONED_COUNT} abandoned (${((ABANDONED_COUNT / TOTAL_PARTICIPANTS) * 100).toFixed(0)}%)
   └─ ${IN_PROGRESS_COUNT} in progress (${((IN_PROGRESS_COUNT / TOTAL_PARTICIPANTS) * 100).toFixed(0)}%)

Data Generated:
   📦 Sessions: ${allSessions.length}
   👁️  Exposures: ${completedExposures} (${practiceExposures} practice)
   📝 Responses: ${totalResponses}

Question Response Metrics:
   ✓ "Did you like it?" (yes_no): ${yesPercentage}% said Yes
   ★ "How did you find it?" (opinion_scale): Avg ${avgRating}/5
`)
}

main().catch(e => {
  process.stderr.write('Error: ' + e.message + '\n')
  process.exit(1)
})
