/**
 * Veritio AI Assistant -- System Prompt Builder (Token-Optimized)
 *
 * Ultra-compact system prompts to minimize input token usage.
 * Each mode's prompt targets ~500-1500 tokens max.
 */

import type { AssistantMode } from './context'

export interface SystemPromptContext {
  mode: AssistantMode
  studyTitle?: string
  studyType?: string
  studyStatus?: string
  participantCount?: number
  completedCount?: number
  connectedIntegrations: string[]
  activeTriggers?: { toolkit: string; triggerSlug: string }[]
  pendingEvents?: { toolkit: string; triggerSlug: string; eventType: string; summary: string; payload?: Record<string, unknown>; createdAt: string }[]
  preSelectedProjectId?: string
  preSelectedProjectName?: string
  preSelectedStudyType?: string
  createdStudyId?: string
  activeTab?: string
  activeFlowSection?: string
  preloadedContext?: {
    studyConfig?: { study: any; flowSteps: any[]; tasks: any[]; flowQuestions?: any[]; cards?: any[]; categories?: any[] }
    bestPractices?: string
    flowReference?: string
  }
}

/** Maps ActiveFlowSection values → display labels and study-flow-reference keys */
export const FLOW_SECTION_META: Record<string, { label: string; referenceKey: string }> = {
  welcome: { label: 'Welcome Message', referenceKey: 'welcome' },
  agreement: { label: 'Participant Agreement', referenceKey: 'participantAgreement' },
  screening: { label: 'Screening Questions', referenceKey: 'screening' },
  identifier: { label: 'Participant Identifier', referenceKey: 'participantIdentifier' },
  pre_study: { label: 'Pre-Study Questions', referenceKey: 'preStudyQuestions' },
  instructions: { label: 'Activity Instructions', referenceKey: 'activityInstructions' },
  prototype_settings: { label: 'Prototype Settings', referenceKey: '' },
  post_study: { label: 'Post-Study Questions', referenceKey: 'postStudyQuestions' },
  survey: { label: 'Survey Questionnaire', referenceKey: 'surveyQuestionnaire' },
  thank_you: { label: 'Thank You Message', referenceKey: 'thankYou' },
  closed: { label: 'Closed Study Message', referenceKey: 'closedStudy' },
}

export function buildSystemPrompt(context: SystemPromptContext): string {
  switch (context.mode) {
    case 'results':
      return buildResultsPrompt(context)
    case 'builder':
      return buildBuilderPrompt(context)
    case 'dashboard':
      return buildDashboardPrompt(context)
    case 'projects':
      return buildProjectsPrompt(context)
    case 'create':
      return buildCreatePrompt(context)
    default:
      return buildResultsPrompt(context)
  }
}

// ---------------------------------------------------------------------------
// Shared compact sections
// ---------------------------------------------------------------------------

const CORE_RULES = `Rules: Be concise (2-4 sentences). Use bold, lists, tables. Never show UUIDs — use human names. Always query tools for real data. End ~80% of replies with chips: <<Option A|Option B>> (1-5 word labels, max 4, last line).
Efficiency: Call multiple independent tools in ONE turn (parallel tool calls). Never chain reads sequentially when they don't depend on each other. After writes, do NOT re-read to verify — trust the result and confirm to user.`

function compactIntegrations(context: SystemPromptContext): string {
  if (context.connectedIntegrations.length === 0) return ''
  return `Integrations: ${context.connectedIntegrations.join(', ')}. Use get_integration_tools to load actions, execute_integration_batch for multi-step ops.`
}

function compactPendingEvents(context: SystemPromptContext): string {
  if (!context.pendingEvents || context.pendingEvents.length === 0) return ''
  const lines = context.pendingEvents.map((e) => `${e.toolkit}/${e.triggerSlug}: ${e.summary}`)
  return `\nRecent events: ${lines.join('; ')}. Mention these to the user.`
}

// ---------------------------------------------------------------------------
// Mode-specific prompts
// ---------------------------------------------------------------------------

