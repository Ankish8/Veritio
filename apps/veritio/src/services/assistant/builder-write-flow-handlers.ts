/**
 * Flow configuration write tool handlers (Phase 3 — interactive generative UI).
 *
 * Handles configure_flow_section, configure_flow_questions, and
 * configure_participant_id tools that write directly to study settings.
 */

import type { ToolExecutionResult } from './types'
import { updateStudy } from '../study-service'
import { createFlowQuestion, invalidateFlowQuestionsCache } from '../flow-question-service'
import { prepareQuestionData, normalizeBranchingLogic, stripHtmlForResult } from './builder-write-normalizers'
import type { WriteToolContext } from './builder-write-tools'

// ---------------------------------------------------------------------------
// Flow section configuration
// ---------------------------------------------------------------------------

export async function handleConfigureFlowSection(
  args: Record<string, unknown>,
  ctx: WriteToolContext,
): Promise<ToolExecutionResult> {
  const section = args.section as string
  if (!section || !['welcome', 'agreement', 'thank_you', 'instructions'].includes(section)) {
    return { result: { error: 'Invalid section. Must be one of: welcome, agreement, thank_you, instructions' } }
  }

  // Build section update from args
  const sectionUpdate: Record<string, unknown> = {}
  if (args.enabled !== undefined) sectionUpdate.enabled = Boolean(args.enabled)
  else sectionUpdate.enabled = true
  if (args.title !== undefined) sectionUpdate.title = String(args.title)
  if (args.message !== undefined) sectionUpdate.message = String(args.message)

  // Section-specific fields
  if (section === 'welcome') {
    if (args.includeStudyTitle !== undefined) sectionUpdate.includeStudyTitle = Boolean(args.includeStudyTitle)
    if (args.includeDescription !== undefined) sectionUpdate.includeDescription = Boolean(args.includeDescription)
    if (args.includePurpose !== undefined) sectionUpdate.includePurpose = Boolean(args.includePurpose)
    if (args.includeParticipantRequirements !== undefined) sectionUpdate.includeParticipantRequirements = Boolean(args.includeParticipantRequirements)
    if (args.showIncentive !== undefined) sectionUpdate.showIncentive = Boolean(args.showIncentive)
  } else if (section === 'agreement') {
    if (args.agreementText !== undefined) sectionUpdate.agreementText = String(args.agreementText)
    if (args.rejectionTitle !== undefined) sectionUpdate.rejectionTitle = String(args.rejectionTitle)
    if (args.rejectionMessage !== undefined) sectionUpdate.rejectionMessage = String(args.rejectionMessage)
    if (args.redirectUrl !== undefined) sectionUpdate.redirectUrl = String(args.redirectUrl)
  } else if (section === 'thank_you') {
    if (args.redirectUrl !== undefined) sectionUpdate.redirectUrl = String(args.redirectUrl)
    if (args.redirectDelay !== undefined) sectionUpdate.redirectDelay = Number(args.redirectDelay)
    if (args.showIncentive !== undefined) sectionUpdate.showIncentive = Boolean(args.showIncentive)
  } else if (section === 'instructions') {
    if (args.part1 !== undefined) sectionUpdate.part1 = String(args.part1)
    if (args.part2 !== undefined) sectionUpdate.part2 = String(args.part2)
  }

  // Write directly to DB settings
  const SECTION_KEY_MAP: Record<string, string> = {
    welcome: 'welcome',
    agreement: 'participantAgreement',
    thank_you: 'thankYou',
    instructions: 'activityInstructions',
  }
  const settingsKey = SECTION_KEY_MAP[section]
  if (settingsKey) {
    const { data: study } = await ctx.supabase
      .from('studies')
      .select('settings, title, description, purpose, participant_requirements')
      .eq('id', ctx.studyId)
      .single()

    const currentSettings = (study?.settings as Record<string, any>) ?? {}
    const studyFlow = { ...((currentSettings.studyFlow ?? {}) as Record<string, any>) }
    const existing = (studyFlow[settingsKey] ?? {}) as Record<string, any>
    studyFlow[settingsKey] = { ...existing, ...sectionUpdate }
    const mergedSettings = { ...currentSettings, studyFlow }
    const { error } = await updateStudy(ctx.supabase, ctx.studyId, ctx.userId, { settings: mergedSettings } as any)
    if (error) {
      return { result: { error: `Failed to save section settings: ${error.message}` } }
    }

    // For welcome section, include study details so the component can show actual content
    let studyDetails: Record<string, unknown> = {}
    if (section === 'welcome' && study) {
      studyDetails = {
        _studyTitle: study.title ?? undefined,
        _studyDescription: stripHtmlForResult(study.description),
        _studyPurpose: stripHtmlForResult(study.purpose),
        _studyParticipantRequirements: stripHtmlForResult(study.participant_requirements),
      }
    }

    return {
      result: {
        success: true,
        sectionType: section,
        ...sectionUpdate,
        ...studyDetails,
      },
    }
  }

  return {
    result: {
      success: true,
      sectionType: section,
      ...sectionUpdate,
    },
  }
}

// ---------------------------------------------------------------------------
// Flow questions configuration
// ---------------------------------------------------------------------------

