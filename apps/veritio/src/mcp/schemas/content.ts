/**
 * Per-content-type item schemas for `study_content_set`.
 *
 * One polymorphic tool replaces thirteen `manage_*` tools. The alternative —
 * a tool per content type per study type — is how you end up with a
 * hundred-tool server, which burns context before the model does anything and
 * measurably hurts tool selection.
 *
 * The item shape is validated here rather than in the tool's `inputSchema`
 * because a discriminated union at the schema *root* is rejected by the Claude
 * API. So the tool takes `items: object[]`, and this module checks each item
 * against the schema for the requested content type once the study's real type
 * is known.
 */

import { z } from 'zod4'

/** Content types, and which study type each belongs to. */
export const CONTENT_TYPES = {
  cards: 'card_sort',
  categories: 'card_sort',
  tree_nodes: 'tree_test',
  tree_tasks: 'tree_test',
  survey_questions: 'survey',
  survey_sections: 'survey',
  survey_rules: 'survey',
  prototype_tasks: 'prototype_test',
  first_click_tasks: 'first_click',
  first_impression_designs: 'first_impression',
  live_website_tasks: 'live_website_test',
  ab_tests: null, // valid on any study type
} as const

export type ContentType = keyof typeof CONTENT_TYPES

/** The assistant handler each content type routes to. */
export const CONTENT_TOOL: Record<ContentType, string> = {
  cards: 'manage_cards',
  categories: 'manage_categories',
  tree_nodes: 'manage_tree_nodes',
  tree_tasks: 'manage_tree_test_tasks',
  survey_questions: 'manage_survey_questions',
  survey_sections: 'manage_custom_sections',
  survey_rules: 'manage_survey_rules',
  prototype_tasks: 'manage_prototype_tasks',
  first_click_tasks: 'manage_first_click_tasks',
  first_impression_designs: 'manage_first_impression_designs',
  live_website_tasks: 'manage_live_website_tasks',
  ab_tests: 'manage_ab_tests',
}

/**
 * A stimulus image.
 *
 * `figma_file_key` / `figma_node_id` are OPTIONAL PROVENANCE and are not needed to
 * render anything: they record which Figma frame this picture is OF, so a tool that
 * imported the design can later ask "which studies tested this frame?" without
 * keeping a mapping table of its own. Both columns have always existed on
 * `first_click_images` and `first_impression_designs` — nothing could write them
 * over MCP, so a study created by an integration was invisible to the integration
 * that created it.
 */
const image = z
  .object({
    url: z.string().url(),
    alt: z.string().optional(),
    figma_file_key: z.string().min(1).max(255).optional(),
    figma_node_id: z.string().min(1).max(255).optional(),
  })
  .strict()

export const QUESTION_TYPES = [
  'single_line_text',
  'multi_line_text',
  'multiple_choice',
  'yes_no',
  'opinion_scale',
  'nps',
  'slider',
  'ranking',
  'matrix',
  'constant_sum',
  'semantic_differential',
  'image_choice',
  'audio_response',
] as const

const questionItem = z.object({
  id: z.string().optional().describe('Omit to add; supply to update.'),
  question_type: z.enum(QUESTION_TYPES).optional(),
  question_text: z.string().min(1).optional(),
  description: z.string().optional(),
  is_required: z.boolean().optional(),
  config: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Type-specific config. multiple_choice: {mode,options:[{label}]}. opinion_scale: ' +
        '{scalePoints,leftLabel,rightLabel}. ranking: {items:[{label}]}. matrix: {rows:[{label}],columns:[{label}]}. ' +
        'Always use meaningful labels, never placeholders.',
    ),
  display_logic: z.record(z.string(), z.unknown()).optional(),
  survey_branching_logic: z.record(z.string(), z.unknown()).optional(),
  custom_section_id: z.string().optional(),
})

export const CONTENT_ITEM_SCHEMAS: Record<ContentType, z.ZodType> = {
  cards: z.object({
    id: z.string().optional(),
    label: z.string().min(1).optional(),
    description: z.string().optional(),
    image: image.optional(),
  }),
  categories: z.object({
    id: z.string().optional(),
    label: z.string().min(1).optional(),
    description: z.string().optional(),
  }),
  tree_nodes: z.object({
    id: z.string().optional(),
    temp_id: z.string().optional().describe('Use with replace_all so children can reference a parent in the same call.'),
    label: z.string().min(1).optional(),
    parent_id: z.string().nullish().describe('Parent node id or temp_id. Null or omitted for a root node.'),
  }),
  tree_tasks: z.object({
    id: z.string().optional(),
    title: z.string().min(1).optional().describe('The task prompt shown to the participant.'),
    description: z.string().optional(),
    correct_node_id: z.string().optional().describe('The node that counts as success.'),
  }),
  survey_questions: questionItem,
  survey_sections: z.object({
    id: z.string().optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    is_visible: z.boolean().optional(),
  }),
  survey_rules: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    is_enabled: z.boolean().optional(),
    trigger_type: z.enum(['on_answer', 'on_question', 'on_section_complete']).optional(),
    trigger_config: z.record(z.string(), z.unknown()).optional(),
    action_type: z
      .enum([
        'skip_to_question',
        'skip_to_section',
        'skip_to_custom_section',
        'end_survey',
        'show_section',
        'hide_section',
        'show_custom_section',
        'hide_custom_section',
      ])
      .optional(),
    action_config: z.record(z.string(), z.unknown()).optional(),
    conditions: z.record(z.string(), z.unknown()).optional(),
  }),
  prototype_tasks: z.object({
    id: z.string().optional(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
  }),
  first_click_tasks: z.object({
    id: z.string().optional(),
    instruction: z.string().min(1).optional(),
    image: image.optional().describe('Must be an already-uploaded asset URL.'),
  }),
  first_impression_designs: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    image: image.optional(),
    is_practice: z.boolean().optional(),
    questions: z.array(z.record(z.string(), z.unknown())).optional(),
  }),
  live_website_tasks: z.object({
    id: z.string().optional(),
    title: z.string().min(1).optional(),
    instructions: z.string().optional(),
    target_url: z.string().url().optional(),
    success_url: z.string().url().optional(),
    success_criteria_type: z.enum(['self_reported', 'url_match', 'exact_path']).optional(),
    time_limit_seconds: z.number().int().positive().optional(),
    post_task_questions: z.array(z.record(z.string(), z.unknown())).optional(),
  }),
  ab_tests: z.object({
    id: z.string().optional(),
    question_id: z.string().optional(),
    variant_b_content: z.record(z.string(), z.unknown()).optional(),
    split_percentage: z.number().min(0).max(100).optional(),
    is_enabled: z.boolean().optional(),
  }),
}

/** Content types valid for a given study type. */
export function contentTypesFor(studyType: string): ContentType[] {
  return (Object.keys(CONTENT_TYPES) as ContentType[]).filter((c) => {
    const owner = CONTENT_TYPES[c]
    return owner === null || owner === studyType
  })
}

export function validateItems(
  contentType: ContentType,
  items: unknown[],
): { ok: true; value: Record<string, unknown>[] } | { ok: false; errors: string[] } {
  const schema = CONTENT_ITEM_SCHEMAS[contentType]
  const out: Record<string, unknown>[] = []
  const errors: string[] = []

  items.forEach((item, index) => {
    const result = schema.safeParse(item)
    if (result.success) out.push(result.data as Record<string, unknown>)
    else {
      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        errors.push(`items[${index}]${path ? `.${path}` : ''}: ${issue.message}`)
      }
    }
  })

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: out }
}