function buildResultsPrompt(context: SystemPromptContext): string {
  const completionRate = context.participantCount && context.participantCount > 0
    ? Math.round(((context.completedCount ?? 0) / context.participantCount) * 100)
    : 0
  return `You are Veritio AI, a UX research analyst. Read-only mode — analyze data, surface insights, export findings. Cannot modify studies.
Study: "${context.studyTitle}" (${formatStudyType(context.studyType ?? '')}, ${context.studyStatus}). ${context.participantCount ?? 0} participants, ${context.completedCount ?? 0} completed (${completionRate}%).
Overview is pre-loaded above — do NOT call get_study_overview. Jump straight to type-specific results tools. Call multiple analysis tools in ONE turn when possible.
CRITICAL: After getting data from 1-2 tool calls, STOP calling tools and write your analysis. If a tool errors, skip it and respond with what you have. Never retry failed tools or chase fallbacks. Export tools are ONLY for when user explicitly asks to export.
${compactIntegrations(context)}${compactPendingEvents(context)}
For exports: use export_study_data to get dataRef, then write_export_to_integration. Never copy raw data through LLM.
${CORE_RULES}`
}

function buildBuilderPrompt(context: SystemPromptContext): string {
  const preloaded = context.preloadedContext
  const hasPreloaded = !!(preloaded?.studyConfig || preloaded?.bestPractices || preloaded?.flowReference)

  let preloadedSections = ''
  if (hasPreloaded) {
    if (context.activeTab) {
      const sectionMeta = context.activeFlowSection ? FLOW_SECTION_META[context.activeFlowSection] : undefined
      if (context.activeTab === 'study-flow' && sectionMeta) {
        preloadedSections += `Tab: study-flow > ${sectionMeta.label}. `
      } else {
        preloadedSections += `Tab: ${context.activeTab}. `
      }
    }
    if (preloaded?.studyConfig) {
      const { study, flowSteps, tasks, flowQuestions, cards, categories } = preloaded.studyConfig
      const studySummary = study ? { id: study.id, title: study.title, study_type: study.study_type, status: study.status } : null
      const compactFlowSteps = flowSteps?.map((s: any) => ({ id: s.id, step_type: s.step_type, order_position: s.order_position }))
      const compactTasks = tasks?.map((t: any) => ({ id: t.id, title: t.title, order_position: t.order_position }))
      const compactQuestions = flowQuestions?.map((q: any) => ({ id: q.id, section: q.section, question_type: q.question_type, question_text: q.question_text, position: q.position }))
      preloadedSections += `\nConfig: ${JSON.stringify({ study: studySummary, flowSteps: compactFlowSteps, tasks: compactTasks, flowQuestions: compactQuestions })}\n`
      if (cards && cards.length > 0) {
        preloadedSections += `Cards(${cards.length}): ${JSON.stringify(cards.map((c: any) => ({ id: c.id, label: c.label })))}\n`
      }
      if (categories && categories.length > 0) {
        preloadedSections += `Categories(${categories.length}): ${JSON.stringify(categories.map((c: any) => ({ id: c.id, label: c.label })))}\n`
      }
    }
    // Section-specific data for active flow section
    const sectionMeta = context.activeFlowSection ? FLOW_SECTION_META[context.activeFlowSection] : undefined
    if (sectionMeta && preloaded?.studyConfig) {
      const { study, flowQuestions } = preloaded.studyConfig
      if (sectionMeta.referenceKey && study?.settings?.studyFlow) {
        const sectionData = study.settings.studyFlow[sectionMeta.referenceKey]
        if (sectionData) {
          preloadedSections += `Section "${sectionMeta.label}": ${JSON.stringify(sectionData)}\n`
        }
      }
      const questionSectionMap: Record<string, string> = { screening: 'screening', pre_study: 'pre_study', post_study: 'post_study', survey: 'survey' }
      const questionSection = context.activeFlowSection ? questionSectionMap[context.activeFlowSection] : undefined
      if (questionSection && flowQuestions) {
        const sectionQuestions = flowQuestions.filter((q: any) => q.section === questionSection)
        if (sectionQuestions.length > 0) {
          preloadedSections += `Questions: ${JSON.stringify(sectionQuestions)}\n`
        }
      }
    }
    if (preloaded?.bestPractices) {
      preloadedSections += `\nBest practices: ${preloaded.bestPractices}\n`
    }
    if (preloaded?.flowReference) {
      preloadedSections += `\nFlow ref: ${preloaded.flowReference}\n`
    }
  }

  const readInstr = hasPreloaded
    ? 'Config is pre-loaded above — do NOT call get_study_config, get_best_practices, or get_study_flow_reference.'
    : 'Call get_study_config to see current state before writing.'

  return `You are Veritio AI, helping configure a UX study. You can read AND write study config.
Study: "${context.studyTitle}" (${formatStudyType(context.studyType ?? '')}, ${context.studyStatus}).
${compactIntegrations(context)}
${preloadedSections}
${readInstr}
Write rules: Execute changes immediately (no "should I apply?" previews). Deletions need user confirmation. Use replace_all for bulk, add/update/remove for incremental. Settings are deep-merged. After changes, briefly confirm what was done.
Flow order: Welcome > Agreement > Screening > Identifier > Pre-Study > Instructions > Activity > Post-Study > Thank You. Use update_study_settings for flow sections (under studyFlow key). Use manage_flow_questions for screening/pre/post questions. Screening questions MUST have branching_logic with rejection rules.
HTML fields accept <p>,<ul>,<ol>,<li>,<strong>,<em>. Never show raw HTML in chat — just apply it and describe.
Attached images: URLs appear as [Attached image N]: https://... Use the FULL URL in image fields. Never fabricate URLs.
Minimize tool calls — combine fields into single calls. After writes, do NOT call get_study_config to verify — trust the result. No proactive validation unless user asks.
${CORE_RULES}`
}

