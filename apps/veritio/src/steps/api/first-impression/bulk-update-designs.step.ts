import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { SupabaseClient } from '@supabase/supabase-js'
import { invalidateFirstImpressionCache } from '../../../services/first-impression-service'

const QuestionSchema = z.object({
  id: z.string(),
  position: z.number(),
  question_type: z.string(),
  question_text: z.string(),
  question_text_html: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  is_required: z.boolean(),
  config: z.any(),
  image: z.object({
    url: z.string(),
    alt: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }).nullable().optional(),
})

const DesignSchema = z.object({
  id: z.string(),
  study_id: z.string(),
  name: z.string().nullable().optional(),
  position: z.number(),
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
  weight: z.number().optional(),
  is_practice: z.boolean().optional(),
  questions: z.array(QuestionSchema).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

const bodySchema = z.object({
  designs: z.array(DesignSchema),
})

export const config = {
  name: 'BulkUpdateFirstImpressionDesigns',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/studies/:studyId/first-impression/designs/reorder',
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { studyId } = req.pathParams
  const { designs } = bodySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient() as SupabaseClient

  // Debug: Log incoming design data
  logger.info('Bulk update designs received', {
    studyId,
    designCount: designs.length,
    designs: designs.map(d => ({
      id: d.id,
      name: d.name,
      image_url: d.image_url ? `${d.image_url.substring(0, 50)}...` : null,
      hasImage: !!d.image_url,
    })),
  })

  try {
    // Get current design IDs from database
    const { data: existingDesigns, error: fetchError } = await supabase
      .from('first_impression_designs')
      .select('id')
      .eq('study_id', studyId)

    if (fetchError) {
      logger.error('Failed to fetch existing designs', { error: fetchError, studyId })
      return { status: 500, body: { error: 'Failed to fetch existing designs' } }
    }

    // Find designs to delete (exist in DB but not in the new list)
    const newDesignIds = new Set(designs.map(d => d.id))
    const designsToDelete = (existingDesigns || [])
      .filter(d => !newDesignIds.has(d.id))
      .map(d => d.id)

    // Delete removed designs first
    if (designsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('first_impression_designs')
        .delete()
        .in('id', designsToDelete)

      if (deleteError) {
        logger.error('Failed to delete removed designs', { error: deleteError, studyId, designsToDelete })
        return { status: 500, body: { error: 'Failed to delete removed designs' } }
      }

      logger.info('Deleted removed designs', { studyId, deletedCount: designsToDelete.length })
    }

    // Upsert remaining designs (insert if new, update if exists)
    const upsertPromises = designs.map((design, index) =>
      supabase
        .from('first_impression_designs')
        .upsert({
          id: design.id,
          study_id: studyId,
          position: index,
          name: design.name ?? null,
          image_url: design.image_url ?? null,
          original_filename: design.original_filename ?? null,
          source_type: design.source_type ?? 'upload',
          figma_file_key: design.figma_file_key ?? null,
          figma_node_id: design.figma_node_id ?? null,
          width: design.width ?? null,
          height: design.height ?? null,
          mobile_image_url: design.mobile_image_url ?? null,
          mobile_width: design.mobile_width ?? null,
          mobile_height: design.mobile_height ?? null,
          display_mode: design.display_mode ?? 'fit',
          background_color: design.background_color ?? '#ffffff',
          weight: design.weight ?? 100,
          is_practice: design.is_practice ?? false,
          questions: design.questions ?? [],
        }, { onConflict: 'id' })
    )

    const results = await Promise.all(upsertPromises)

    // Check for errors
    const errorResult = results.find((r) => r.error)
    if (errorResult?.error) {
      logger.error('Failed to update first impression designs', {
        error: errorResult.error,
        studyId,
      })
      return {
        status: 500,
        body: { error: 'Failed to update designs' },
      }
    }

    // Invalidate cache
    invalidateFirstImpressionCache(studyId)

    logger.info('First impression designs updated', {
      studyId,
      designCount: designs.length,
    })

    return {
      status: 200,
      body: { success: true, updatedCount: designs.length },
    }
  } catch (error) {
    logger.error('Failed to bulk update first impression designs', { error, studyId })
    return {
      status: 500,
      body: { error: 'Failed to update first impression designs' },
    }
  }
}
