/**
 * Copying a study's content into a freshly created shell.
 *
 * This used to live inside `steps/events/process-study-duplication.step.ts`,
 * which made duplication reachable only by enqueuing an engine event. `enqueue`
 * is an iii-engine primitive with no equivalent in a Next.js route handler, so
 * the public API and the MCP server could create the shell study and never
 * populate it — reporting success while producing an empty study.
 *
 * Extracting it here gives both callers one implementation. The event step still
 * owns the async path (and the notifications around it); the API calls this
 * directly and waits, which is the right trade for a request that must return a
 * usable study.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { planBrandingAssetDuplication } from './branding-assets'
import type { BrandingSettings } from '../../components/builders/shared/types'

export interface DuplicationCounts {
  cards: number
  categories: number
  tree_nodes: number
  tasks: number
  flow_questions: number
  branding_assets: number
}

export interface DuplicationLogger {
  info: (message: string, meta?: Record<string, unknown>) => void
  error: (message: string, meta?: Record<string, unknown>) => void
}

const NO_OP_LOGGER: DuplicationLogger = { info: () => {}, error: () => {} }

/**
 * Copy every content row from one study to another.
 *
 * Throws on failure rather than returning `{ error }`: a partially populated
 * duplicate is worse than a reported failure, and both callers need to know.
 */