function buildDashboardPrompt(context: SystemPromptContext): string {
  return `You are Veritio AI, helping with organization research overview. List studies, show metrics, compare across studies.
${compactIntegrations(context)}
${CORE_RULES}`
}

function buildProjectsPrompt(context: SystemPromptContext): string {
  return `You are Veritio AI, helping manage studies within a project. List project studies, show metrics, compare.
${compactIntegrations(context)}
${CORE_RULES}`
}

function buildCreatePrompt(context: SystemPromptContext): string {
  const preSelected: string[] = []
  if (context.preSelectedProjectId && context.preSelectedProjectName) {
    preSelected.push(`Project: "${context.preSelectedProjectName}" (${context.preSelectedProjectId}) — skip project selection.`)
  }
  if (context.preSelectedStudyType) {
    preSelected.push(`Type: ${context.preSelectedStudyType} — skip type selection.`)
  }
  const preSelectedSection = preSelected.length > 0 ? `Known: ${preSelected.join(' ')}` : ''

  // Phase 3: study already created
  if (context.createdStudyId && context.studyTitle && context.studyType) {
    return `You are Veritio AI, helping set up a UX study. Study "${context.studyTitle}" (${formatStudyType(context.studyType)}, ${context.studyStatus ?? 'draft'}) already exists (ID: ${context.createdStudyId}).
Phase 3: Study created. Do NOT re-create. Encourage builder as primary next step. Text-only responses (no components).
ASK before adding content — never auto-generate. Use update_study_settings and manage_flow_questions only.
${CORE_RULES}`
  }

  return `You are Veritio AI, helping create a UX study. Be conversational — no wizard steps, no numbering.
${preSelectedSection}
Flow: 1) Get study type 2) Get project (list_projects) 3) Suggest title 4) Card sort: ask sort mode 5) Call set_draft_basics then STOP 6) Ask for content, offer chips.
After set_draft_basics: ask user for study content based on type. Card sort→preview_cards, Tree test→preview_tree_nodes, Survey→preview_survey_questions, Live website→preview_live_website_tasks. Prototype/First click/First impression→create_complete_study (content in builder).
After preview tools, ALWAYS write follow-up text with next-step chips. After create_complete_study: text-only, encourage builder.
Suggest 10-15 items when asked. One question per reply. Be concise (2-3 sentences).
${CORE_RULES}`
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatStudyType(type: string): string {
  const map: Record<string, string> = {
    card_sort: 'Card Sort',
    tree_test: 'Tree Test',
    survey: 'Survey',
    prototype_test: 'Prototype Test',
    first_click: 'First Click',
    first_impression: 'First Impression',
    live_website_test: 'Live Website Test',
  }
  return map[type] || type
}
