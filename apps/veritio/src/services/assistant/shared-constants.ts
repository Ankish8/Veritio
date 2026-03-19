/**
 * Shared constants for the AI assistant create and builder tools.
 */

/** Study types that require the builder UI for content — created empty via AI chat */
export const BUILDER_ONLY_TYPES = new Set(['prototype_test', 'first_click', 'first_impression'])

/** All valid study types, derived from STUDY_TYPE_INFO */
export const VALID_STUDY_TYPES = [
  'card_sort',
  'tree_test',
  'survey',
  'prototype_test',
  'first_click',
  'first_impression',
  'live_website_test',
] as const

/** Question type enum values used across tool definitions */
export const QUESTION_TYPE_ENUM = [
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
] as const
