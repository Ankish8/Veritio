import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { createDesign } from '../../../services/first-impression-service'

const QuestionConfigSchema = z.any() // Use any for flexible question config

const DesignQuestionSchema = z.object({
  id: z.string(),
  question_type: z.string(),
  question_text: z.string(),
  question_text_html: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  is_required: z.boolean(),
  config: QuestionConfigSchema,
  image: z.object({
    url: z.string(),
    alt: z.string().optional(),
    filename: z.string().optional(),
  }).nullable().optional(),
  position: z.number(),
})

const bodySchema = z.object({
  name: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  original_filename: z.string().nullable().optional(),
  source_type: z.enum(['upload', 'figma']).optional(),
  figma_file_key: z.string().nullable().optional(),
  figma_node_id: z.string().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  mobile_image_url: z.string().nullable().optional(),
  mobile_width: z.number().nullable().optional(),
  mobile_height: z.number().nullable().optional(),
  display_mode: z.enum(['fit', 'fill', 'actual', 'hidpi']).optional(),
  background_color: z.string().optional(),
  weight: z.number().min(0).max(100).optional(),
  is_practice: z.boolean().optional(),
  questions: z.array(DesignQuestionSchema).optional(),
})

export const config = {
  name: 'CreateFirstImpressionDesign',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/first-impression/designs',
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { studyId } = req.pathParams
  const input = bodySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  try {
    const { data: design, error } = await createDesign(supabase, studyId, input as any)

    if (error) {
      throw error
    }

    return {
      status: 201,
      body: { design },
    }
  } catch (error) {
    logger.error('Failed to create first impression design', { error, studyId })
    return {
      status: 500,
      body: { error: 'Failed to create first impression design' },
    }
  }
}
