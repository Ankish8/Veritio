/**
 * Reading a study's content, whatever its methodology.
 *
 * The write side has had a single polymorphic entry point for a while
 * (`executeBuilderWriteTool` plus the `CONTENT_TOOL` map). The read side never
 * did — each caller reached for whichever per-type service it happened to know
 * about — which is why neither the MCP server nor the public API could offer
 * "show me this study's content" without a switch statement of its own.
 *
 * One reader map, consumed by both.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { listCards } from './card-service'
import { listCategories } from './category-service'
import { listTreeNodes } from './tree-node-service'
import { listTasks } from './task-service'
import { listFlowQuestions } from './flow-question-service'
import { listSurveySections } from './survey-sections-service'
import { listSurveyRules } from './survey-rules-service'
import { listPrototypeTasks } from './prototype-task-service'
import { listDesigns } from './first-impression-service'
import { getTasks as getLiveWebsiteTasks } from './live-website-service'
import { getABTestsForStudy } from './ab-test-service'
import type { ContentType } from '../mcp/schemas/content'

/** Sections of the participant journey that hold questions. */
export const FLOW_QUESTION_SECTIONS = {
  screening: 'screening',
  preStudyQuestions: 'pre_study',
  postStudyQuestions: 'post_study',
} as const

export type FlowQuestionSection = keyof typeof FLOW_QUESTION_SECTIONS

type Reader = (supabase: SupabaseClient, studyId: string) => Promise<unknown[]>

/** Services signal failure by returning `{ error }`; surface it as a throw. */
async function unwrap(
  promise: Promise<{ data: unknown; error?: Error | null }>,
): Promise<unknown[]> {
  const { data, error } = await promise
  if (error) throw error
  return Array.isArray(data) ? data : []
}

const READERS: Record<ContentType, Reader> = {
  cards: (s, id) => unwrap(listCards(s as never, id)),
  categories: (s, id) => unwrap(listCategories(s as never, id)),
  tree_nodes: (s, id) => unwrap(listTreeNodes(s as never, id)),
  tree_tasks: (s, id) => unwrap(listTasks(s as never, id)),
  // Survey questions are flow questions in the `survey` section — the same
  // storage the participant journey uses, which is why they round-trip through
  // `manage_flow_questions` on write.
  survey_questions: (s, id) => unwrap(listFlowQuestions(s as never, id, 'survey' as never)),
  survey_sections: (s, id) => unwrap(listSurveySections(s as never, id)),
  survey_rules: (s, id) => unwrap(listSurveyRules(s as never, id)),
  prototype_tasks: (s, id) => unwrap(listPrototypeTasks(s as never, id)),
  first_click_tasks: async (s, id) => {
    // No service layer for these yet; the write handler also goes direct.
    /*
     * THE IMAGE IS JOINED, and it is the point of the task.
     *
     * This used to select the task row alone, so a first-click task read back
     * carrying no stimulus at all — identical output whether the image had been
     * set or never supplied. A caller that had just written one could not confirm
     * it landed, and a caller reading someone else's study could not tell a
     * configured task from an empty one.
     */
    const { data, error } = await s
      .from('first_click_tasks')
      .select('*, first_click_images(id, image_url, figma_file_key, figma_node_id, source_type, width, height)')
      .eq('study_id', id)
      .order('position', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => {
      const { first_click_images: images, ...task } = row as Record<string, unknown> & {
        first_click_images?: Array<Record<string, unknown>>
      }
      const picture = Array.isArray(images) ? images[0] : images
      return {
        ...task,
        // Flattened to `image`, matching the shape `study_content_set` accepts, so
        // a read can be edited and written straight back.
        image: picture
          ? {
              url: picture.image_url,
              ...(picture.figma_file_key ? { figma_file_key: picture.figma_file_key } : {}),
              ...(picture.figma_node_id ? { figma_node_id: picture.figma_node_id } : {}),
            }
          : null,
      }
    })
  },
  first_impression_designs: (s, id) => unwrap(listDesigns(s as never, id)),
  live_website_tasks: (s, id) => unwrap(getLiveWebsiteTasks(s as never, id)),
  ab_tests: (s, id) => unwrap(getABTestsForStudy(s as never, id)),
}

/** Read one content collection for a study, in display order. */
export async function readStudyContent(
  supabase: SupabaseClient,
  studyId: string,
  contentType: ContentType,
): Promise<unknown[]> {
  return READERS[contentType](supabase, studyId)
}

/** Read the questions attached to one journey section. */
export async function readFlowQuestions(
  supabase: SupabaseClient,
  studyId: string,
  section: FlowQuestionSection,
): Promise<unknown[]> {
  return unwrap(
    listFlowQuestions(supabase as never, studyId, FLOW_QUESTION_SECTIONS[section] as never),
  )
}
