import type { StepConfig } from 'motia'
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
  image: z.object({
    id: z.string(),
    image_url: z.string(),
    original_filename: z.string().nullable(),
    width: z.number().nullable(),
    height: z.number().nullable(),
    source_type: z.enum(['upload', 'figma']),
    figma_file_key: z.string().nullable(),
    figma_node_id: z.string().nullable(),
  }).nullable(),
  aois: z.array(z.object({
    id: z.string(),
    name: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    position: z.number(),
  })).default([]),
})

const bodySchema = z.object({
  tasks: z.array(TaskSchema),
  settings: z.any(),
})

export const config = {
  name: 'UpdateFirstClick',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/studies/:studyId/first-click',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { studyId } = req.pathParams
  const supabase = getMotiaSupabaseClient()

  try {
    const { tasks, settings } = bodySchema.parse(req.body)

    // Update settings and delete existing tasks in parallel (cascade handles children)
    const [settingsResult, deleteResult] = await Promise.all([
      supabase.from('studies').update({ settings }).eq('id', studyId),
      supabase.from('first_click_tasks').delete().eq('study_id', studyId),
    ])

    if (settingsResult.error) throw settingsResult.error
    if (deleteResult.error) throw deleteResult.error

    // Batch insert all tasks
    if (tasks.length > 0) {
      const { error: taskError } = await supabase
        .from('first_click_tasks')
        .insert(tasks.map(task => ({
          id: task.id,
          study_id: studyId,
          instruction: task.instruction,
          position: task.position,
          post_task_questions: task.post_task_questions,
        })))

      if (taskError) throw taskError
    }

    // Batch insert all images
    const tasksWithImages = tasks.filter(t => t.image)
    if (tasksWithImages.length > 0) {
      const { error: imageError } = await supabase
        .from('first_click_images')
        .insert(tasksWithImages.map(task => ({
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
        })))

      if (imageError) throw imageError
    }

    // Batch insert all AOIs
    const allAois = tasks.flatMap(task =>
      task.image ? task.aois.map(aoi => ({
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
      })) : []
    )
    if (allAois.length > 0) {
      const { error: aoisError } = await supabase
        .from('first_click_aois')
        .insert(allAois)

      if (aoisError) throw aoisError
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
