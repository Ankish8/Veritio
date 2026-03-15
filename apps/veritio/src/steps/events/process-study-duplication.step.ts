import type { StepConfig } from 'motia'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'

const inputSchema = z.object({
  originalStudyId: z.string().uuid(),
  newStudyId: z.string().uuid(),
  userId: z.string(),
})

export const config = {
  name: 'ProcessStudyDuplication',
  description: 'Handle heavy lifting for study cloning (cards, categories, tree nodes, tasks, flow questions)',
  triggers: [{
    type: 'queue',
    topic: 'study-duplication-requested',
    input: inputSchema as any,
    infrastructure: {
      handler: { timeout: 60 },
      queue: { maxRetries: 3 },
    },
  }],
  enqueues: ['notification'],
  flows: ['study-management'],
} satisfies StepConfig

export const handler = async (input: z.infer<typeof inputSchema>, { logger, enqueue }: EventHandlerContext) => {
  const data = inputSchema.parse(input)
  const supabase = getMotiaSupabaseClient()

  logger.info(`Starting study duplication from ${data.originalStudyId} to ${data.newStudyId}`)

  try {
    const [cardsResult, categoriesResult, treeNodesResult, tasksResult, flowQuestionsResult] = await Promise.all([
      supabase.from('cards').select('*').eq('study_id', data.originalStudyId).order('position'),
      supabase.from('categories').select('*').eq('study_id', data.originalStudyId).order('position'),
      supabase.from('tree_nodes').select('*').eq('study_id', data.originalStudyId).order('position'),
      supabase.from('tasks').select('*').eq('study_id', data.originalStudyId).order('position'),
      supabase.from('study_flow_questions').select('*').eq('study_id', data.originalStudyId).order('position'),
    ])

    const originalCards = cardsResult.data || []
    const originalCategories = categoriesResult.data || []
    const originalTreeNodes = treeNodesResult.data || []
    const originalTasks = tasksResult.data || []
    const originalFlowQuestions = flowQuestionsResult.data || []

    const treeNodeIdMap = new Map<string, string>()

    if (originalCards.length > 0) {
      const newCards = originalCards.map((card) => ({
        study_id: data.newStudyId,
        label: card.label,
        description: card.description,
        position: card.position,
      }))
      await supabase.from('cards').insert(newCards)
      logger.info(`Duplicated ${newCards.length} cards`)
    }

    if (originalCategories.length > 0) {
      const newCategories = originalCategories.map((category) => ({
        study_id: data.newStudyId,
        label: category.label,
        description: category.description,
        position: category.position,
      }))
      await supabase.from('categories').insert(newCategories)
      logger.info(`Duplicated ${newCategories.length} categories`)
    }

    // Duplicate tree nodes (must preserve hierarchy)
    // Strategy: batch insert by depth level — D inserts instead of N inserts
    if (originalTreeNodes.length > 0) {
      // Build a children-by-parent lookup for BFS traversal
      const childrenByParent = new Map<string | null, typeof originalTreeNodes>()
      for (const node of originalTreeNodes) {
        const key = node.parent_id ?? null
        if (!childrenByParent.has(key)) childrenByParent.set(key, [])
        childrenByParent.get(key)!.push(node)
      }

      // BFS level order: process one depth level per bulk insert
      let currentLevel = childrenByParent.get(null) ?? []
      let isRoot = true

      while (currentLevel.length > 0) {
        const batchRows = currentLevel.map((node) => ({
          study_id: data.newStudyId,
          label: node.label,
          parent_id: isRoot ? null : treeNodeIdMap.get(node.parent_id!) ?? null,
          position: node.position,
        }))

        const { data: insertedNodes, error: insertError } = await supabase
          .from('tree_nodes')
          .insert(batchRows)
          .select()

        if (insertError) {
          logger.error('Failed to insert tree node batch', { error: insertError })
          throw insertError
        }

        // Map old IDs to new IDs in insertion order (Supabase preserves insert order)
        const inserted = insertedNodes ?? []
        for (let i = 0; i < currentLevel.length; i++) {
          if (inserted[i]) {
            treeNodeIdMap.set(currentLevel[i].id, inserted[i].id)
          }
        }

        // Collect next level: all children whose parents were just inserted
        const nextLevel: typeof originalTreeNodes = []
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
      const newTasks = originalTasks.map((task) => ({
        study_id: data.newStudyId,
        question: task.question,
        correct_node_id: task.correct_node_id ? treeNodeIdMap.get(task.correct_node_id) || null : null,
        position: task.position,
      }))
      await supabase.from('tasks').insert(newTasks)
      logger.info(`Duplicated ${newTasks.length} tasks`)
    }

    if (originalFlowQuestions.length > 0) {
      const newQuestions = originalFlowQuestions.map((q) => ({
        study_id: data.newStudyId,
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
      await supabase.from('study_flow_questions').insert(newQuestions)
      logger.info(`Duplicated ${newQuestions.length} flow questions`)
    }

    enqueue({
      topic: 'notification',
      data: {
        userId: data.userId,
        type: 'study-duplication-complete',
        title: 'Study duplicated successfully',
        message: `Your study has been duplicated and is ready for editing.`,
        studyId: data.newStudyId,
      },
    }).catch(() => {})

    logger.info(`Study duplication completed successfully`)
  } catch (error) {
    logger.error('Study duplication failed', { error })

    enqueue({
      topic: 'notification',
      data: {
        userId: data.userId,
        type: 'study-duplication-failed',
        title: 'Study duplication failed',
        message: 'There was an error duplicating your study. Please try again.',
        originalStudyId: data.originalStudyId,
      },
    }).catch(() => {})
  }
}
