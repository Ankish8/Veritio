import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { createChatCompletion } from '../../../services/assistant/openai'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import type { FollowupQuestionType, FollowupQuestionConfig } from '@veritio/study-types'

const bodySchema = z.object({
  participantId: z.string().uuid(),
  questionId: z.string().uuid(),
  questionText: z.string(),
  answer: z.string().optional(),
  questionType: z.string().optional(),
  responseContext: z.string().optional(),
  followupPosition: z.number().int().min(1).max(2),
  depthHint: z.string().optional(),
})

export const config = {
  name: 'EvaluateAiFollowup',
  triggers: [{
    type: 'http',
    path: '/api/studies/:studyId/ai-followup-evaluate',
    method: 'POST',
    middleware: [errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['flow-responses'],
} satisfies StepConfig

// ---------------------------------------------------------------------------
// Scale pre-filter helpers
// ---------------------------------------------------------------------------

type ScaleDecision = 'probe' | 'llm' | 'skip'

function evaluateNpsScore(value: number, hasDepthHint: boolean): ScaleDecision {
  if (value <= 6) return 'probe'         // Detractors — always probe
  if (value <= 8) return 'llm'           // Passives — ask LLM
  return hasDepthHint ? 'llm' : 'skip'   // Promoters — skip unless researcher hint
}

function evaluateOpinionScale(value: number, min: number, max: number, hasDepthHint: boolean): ScaleDecision {
  const range = max - min
  if (range === 0) return 'llm'
  const normalized = (value - min) / range // 0..1
  if (normalized <= 0.3) return 'probe'    // Bottom 30% — always probe
  if (normalized >= 0.8) return hasDepthHint ? 'llm' : 'skip' // Top 20% — skip unless hint
  return 'llm'                             // Middle — ask LLM
}

interface ScaleProbe {
  question: string
  followupType: FollowupQuestionType
  followupConfig: FollowupQuestionConfig | null
}

function buildScaleProbe(value: number, max: number, _questionText: string): ScaleProbe {
  return {
    question: `You rated ${value} out of ${max}. What was the main factor behind your rating?`,
    followupType: 'multiple_choice',
    followupConfig: {
      options: [
        { id: 'opt_0', label: 'Quality or reliability issues' },
        { id: 'opt_1', label: 'Ease of use' },
        { id: 'opt_2', label: 'Missing features' },
        { id: 'opt_3', label: 'Customer support experience' },
        { id: 'opt_4', label: 'Something else' },
      ],
    },
  }
}

// ---------------------------------------------------------------------------
// Choice pre-filter helpers
// ---------------------------------------------------------------------------

interface ChoiceContext {
  triggerCondition?: string
  triggerOptionIds?: string[]
  selectedOptionIds?: string[]
  selectedLabels?: string[]
  allowOther?: boolean
  isOtherSelected?: boolean
}

type ChoiceDecision = 'probe' | 'llm' | 'skip'

function evaluateChoiceQuestion(ctx: ChoiceContext): ChoiceDecision {
  const { triggerCondition, triggerOptionIds, selectedOptionIds, isOtherSelected } = ctx

  switch (triggerCondition) {
    case 'when_other':
      return isOtherSelected ? 'probe' : 'skip'
    case 'specific_options': {
      if (!triggerOptionIds || !selectedOptionIds) return 'skip'
      const hasMatch = selectedOptionIds.some((id) => triggerOptionIds.includes(id))
      return hasMatch ? 'probe' : 'skip'
    }
    case 'always':
      return 'llm'
    default:
      return 'llm'
  }
}

// ---------------------------------------------------------------------------
// LLM prompt builders
// ---------------------------------------------------------------------------

const TEXT_SYSTEM_PROMPT =
  'You evaluate survey answers and decide whether a follow-up question is needed. ' +
  'Respond ONLY with a JSON object.\n' +
  'If adequate: {"f":false}\n' +
  'If vague/short/unspecific, choose the BEST follow-up type:\n' +
  '- Multiple choice (PREFERRED when reasons can be categorized): {"f":true,"q":"What was the main reason?","r":"reason","t":"mc","opts":["Price","Quality","Support","Other"]}\n' +
  '- Yes/No (for confirming a specific aspect): {"f":true,"q":"Was price a deciding factor?","r":"reason","t":"yn"}\n' +
  '- Scale (for measuring intensity/degree): {"f":true,"q":"How important was X?","r":"reason","t":"os","sp":5,"ll":"Not important","rl":"Very important"}\n' +
  '- Open text (ONLY when other types cannot capture the answer): {"f":true,"q":"What specific examples...?","r":"reason","t":"text"}\n' +
  'IMPORTANT: Prefer "mc" or "yn" over "text". Only use "text" when the answer truly needs free-form elaboration. ' +
  'Follow-up must be specific and targeted. Never ask generic questions like "Can you tell me more?". Be concise.'

const SCALE_SYSTEM_PROMPT =
  'You evaluate a numeric rating and decide if a follow-up question would add insight. ' +
  'Respond ONLY with a JSON object.\n' +
  'If self-explanatory: {"f":false}\n' +
  'If the rating needs explanation, choose the BEST follow-up type:\n' +
  '- Multiple choice (STRONGLY PREFERRED — categorize reasons for the rating): {"f":true,"q":"What most influenced your rating?","r":"reason","t":"mc","opts":["Ease of use","Performance","Design","Support","Price"]}\n' +
  '- Yes/No (for confirming a factor): {"f":true,"q":"Did [specific aspect] affect your rating?","r":"reason","t":"yn"}\n' +
  '- Open text (ONLY as last resort): {"f":true,"q":"What specific factors...?","r":"reason","t":"text"}\n' +
  'IMPORTANT: For ratings, "mc" is almost always better than "text" because users who gave a number prefer quick structured answers over typing. Be concise.'

const CHOICE_SYSTEM_PROMPT =
  'You evaluate a multiple-choice answer and decide whether a follow-up question is needed. ' +
  'Respond ONLY with a JSON object.\n' +
  'If adequate: {"f":false}\n' +
  'If the selection deserves exploration, choose the BEST follow-up type:\n' +
  '- Scale (PREFERRED — measure how strongly they feel): {"f":true,"q":"How confident are you in this choice?","r":"reason","t":"os","sp":5,"ll":"Not confident","rl":"Very confident"}\n' +
  '- Yes/No (for confirming a related factor): {"f":true,"q":"Did you consider [alternative]?","r":"reason","t":"yn"}\n' +
  '- Multiple choice (for exploring related reasons): {"f":true,"q":"What mainly influenced this choice?","r":"reason","t":"mc","opts":["Past experience","Recommendation","Price","Convenience"]}\n' +
  '- Open text (ONLY when structured types cannot capture the answer): {"f":true,"q":"What specific experience...?","r":"reason","t":"text"}\n' +
  'IMPORTANT: Prefer structured types over "text". The user already answered a choice question — they prefer quick responses. Be concise.'

const YESNO_SYSTEM_PROMPT =
  'You evaluate a yes/no answer. Binary answers are inherently ambiguous and almost always benefit from follow-up. ' +
  'Respond ONLY with a JSON object.\n' +
  'If truly self-explanatory: {"f":false}\n' +
  'Choose the BEST follow-up type:\n' +
  '- Multiple choice (PREFERRED — categorize the reason): {"f":true,"q":"What was the main reason?","r":"reason","t":"mc","opts":["Convenience","Quality","Price","Habit","Other"]}\n' +
  '- Scale (measure degree/intensity): {"f":true,"q":"How strongly do you feel about this?","r":"reason","t":"os","sp":5,"ll":"Not at all","rl":"Very strongly"}\n' +
  '- Open text (ONLY when reasons are truly unpredictable): {"f":true,"q":"What led to this decision?","r":"reason","t":"text"}\n' +
  'IMPORTANT: Prefer "mc" over "text". Users who answered yes/no prefer quick follow-ups. Be concise.'

// ---------------------------------------------------------------------------
// Parse LLM response into typed follow-up config
// ---------------------------------------------------------------------------

interface LlmFollowupResult {
  shouldFollowUp: boolean
  question?: string
  reason?: string
  followupType: FollowupQuestionType
  followupConfig: FollowupQuestionConfig | null
}

function parseLlmResponse(content: string): LlmFollowupResult {
  const parsed = JSON.parse(content) as {
    f: boolean
    q?: string
    r?: string
    t?: string
    opts?: string[]
    sp?: number
    ll?: string
    rl?: string
  }

  if (!parsed.f || !parsed.q) {
    return { shouldFollowUp: false, followupType: 'text', followupConfig: null }
  }

  let followupType: FollowupQuestionType = 'text'
  let followupConfig: FollowupQuestionConfig | null = null

  switch (parsed.t) {
    case 'mc':
      if (parsed.opts && Array.isArray(parsed.opts) && parsed.opts.length >= 2) {
        followupType = 'multiple_choice'
        followupConfig = {
          options: parsed.opts.map((label, i) => ({
            id: `opt_${i}`,
            label: String(label),
          })),
        }
      }
      break
    case 'os':
      followupType = 'opinion_scale'
      followupConfig = {
        scalePoints: Math.min(7, Math.max(3, parsed.sp ?? 5)),
        leftLabel: parsed.ll || 'Disagree',
        rightLabel: parsed.rl || 'Agree',
      }
      break
    case 'yn':
      followupType = 'yes_no'
      followupConfig = null
      break
    default:
      followupType = 'text'
      followupConfig = null
  }

  return {
    shouldFollowUp: true,
    question: parsed.q,
    reason: parsed.r,
    followupType,
    followupConfig,
  }
}

// ---------------------------------------------------------------------------
// DB insert helper
// ---------------------------------------------------------------------------

async function insertFollowup(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  params: {
    studyId: string
    participantId: string
    questionId: string
    questionText: string
    triggerReason: string | null
    position: number
    modelUsed: string
    followupType: FollowupQuestionType
    followupConfig: FollowupQuestionConfig | null
  }
) {
  const { data: followup } = await supabase
    .from('ai_followup_questions' as any)
    .insert({
      study_id: params.studyId,
      participant_id: params.participantId,
      parent_question_id: params.questionId,
      question_text: params.questionText,
      trigger_reason: params.triggerReason,
      position: params.position,
      model_used: params.modelUsed,
      followup_question_type: params.followupType,
      followup_question_config: params.followupConfig,
    })
    .select('id, question_text')
    .single() as unknown as { data: { id: string; question_text: string } | null }

  return followup
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export const handler = async (
  req: ApiRequest<z.infer<typeof bodySchema>, { studyId: string }>,
  { logger }: ApiHandlerContext
) => {
  const { participantId, questionId, questionText, answer, questionType, responseContext, followupPosition, depthHint } = bodySchema.parse(req.body)
  const { studyId } = req.pathParams

  try {
    const supabase = getMotiaSupabaseClient()

    // Validate participant belongs to study
    const { data: participant } = await supabase
      .from('participants')
      .select('id')
      .eq('id', participantId)
      .eq('study_id', studyId)
      .single()

    if (!participant) {
      return { status: 400, body: { error: 'Invalid participant' } }
    }

    // Validate question belongs to study
    const { data: question } = await supabase
      .from('study_flow_questions')
      .select('id')
      .eq('id', questionId)
      .eq('study_id', studyId)
      .single()

    if (!question) {
      return { status: 400, body: { error: 'Invalid question' } }
    }

    // -----------------------------------------------------------------------
    // Route by question type
    // -----------------------------------------------------------------------

    // --- NPS ---
    if (questionType === 'nps') {
      return await handleNps({ supabase, studyId, participantId, questionId, questionText, responseContext, followupPosition, depthHint, logger })
    }

    // --- Opinion Scale ---
    if (questionType === 'opinion_scale') {
      return await handleOpinionScale({ supabase, studyId, participantId, questionId, questionText, responseContext, followupPosition, depthHint, logger })
    }

    // --- Slider ---
    if (questionType === 'slider') {
      return await handleSlider({ supabase, studyId, participantId, questionId, questionText, responseContext, followupPosition, depthHint, logger })
    }

    // --- Yes/No ---
    if (questionType === 'yes_no') {
      return await handleYesNo({ supabase, studyId, participantId, questionId, questionText, answer, responseContext, followupPosition, depthHint, logger })
    }

    // --- Multiple Choice ---
    if (questionType === 'multiple_choice') {
      return await handleMultipleChoice({ supabase, studyId, participantId, questionId, questionText, answer, responseContext, followupPosition, depthHint, logger })
    }

    // --- Text (single_line_text, multi_line_text, default) ---
    return await handleText({ supabase, studyId, participantId, questionId, questionText, answer: answer || '', followupPosition, depthHint, logger })

  } catch (error) {
    // Fail-open: any error means no follow-up
    logger.error('AI followup evaluation failed', { error })
    return { status: 200, body: { shouldFollowUp: false } }
  }
}

// ---------------------------------------------------------------------------
// Type-specific handlers
// ---------------------------------------------------------------------------

interface HandlerParams {
  supabase: ReturnType<typeof getMotiaSupabaseClient>
  studyId: string
  participantId: string
  questionId: string
  questionText: string
  answer?: string
  responseContext?: string
  followupPosition: number
  depthHint?: string
  logger: ApiHandlerContext['logger']
}

function buildSuccessResponse(followup: { id: string; question_text: string } | null, followupType: FollowupQuestionType, followupConfig: FollowupQuestionConfig | null) {
  return {
    status: 200,
    body: {
      shouldFollowUp: true,
      followUpQuestion: followup?.question_text,
      followupQuestionId: followup?.id,
      followupType,
      followupConfig,
    },
  }
}

const NO_FOLLOWUP = { status: 200, body: { shouldFollowUp: false } } as const

// --- Text handler (original logic) ---

async function handleText(params: HandlerParams & { answer: string }) {
  const { supabase, studyId, participantId, questionId, questionText, answer, followupPosition, depthHint } = params

  // Pre-filter: skip LLM for detailed answers (>80 words)
  const wordCount = answer.trim().split(/\s+/).length
  if (wordCount > 80) {
    return NO_FOLLOWUP
  }

  // Pre-filter: directed probe for very short answers (<3 words)
  if (wordCount < 3) {
    const shortProbe = 'Could you share a specific example or detail to help us better understand your perspective?'
    const followup = await insertFollowup(supabase, {
      studyId, participantId, questionId, questionText: shortProbe,
      triggerReason: 'Answer too short for AI evaluation',
      position: followupPosition, modelUsed: 'pre-filter',
      followupType: 'text', followupConfig: null,
    })
    return buildSuccessResponse(followup, 'text', null)
  }

  // Call Mercury 2 for evaluation
  const userMessage = `Q: "${questionText}"\nA: "${answer}"${depthHint ? `\nProbe: ${depthHint}` : ''}`
  const result = await createChatCompletion(
    [
      { role: 'system', content: TEXT_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    { maxTokens: 120, responseFormat: { type: 'json_object' } }
  )

  const content = result.content
  if (!content || typeof content !== 'string') return NO_FOLLOWUP

  const llmResult = parseLlmResponse(content)
  if (!llmResult.shouldFollowUp || !llmResult.question) return NO_FOLLOWUP

  const followup = await insertFollowup(supabase, {
    studyId, participantId, questionId, questionText: llmResult.question,
    triggerReason: llmResult.reason || null,
    position: followupPosition, modelUsed: 'mercury-2',
    followupType: llmResult.followupType, followupConfig: llmResult.followupConfig,
  })
  return buildSuccessResponse(followup, llmResult.followupType, llmResult.followupConfig)
}

// --- NPS handler ---

async function handleNps(params: HandlerParams) {
  const { supabase, studyId, participantId, questionId, questionText, responseContext, followupPosition, depthHint } = params

  // Parse NPS value — NPS response is { value: number }
  let npsValue: number | null = null
  if (responseContext) {
    try {
      const parsed = JSON.parse(responseContext)
      npsValue = typeof parsed.value === 'number' ? parsed.value : typeof parsed === 'number' ? parsed : null
    } catch { npsValue = null }
  }

  if (npsValue === null || npsValue < 0 || npsValue > 10) {
    return NO_FOLLOWUP
  }

  const decision = evaluateNpsScore(npsValue, !!depthHint)

  if (decision === 'skip') return NO_FOLLOWUP

  if (decision === 'probe') {
    const probe = buildScaleProbe(npsValue, 10, questionText)
    const followup = await insertFollowup(supabase, {
      studyId, participantId, questionId, questionText: probe.question,
      triggerReason: `NPS detractor score: ${npsValue}`,
      position: followupPosition, modelUsed: 'pre-filter',
      followupType: probe.followupType, followupConfig: probe.followupConfig,
    })
    return buildSuccessResponse(followup, probe.followupType, probe.followupConfig)
  }

  // LLM evaluation
  const userMessage = `Q: "${questionText}"\nNPS Score: ${npsValue}/10 (${npsValue <= 6 ? 'Detractor' : npsValue <= 8 ? 'Passive' : 'Promoter'})${depthHint ? `\nProbe: ${depthHint}` : ''}`
  const result = await createChatCompletion(
    [
      { role: 'system', content: SCALE_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    { maxTokens: 120, responseFormat: { type: 'json_object' } }
  )

  const content = result.content
  if (!content || typeof content !== 'string') return NO_FOLLOWUP

  const llmResult = parseLlmResponse(content)
  if (!llmResult.shouldFollowUp || !llmResult.question) return NO_FOLLOWUP

  const followup = await insertFollowup(supabase, {
    studyId, participantId, questionId, questionText: llmResult.question,
    triggerReason: llmResult.reason || `NPS passive score: ${npsValue}`,
    position: followupPosition, modelUsed: 'mercury-2',
    followupType: llmResult.followupType, followupConfig: llmResult.followupConfig,
  })
  return buildSuccessResponse(followup, llmResult.followupType, llmResult.followupConfig)
}

// --- Opinion Scale handler ---

async function handleOpinionScale(params: HandlerParams) {
  const { supabase, studyId, participantId, questionId, questionText, responseContext, followupPosition, depthHint } = params

  let scaleValue: number | null = null
  let scaleMin = 1
  let scaleMax = 5

  if (responseContext) {
    try {
      const parsed = JSON.parse(responseContext)
      scaleValue = typeof parsed.value === 'number' ? parsed.value : typeof parsed === 'number' ? parsed : null
      if (parsed.min !== undefined) scaleMin = parsed.min
      if (parsed.max !== undefined) scaleMax = parsed.max
    } catch { scaleValue = null }
  }

  if (scaleValue === null) return NO_FOLLOWUP

  const decision = evaluateOpinionScale(scaleValue, scaleMin, scaleMax, !!depthHint)

  if (decision === 'skip') return NO_FOLLOWUP

  if (decision === 'probe') {
    const probe = buildScaleProbe(scaleValue, scaleMax, questionText)
    const followup = await insertFollowup(supabase, {
      studyId, participantId, questionId, questionText: probe.question,
      triggerReason: `Low opinion scale rating: ${scaleValue}/${scaleMax}`,
      position: followupPosition, modelUsed: 'pre-filter',
      followupType: probe.followupType, followupConfig: probe.followupConfig,
    })
    return buildSuccessResponse(followup, probe.followupType, probe.followupConfig)
  }

  // LLM evaluation
  const userMessage = `Q: "${questionText}"\nRating: ${scaleValue} out of ${scaleMax}${depthHint ? `\nProbe: ${depthHint}` : ''}`
  const result = await createChatCompletion(
    [
      { role: 'system', content: SCALE_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    { maxTokens: 120, responseFormat: { type: 'json_object' } }
  )

  const content = result.content
  if (!content || typeof content !== 'string') return NO_FOLLOWUP

  const llmResult = parseLlmResponse(content)
  if (!llmResult.shouldFollowUp || !llmResult.question) return NO_FOLLOWUP

  const followup = await insertFollowup(supabase, {
    studyId, participantId, questionId, questionText: llmResult.question,
    triggerReason: llmResult.reason || null,
    position: followupPosition, modelUsed: 'mercury-2',
    followupType: llmResult.followupType, followupConfig: llmResult.followupConfig,
  })
  return buildSuccessResponse(followup, llmResult.followupType, llmResult.followupConfig)
}

// --- Slider handler ---

async function handleSlider(params: HandlerParams) {
  const { supabase, studyId, participantId, questionId, questionText, responseContext, followupPosition, depthHint } = params

  let sliderValue: number | null = null
  let sliderMin = 0
  let sliderMax = 100

  if (responseContext) {
    try {
      const parsed = JSON.parse(responseContext)
      sliderValue = typeof parsed.value === 'number' ? parsed.value : typeof parsed === 'number' ? parsed : null
      if (parsed.min !== undefined) sliderMin = parsed.min
      if (parsed.max !== undefined) sliderMax = parsed.max
    } catch { sliderValue = null }
  }

  if (sliderValue === null) return NO_FOLLOWUP

  // Same logic as opinion scale
  const decision = evaluateOpinionScale(sliderValue, sliderMin, sliderMax, !!depthHint)

  if (decision === 'skip') return NO_FOLLOWUP

  if (decision === 'probe') {
    const probe = buildScaleProbe(sliderValue, sliderMax, questionText)
    const followup = await insertFollowup(supabase, {
      studyId, participantId, questionId, questionText: probe.question,
      triggerReason: `Low slider value: ${sliderValue}/${sliderMax}`,
      position: followupPosition, modelUsed: 'pre-filter',
      followupType: probe.followupType, followupConfig: probe.followupConfig,
    })
    return buildSuccessResponse(followup, probe.followupType, probe.followupConfig)
  }

  // LLM evaluation
  const userMessage = `Q: "${questionText}"\nSlider value: ${sliderValue} (range: ${sliderMin}-${sliderMax})${depthHint ? `\nProbe: ${depthHint}` : ''}`
  const result = await createChatCompletion(
    [
      { role: 'system', content: SCALE_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    { maxTokens: 120, responseFormat: { type: 'json_object' } }
  )

  const content = result.content
  if (!content || typeof content !== 'string') return NO_FOLLOWUP

  const llmResult = parseLlmResponse(content)
  if (!llmResult.shouldFollowUp || !llmResult.question) return NO_FOLLOWUP

  const followup = await insertFollowup(supabase, {
    studyId, participantId, questionId, questionText: llmResult.question,
    triggerReason: llmResult.reason || null,
    position: followupPosition, modelUsed: 'mercury-2',
    followupType: llmResult.followupType, followupConfig: llmResult.followupConfig,
  })
  return buildSuccessResponse(followup, llmResult.followupType, llmResult.followupConfig)
}

// --- Yes/No handler ---

async function handleYesNo(params: HandlerParams) {
  const { supabase, studyId, participantId, questionId, questionText, answer, responseContext, followupPosition, depthHint } = params

  // Yes/No answers are inherently ambiguous — always go to LLM
  const answerLabel = answer || responseContext || 'unknown'
  const userMessage = `Q: "${questionText}"\nA: "${answerLabel}"${depthHint ? `\nProbe: ${depthHint}` : ''}`

  const result = await createChatCompletion(
    [
      { role: 'system', content: YESNO_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    { maxTokens: 120, responseFormat: { type: 'json_object' } }
  )

  const content = result.content
  if (!content || typeof content !== 'string') return NO_FOLLOWUP

  const llmResult = parseLlmResponse(content)
  if (!llmResult.shouldFollowUp || !llmResult.question) return NO_FOLLOWUP

  const followup = await insertFollowup(supabase, {
    studyId, participantId, questionId, questionText: llmResult.question,
    triggerReason: llmResult.reason || 'Binary answer requires elaboration',
    position: followupPosition, modelUsed: 'mercury-2',
    followupType: llmResult.followupType, followupConfig: llmResult.followupConfig,
  })
  return buildSuccessResponse(followup, llmResult.followupType, llmResult.followupConfig)
}

// --- Multiple Choice handler ---

async function handleMultipleChoice(params: HandlerParams) {
  const { supabase, studyId, participantId, questionId, questionText, answer, responseContext, followupPosition, depthHint } = params

  // Parse choice context from responseContext
  let choiceCtx: ChoiceContext = {}
  if (responseContext) {
    try {
      const parsed = JSON.parse(responseContext)
      choiceCtx = {
        triggerCondition: parsed.triggerCondition,
        triggerOptionIds: parsed.triggerOptionIds,
        selectedOptionIds: parsed.selectedOptionIds,
        selectedLabels: parsed.selectedLabels,
        allowOther: parsed.allowOther,
        isOtherSelected: parsed.isOtherSelected,
      }
    } catch { /* use defaults */ }
  }

  const decision = evaluateChoiceQuestion(choiceCtx)

  if (decision === 'skip') return NO_FOLLOWUP

  if (decision === 'probe') {
    const selectedText = choiceCtx.selectedLabels?.join(', ') || answer || 'your selection'
    const probe = choiceCtx.isOtherSelected
      ? `You selected "Other". Could you tell us more about what you had in mind?`
      : `You selected "${selectedText}". What specifically made you choose this option?`

    const followup = await insertFollowup(supabase, {
      studyId, participantId, questionId, questionText: probe,
      triggerReason: choiceCtx.isOtherSelected ? 'Other option selected' : 'Specific option triggered follow-up',
      position: followupPosition, modelUsed: 'pre-filter',
      followupType: 'text', followupConfig: null,
    })
    return buildSuccessResponse(followup, 'text', null)
  }

  // LLM evaluation
  const selectedText = choiceCtx.selectedLabels?.join(', ') || answer || 'unknown'
  const userMessage = `Q: "${questionText}"\nSelected: "${selectedText}"${depthHint ? `\nProbe: ${depthHint}` : ''}`

  const result = await createChatCompletion(
    [
      { role: 'system', content: CHOICE_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    { maxTokens: 120, responseFormat: { type: 'json_object' } }
  )

  const content = result.content
  if (!content || typeof content !== 'string') return NO_FOLLOWUP

  const llmResult = parseLlmResponse(content)
  if (!llmResult.shouldFollowUp || !llmResult.question) return NO_FOLLOWUP

  const followup = await insertFollowup(supabase, {
    studyId, participantId, questionId, questionText: llmResult.question,
    triggerReason: llmResult.reason || null,
    position: followupPosition, modelUsed: 'mercury-2',
    followupType: llmResult.followupType, followupConfig: llmResult.followupConfig,
  })
  return buildSuccessResponse(followup, llmResult.followupType, llmResult.followupConfig)
}