export async function handleConfigureFlowQuestions(
  args: Record<string, unknown>,
  ctx: WriteToolContext,
): Promise<ToolExecutionResult> {
  const section = args.section as 'screening' | 'pre_study' | 'post_study'
  const questions = args.questions as Record<string, unknown>[]

  if (!section || !['screening', 'pre_study', 'post_study'].includes(section)) {
    return { result: { error: 'Invalid section. Must be one of: screening, pre_study, post_study' } }
  }
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return { result: { error: 'questions array is required and must not be empty' } }
  }

  // Auto-enable the section in study settings
  await autoEnableFlowSection(ctx, section)

  // Delete existing questions for this section, then create new ones
  const { error: deleteError } = await ctx.supabase
    .from('study_flow_questions')
    .delete()
    .eq('study_id', ctx.studyId)
    .eq('section', section)
  if (deleteError) {
    return { result: { error: `Failed to clear existing questions: ${deleteError.message}` } }
  }
  invalidateFlowQuestionsCache(ctx.studyId, section)

  // Create questions directly in DB
  const normalizedQuestions: Record<string, unknown>[] = []
  for (let i = 0; i < questions.length; i++) {
    const item = questions[i]
    const { questionType, config } = prepareQuestionData(item)
    const qData = {
      id: crypto.randomUUID(),
      question_type: questionType,
      question_text: String(item.question_text || ''),
      description: item.description ? String(item.description) : null,
      is_required: item.is_required !== false,
      config,
      branching_logic: normalizeBranchingLogic(
        (item.branching_logic as Record<string, unknown>) ?? undefined,
        questionType,
        config,
      ) ?? undefined,
      position: i,
    }
    const { error } = await createFlowQuestion(ctx.supabase, ctx.studyId, {
      section,
      question_type: questionType,
      question_text: qData.question_text,
      description: qData.description,
      is_required: qData.is_required,
      config,
      branching_logic: qData.branching_logic as Record<string, unknown> | undefined,
      position: i,
    })
    if (error) {
      console.error('Failed to create flow question', { studyId: ctx.studyId, section, index: i, error: error.message })
    }
    normalizedQuestions.push(qData)
  }

  // Read current section settings for the component display
  const { data: study } = await ctx.supabase
    .from('studies')
    .select('settings')
    .eq('id', ctx.studyId)
    .single()

  const sectionKeyMap: Record<string, string> = {
    screening: 'screening',
    pre_study: 'preStudyQuestions',
    post_study: 'postStudyQuestions',
  }
  const settingsKey = sectionKeyMap[section]
  const currentSettings = (study?.settings as Record<string, any>) ?? {}
  const studyFlow = (currentSettings.studyFlow ?? {}) as Record<string, any>
  const sectionSettings = (studyFlow[settingsKey] ?? {}) as Record<string, any>

  return {
    result: {
      success: true,
      section,
      questions: normalizedQuestions,
      sectionSettings,
      count: normalizedQuestions.length,
    },
  }
}

// ---------------------------------------------------------------------------
// Participant identifier configuration
// ---------------------------------------------------------------------------

export async function handleConfigureParticipantId(
  args: Record<string, unknown>,
  ctx: WriteToolContext,
): Promise<ToolExecutionResult> {
  const idType = args.type as string
  if (!idType || !['anonymous', 'demographic_profile'].includes(idType)) {
    return { result: { error: 'Invalid type. Must be one of: anonymous, demographic_profile' } }
  }

  // Build identifier config
  const identifierUpdate: Record<string, unknown> = { type: idType }

  if (idType === 'demographic_profile' && Array.isArray(args.fields)) {
    const fields = (args.fields as Record<string, unknown>[]).map((f) => ({
      fieldType: String(f.fieldType),
      enabled: f.enabled !== false,
      required: f.required === true,
    }))
    identifierUpdate.demographicProfile = { fields }
  }

  // Write directly to DB settings
  const { data: study } = await ctx.supabase
    .from('studies')
    .select('settings')
    .eq('id', ctx.studyId)
    .single()

  const currentSettings = (study?.settings as Record<string, any>) ?? {}
  const studyFlow = { ...((currentSettings.studyFlow ?? {}) as Record<string, any>) }
  const existing = (studyFlow.participantIdentifier ?? {}) as Record<string, any>
  studyFlow.participantIdentifier = { ...existing, ...identifierUpdate }
  const mergedSettings = { ...currentSettings, studyFlow }
  const { error } = await updateStudy(ctx.supabase, ctx.studyId, ctx.userId, { settings: mergedSettings } as any)
  if (error) {
    return { result: { error: `Failed to save participant identifier: ${error.message}` } }
  }

  return {
    result: {
      success: true,
      participantId: identifierUpdate,
    },
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Auto-enable a flow section when questions are added
 */
export async function autoEnableFlowSection(
  ctx: WriteToolContext,
  section: 'screening' | 'pre_study' | 'post_study',
): Promise<boolean> {
  const sectionSettingsKey: Record<string, string> = {
    screening: 'screening',
    pre_study: 'preStudyQuestions',
    post_study: 'postStudyQuestions',
  }
  const key = sectionSettingsKey[section]
  if (!key) return false

  try {
    const { data: study } = await ctx.supabase
      .from('studies')
      .select('settings')
      .eq('id', ctx.studyId)
      .single()

    const currentSettings = (study?.settings as Record<string, any>) ?? {}
    const studyFlow = (currentSettings.studyFlow ?? {}) as Record<string, any>
    const sectionSettings = (studyFlow[key] ?? {}) as Record<string, any>

    // Already enabled
    if (sectionSettings.enabled === true) return false

    const mergedSettings = {
      ...currentSettings,
      studyFlow: {
        ...studyFlow,
        [key]: {
          ...sectionSettings,
          enabled: true,
        },
      },
    }

    const { error } = await ctx.supabase
      .from('studies')
      .update({ settings: mergedSettings })
      .eq('id', ctx.studyId)

    if (error) {
      return false
    }
    return true
  } catch {
    return false
  }
}
