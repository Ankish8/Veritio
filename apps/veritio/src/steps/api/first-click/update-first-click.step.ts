import type { StepConfig } from '@/lib/motia/types'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const TaskSchema = z.object({
  id: z.string(),
  instruction: z.string(),
  position: z.number(),
  post_task_questions: z.any(),
  image: z
    .object({
      id: z.string(),
      image_url: z.string(),
      original_filename: z.string().nullable(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      source_type: z.enum(['upload', 'figma']),
      figma_file_key: z.string().nullable(),
      figma_node_id: z.string().nullable(),
    })
    .nullable(),
  aois: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
        position: z.number(),
      })
    )
    .default([]),
})

const bodySchema = z.object({
  tasks: z.array(TaskSchema),
})

export const config = {
  name: 'UpdateFirstClick',
  triggers: [
    {
      type: 'http',
      method: 'PUT',
      path: '/api/studies/:studyId/first-click',
      middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    },
  ],
  enqueues: [],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { studyId } = req.pathParams
  const supabase = getMotiaSupabaseClient()

  try {
    const { tasks } = bodySchema.parse(req.body)
    const [existingTasksResult, existingImagesResult, existingAoisResult] = await Promise.all([
      supabase.from('first_click_tasks').select('id').eq('study_id', studyId),
      supabase.from('first_click_images').select('id').eq('study_id', studyId),
      supabase.from('first_click_aois').select('id').eq('study_id', studyId),
    ])
    if (existingTasksResult.error) throw existingTasksResult.error
    if (existingImagesResult.error) throw existingImagesResult.error
    if (existingAoisResult.error) throw existingAoisResult.error

    // Settings are persisted through the study PATCH so content and study-flow
    // settings have one authoritative whole-document writer.
    //
    // Upsert before deleting stale rows. The former delete-all/insert cycle
    // cascaded into first_click_responses and erased participant results on
    // every builder autosave.
    if (tasks.length > 0) {
      const { error: taskError } = await supabase.from('first_click_tasks').upsert(
        tasks.map((task) => ({
          id: task.id,
          study_id: studyId,
          instruction: task.instruction,
          position: task.position,
          post_task_questions: task.post_task_questions,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'id' }
      )

      if (taskError) throw taskError
    }

    // Batch upsert all images
    const tasksWithImages = tasks.filter((t) => t.image)
    if (tasksWithImages.length > 0) {
      const { error: imageError } = await supabase.from('first_click_images').upsert(
        tasksWithImages.map((task) => ({
          id: task.image!.id,
          task_id: task.id,
          study_id: studyId,
          image_url: task.image!.image_url,
          original_filename: task.image!.original_filename,
          width: task.image!.width,
          height: task.image!.height,
          source_type: task.image!.source_type,
          figma_file_key: task.image!.figma_file_key,
          figma_node_id: task.image!.figma_node_id,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'id' }
      )

      if (imageError) throw imageError
    }

    // Batch upsert all AOIs
    const allAois = tasks.flatMap((task) =>
      task.image
        ? task.aois.map((aoi) => ({
            id: aoi.id,
            image_id: task.image!.id,
            task_id: task.id,
            study_id: studyId,
            name: aoi.name,
            x: aoi.x,
            y: aoi.y,
            width: aoi.width,
            height: aoi.height,
            position: aoi.position,
          }))
        : []
    )
    if (allAois.length > 0) {
      const { error: aoisError } = await supabase.from('first_click_aois').upsert(
        allAois.map((aoi) => ({
          ...aoi,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'id' }
      )

      if (aoisError) throw aoisError
    }

    // Delete only records the user actually removed, after every upsert succeeds.
    // Child-first ordering avoids foreign-key failures for removed tasks/images.
    const imageIds = tasksWithImages.map((task) => task.image!.id)
    const taskIds = tasks.map((task) => task.id)
    const incomingAoiIds = new Set(allAois.map((aoi) => aoi.id))
    const incomingImageIds = new Set(imageIds)
    const incomingTaskIds = new Set(taskIds)
    const staleAoiIds = (existingAoisResult.data || []).map((row) => row.id).filter((id) => !incomingAoiIds.has(id))
    const staleImageIds = (existingImagesResult.data || []).map((row) => row.id).filter((id) => !incomingImageIds.has(id))
    const staleTaskIds = (existingTasksResult.data || []).map((row) => row.id).filter((id) => !incomingTaskIds.has(id))

    if (staleAoiIds.length > 0) {
      const { error } = await supabase.from('first_click_aois').delete().eq('study_id', studyId).in('id', staleAoiIds)
      if (error) throw error
    }
    if (staleImageIds.length > 0) {
      const { error } = await supabase.from('first_click_images').delete().eq('study_id', studyId).in('id', staleImageIds)
      if (error) throw error
    }
    if (staleTaskIds.length > 0) {
      const { error } = await supabase.from('first_click_tasks').delete().eq('study_id', studyId).in('id', staleTaskIds)
      if (error) throw error
    }

    return { status: 200, body: { success: true } }
  } catch (error) {
    logger.error('Failed to update first-click data', { error, studyId })
    return {
      status: 500,
      body: { error: 'Failed to update first-click data' },
    }
  }
}
