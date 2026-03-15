import { z } from 'zod'
import { flowQuestionSectionSchema } from '../../../services/types'

export const ruleConditionSchema = z.object({
  id: z.string(),
  source: z.object({
    type: z.enum(['question', 'variable', 'section_complete', 'response_count']),
    questionId: z.string().optional(),
    variableName: z.string().optional(),
    section: flowQuestionSectionSchema.optional(),
  }),
  operator: z.string(),
  values: z.array(z.union([z.string(), z.number()])).optional(),
  valueRange: z.object({ min: z.number(), max: z.number() }).optional(),
})

export const conditionGroupSchema = z.object({
  id: z.string(),
  conditions: z.array(ruleConditionSchema),
  matchAll: z.boolean(),
})

export const actionTypeEnum = z.enum([
  'skip_to_question',
  'skip_to_section',
  'end_survey',
  'show_section',
  'hide_section',
  'set_variable',
])

export const triggerTypeEnum = z.enum(['on_answer', 'on_section_complete', 'on_question'])

export const ruleResponseSchema = z.object({
  id: z.string().uuid(),
  study_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  position: z.number(),
  is_enabled: z.boolean(),
  conditions: z.object({
    groups: z.array(conditionGroupSchema),
  }),
  action_type: z.string(),
  action_config: z.any(),
  trigger_type: z.string(),
  trigger_config: z.any(),
  created_at: z.string(),
  updated_at: z.string(),
})