export async function duplicateStudyContent(
  supabase: SupabaseClient,
  params: { originalStudyId: string; newStudyId: string; logger?: DuplicationLogger },
): Promise<DuplicationCounts> {
  const { originalStudyId, newStudyId } = params
  const logger = params.logger ?? NO_OP_LOGGER
  const db = supabase as never as SupabaseClient<never>

  const [cardsResult, categoriesResult, treeNodesResult, tasksResult, flowQuestionsResult, studyResult] =
    await Promise.all([
      (db as any).from('cards').select('*').eq('study_id', originalStudyId).order('position'),
      (db as any).from('categories').select('*').eq('study_id', originalStudyId).order('position'),
      (db as any).from('tree_nodes').select('*').eq('study_id', originalStudyId).order('position'),
      (db as any).from('tasks').select('*').eq('study_id', originalStudyId).order('position'),
      (db as any).from('study_flow_questions').select('*').eq('study_id', originalStudyId).order('position'),
      (db as any).from('studies').select('branding').eq('id', originalStudyId).single(),
    ])

  const originalCards = cardsResult.data || []
  const originalCategories = categoriesResult.data || []
  const originalTreeNodes = treeNodesResult.data || []
  const originalTasks = tasksResult.data || []
  const originalFlowQuestions = flowQuestionsResult.data || []

  const brandingPlan = planBrandingAssetDuplication(
    studyResult.data?.branding as BrandingSettings | null | undefined,
    originalStudyId,
    newStudyId,
  )

  for (const asset of brandingPlan.copies) {
    const { error: copyError } = await supabase.storage
      .from('study-assets')
      .copy(asset.fromPath, asset.toPath)
    if (copyError) {
      throw new Error(`Failed to copy branding asset ${asset.fromPath}: ${copyError.message}`)
    }
  }

  if (brandingPlan.branding) {
    const { error: brandingError } = await (supabase as any)
      .from('studies')
      .update({ branding: brandingPlan.branding })
      .eq('id', newStudyId)
    if (brandingError) throw brandingError
    logger.info(`Duplicated ${brandingPlan.copies.length} branding assets`)
  }

  const treeNodeIdMap = new Map<string, string>()

  if (originalCards.length > 0) {
    const newCards = originalCards.map((card: any) => ({
      study_id: newStudyId,
      label: card.label,
      description: card.description,
      position: card.position,
    }))
    const { error } = await (supabase as any).from('cards').insert(newCards)
    if (error) throw error
    logger.info(`Duplicated ${newCards.length} cards`)
  }

  if (originalCategories.length > 0) {
    const newCategories = originalCategories.map((category: any) => ({
      study_id: newStudyId,
      label: category.label,
      description: category.description,
      position: category.position,
      min_cards: category.min_cards,
      max_cards: category.max_cards,
    }))
    const { error } = await (supabase as any).from('categories').insert(newCategories)
    if (error) throw error
    logger.info(`Duplicated ${newCategories.length} categories`)
  }

  // Tree nodes must preserve hierarchy. Insert one depth level per batch — D
  // round trips instead of N — mapping old ids to new as each level lands.
  if (originalTreeNodes.length > 0) {
    const childrenByParent = new Map<string | null, any[]>()
    for (const node of originalTreeNodes) {
      const key = node.parent_id ?? null
      if (!childrenByParent.has(key)) childrenByParent.set(key, [])
      childrenByParent.get(key)!.push(node)
    }

    let currentLevel: any[] = childrenByParent.get(null) ?? []
    let isRoot = true

    while (currentLevel.length > 0) {
      const batchRows = currentLevel.map((node) => ({
        study_id: newStudyId,
        label: node.label,
        parent_id: isRoot ? null : (treeNodeIdMap.get(node.parent_id!) ?? null),
        position: node.position,
      }))

      const { data: insertedNodes, error: insertError } = await (supabase as any)
        .from('tree_nodes')
        .insert(batchRows)
        .select()

      if (insertError) {
        logger.error('Failed to insert tree node batch', { error: insertError })
        throw insertError
      }

      // Supabase preserves insert order, so positional mapping is safe here.
      const inserted = insertedNodes ?? []
      for (let i = 0; i < currentLevel.length; i++) {
        if (inserted[i]) treeNodeIdMap.set(currentLevel[i].id, inserted[i].id)
      }

      const nextLevel: any[] = []
      for (const node of currentLevel) {
        const children = childrenByParent.get(node.id)
        if (children) nextLevel.push(...children)
      }

      currentLevel = nextLevel
      isRoot = false
    }

    logger.info(`Duplicated ${treeNodeIdMap.size} tree nodes`)
  }

  if (originalTasks.length > 0) {
    const newTasks = originalTasks.map((task: any) => ({
      study_id: newStudyId,
      question: task.question,
      correct_node_id: task.correct_node_id ? treeNodeIdMap.get(task.correct_node_id) || null : null,
      position: task.position,
    }))
    const { error } = await (supabase as any).from('tasks').insert(newTasks)
    if (error) throw error
    logger.info(`Duplicated ${newTasks.length} tasks`)
  }

  if (originalFlowQuestions.length > 0) {
    const newQuestions = originalFlowQuestions.map((q: any) => ({
      study_id: newStudyId,
      section: q.section,
      question_type: q.question_type,
      question_text: q.question_text,
      question_text_html: q.question_text_html,
      is_required: q.is_required,
      config: q.config,
      display_logic: q.display_logic,
      branching_logic: q.branching_logic,
      position: q.position,
    }))
    const { error } = await (supabase as any).from('study_flow_questions').insert(newQuestions)
    if (error) throw error
    logger.info(`Duplicated ${newQuestions.length} flow questions`)
  }

  return {
    cards: originalCards.length,
    categories: originalCategories.length,
    tree_nodes: treeNodeIdMap.size,
    tasks: originalTasks.length,
    flow_questions: originalFlowQuestions.length,
    branding_assets: brandingPlan.copies.length,
  }
}

/**
 * Create the duplicate's shell row.
 *
 * Never copies `share_code` (regenerated), `launched_at` or `closed_at`, and
 * always lands in `draft` — a duplicate must not inherit a live study's public
 * URL or start collecting responses the moment it exists.
 */
export async function createStudyDuplicateShell(
  supabase: SupabaseClient,
  originalStudyId: string,
  title?: string,
): Promise<{ id: string; title: string; project_id: string; study_type: string }> {
  const { data: original, error: readError } = await (supabase as any)
    .from('studies')
    .select('*')
    .eq('id', originalStudyId)
    .single()

  if (readError || !original) throw new Error('Study not found')

  const { data: created, error: createError } = await (supabase as any)
    .from('studies')
    .insert({
      project_id: original.project_id,
      user_id: original.user_id,
      study_type: original.study_type,
      title: title || `${original.title} (Copy)`,
      description: original.description,
      status: 'draft',
      settings: original.settings,
      welcome_message: original.welcome_message,
      thank_you_message: original.thank_you_message,
      branding: original.branding,
    })
    .select()
    .single()

  if (createError || !created) throw new Error('Failed to create duplicate study')
  return created
}
