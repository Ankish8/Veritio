import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { toJson } from '../lib/supabase/json-utils'
import type {
  PrototypeTestTask,
  PrototypeTestTaskInsert,
  PrototypeTestFrame,
} from '@veritio/study-types'
import { cache, cacheKeys, cacheTTL } from '../lib/cache/memory-cache'
import { invalidatePrototypeTasksCache } from './cache-utils'

type SupabaseClientType = SupabaseClient<Database>

export interface PrototypeTaskWithFrame extends PrototypeTestTask {
  start_frame: Pick<PrototypeTestFrame, 'id' | 'name' | 'figma_node_id' | 'thumbnail_url'> | null
}

export { invalidatePrototypeTasksCache } from './cache-utils'

export async function listPrototypeTasks(
  supabase: SupabaseClientType,
  studyId: string,
  _userId?: string
): Promise<{ data: PrototypeTaskWithFrame[] | null; error: Error | null }> {
  const cacheKey = cacheKeys.prototypeTasks(studyId)
  const cached = cache.get<PrototypeTaskWithFrame[]>(cacheKey)
  if (cached) {
    return { data: cached, error: null }
  }

  const { data: tasks, error } = await supabase
    .from('prototype_test_tasks')
    .select(`
      id, study_id, title, instruction, start_frame_id, flow_type,
      success_criteria_type, success_frame_ids, success_pathway,
      state_success_criteria,
      time_limit_ms, post_task_questions, position, created_at,
      enable_interactive_components, success_component_states,
      start_frame:prototype_test_frames!prototype_test_tasks_start_frame_id_fkey(
        id, name, figma_node_id, thumbnail_url
      )
    `)
    .eq('study_id', studyId)
    .order('position', { ascending: true })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  cache.set(cacheKey, tasks as unknown as PrototypeTaskWithFrame[], cacheTTL.medium)

  return { data: tasks as unknown as PrototypeTaskWithFrame[], error: null }
}

export async function getPrototypeTask(
  supabase: SupabaseClientType,
  taskId: string,
  studyId: string
): Promise<{ data: PrototypeTaskWithFrame | null; error: Error | null }> {
  const { data: task, error } = await supabase
    .from('prototype_test_tasks')
    .select(`
      id, study_id, title, instruction, start_frame_id, flow_type,
      success_criteria_type, success_frame_ids, success_pathway,
      state_success_criteria,
      time_limit_ms, post_task_questions, position, created_at,
      enable_interactive_components, success_component_states,
      start_frame:prototype_test_frames!prototype_test_tasks_start_frame_id_fkey(
        id, name, figma_node_id, thumbnail_url
      )
    `)
    .eq('id', taskId)
    .eq('study_id', studyId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Task not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  return { data: task as unknown as PrototypeTaskWithFrame, error: null }
}

export async function createPrototypeTask(
  supabase: SupabaseClientType,
  studyId: string,
  input: {
    title: string
    instruction?: string | null
    start_frame_id?: string | null
    success_criteria_type?: 'destination' | 'pathway' | 'component_state'
    success_frame_ids?: string[]
    success_pathway?: { frames: string[]; strict: boolean } | null
    state_success_criteria?: { states: unknown[]; logic: 'AND' | 'OR' } | null
    time_limit_ms?: number | null
    post_task_questions?: unknown[]
    position?: number
    enable_interactive_components?: boolean
    success_component_states?: unknown[] | null
  }
): Promise<{ data: PrototypeTaskWithFrame | null; error: Error | null }> {
  const insertData = {
    study_id: studyId,
    title: input.title.trim(),
    instruction: input.instruction?.trim() || null,
    start_frame_id: input.start_frame_id || null,
    success_criteria_type: input.success_criteria_type || 'destination',
    success_frame_ids: toJson(input.success_frame_ids || []),
    success_pathway: toJson(input.success_pathway || null),
    state_success_criteria: toJson(input.state_success_criteria || null),
    time_limit_ms: input.time_limit_ms || null,
    post_task_questions: toJson(input.post_task_questions || []),
    position: input.position ?? 0,
    enable_interactive_components: input.enable_interactive_components ?? false,
    success_component_states: toJson(input.success_component_states || null),
  } as PrototypeTestTaskInsert

  const { data: task, error } = await supabase
    .from('prototype_test_tasks')
    .insert(insertData)
    .select(`
      id, study_id, title, instruction, start_frame_id, flow_type,
      success_criteria_type, success_frame_ids, success_pathway,
      state_success_criteria,
      time_limit_ms, post_task_questions, position, created_at,
      enable_interactive_components, success_component_states,
      start_frame:prototype_test_frames!prototype_test_tasks_start_frame_id_fkey(
        id, name, figma_node_id, thumbnail_url
      )
    `)
    .single()

  if (error) {
    if (error.message.includes('foreign key') || error.message.includes('start_frame')) {
      return { data: null, error: new Error('Start frame not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  invalidatePrototypeTasksCache(studyId)

  return { data: task as unknown as PrototypeTaskWithFrame, error: null }
}

export async function updatePrototypeTask(
  supabase: SupabaseClientType,
  taskId: string,
  studyId: string,
  input: {
    title?: string
    instruction?: string | null
    start_frame_id?: string | null
    success_criteria_type?: 'destination' | 'pathway' | 'component_state'
    success_frame_ids?: string[]
    success_pathway?: { frames: string[]; strict: boolean } | null
    state_success_criteria?: { states: unknown[]; logic: 'AND' | 'OR' } | null
    time_limit_ms?: number | null
    post_task_questions?: unknown[]
    position?: number
    enable_interactive_components?: boolean
    success_component_states?: unknown[] | null
  }
): Promise<{ data: PrototypeTaskWithFrame | null; error: Error | null }> {
  const updates: Partial<PrototypeTestTask> = {}

  if (input.title !== undefined) updates.title = input.title.trim()
  if (input.instruction !== undefined) updates.instruction = input.instruction?.trim() || null
  if (input.start_frame_id !== undefined) updates.start_frame_id = input.start_frame_id
  if (input.success_criteria_type !== undefined) updates.success_criteria_type = input.success_criteria_type
  if (input.success_frame_ids !== undefined) updates.success_frame_ids = toJson(input.success_frame_ids)
  if (input.success_pathway !== undefined) updates.success_pathway = toJson(input.success_pathway)
  if (input.state_success_criteria !== undefined) (updates as any).state_success_criteria = toJson(input.state_success_criteria)
  if (input.time_limit_ms !== undefined) updates.time_limit_ms = input.time_limit_ms
  if (input.post_task_questions !== undefined) updates.post_task_questions = toJson(input.post_task_questions)
  if (input.position !== undefined) updates.position = input.position
  if (input.enable_interactive_components !== undefined) updates.enable_interactive_components = input.enable_interactive_components
  if (input.success_component_states !== undefined) updates.success_component_states = toJson(input.success_component_states)

  const { data: task, error } = await supabase
    .from('prototype_test_tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('study_id', studyId)
    .select(`
      id, study_id, title, instruction, start_frame_id, flow_type,
      success_criteria_type, success_frame_ids, success_pathway,
      state_success_criteria,
      time_limit_ms, post_task_questions, position, created_at,
      enable_interactive_components, success_component_states,
      start_frame:prototype_test_frames!prototype_test_tasks_start_frame_id_fkey(
        id, name, figma_node_id, thumbnail_url
      )
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Task not found') }
    }
    if (error.message.includes('foreign key') || error.message.includes('start_frame')) {
      return { data: null, error: new Error('Start frame not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  invalidatePrototypeTasksCache(studyId)

  return { data: task as unknown as PrototypeTaskWithFrame, error: null }
}

export async function deletePrototypeTask(
  supabase: SupabaseClientType,
  taskId: string,
  studyId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase
    .from('prototype_test_tasks')
    .delete()
    .eq('id', taskId)
    .eq('study_id', studyId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  invalidatePrototypeTasksCache(studyId)

  return { success: true, error: null }
}

export async function bulkUpdatePrototypeTasks(
  supabase: SupabaseClientType,
  studyId: string,
  tasks: Array<{
    id: string
    title: string
    instruction?: string | null
    start_frame_id?: string | null
    flow_type?: 'task_flow' | 'free_flow' | null
    success_criteria_type?: 'destination' | 'pathway' | 'component_state' | null
    success_frame_ids?: string[] | null
    success_pathway?: { frames: string[]; strict: boolean } | null
    state_success_criteria?: { states: unknown[]; logic: 'AND' | 'OR' } | null
    time_limit_ms?: number | null
    post_task_questions?: unknown[]
    position: number
    enable_interactive_components?: boolean | null
    success_component_states?: unknown[] | null
  }>
): Promise<{ data: PrototypeTaskWithFrame[] | null; error: Error | null }> {
  const { data: existingTasks } = await supabase
    .from('prototype_test_tasks')
    .select('id')
    .eq('study_id', studyId)

  const existingIds = new Set((existingTasks || []).map(t => t.id))
  const incomingIds = new Set(tasks.map(t => t.id))

  const idsToDelete = [...existingIds].filter(id => !incomingIds.has(id))

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('prototype_test_tasks')
      .delete()
      .eq('study_id', studyId)
      .in('id', idsToDelete)

    if (deleteError) {
      return { data: null, error: new Error(`Failed to delete tasks: ${deleteError.message}`) }
    }
  }

  if (tasks.length === 0) {
    invalidatePrototypeTasksCache(studyId)
    return { data: [], error: null }
  }

  // Ensure constraint valid_success_criteria is satisfied:
  // - If success_criteria_type = 'destination', success_frame_ids must be NOT NULL
  // - If success_criteria_type = 'pathway', success_pathway must be NOT NULL
  // - If success_criteria_type = 'component_state', state_success_criteria must be NOT NULL
  const upsertData: PrototypeTestTaskInsert[] = tasks.map((task) => {
    const criteriaType = task.success_criteria_type || 'destination'

    const successFrameIds = Array.isArray(task.success_frame_ids)
      ? task.success_frame_ids
      : []

    let successPathway = task.success_pathway
    if (criteriaType === 'pathway' && !successPathway) {
      successPathway = { frames: [], strict: false }
    }

    let stateSuccessCriteria = task.state_success_criteria
    if (criteriaType === 'component_state' && !stateSuccessCriteria) {
      stateSuccessCriteria = { states: [], logic: 'AND' }
    }

    return {
      id: task.id,
      study_id: studyId,
      title: task.title,
      instruction: task.instruction || null,
      start_frame_id: task.start_frame_id || null,
      flow_type: task.flow_type || 'task_flow',
      success_criteria_type: criteriaType,
      success_frame_ids: toJson(successFrameIds),
      success_pathway: toJson(successPathway || null),
      state_success_criteria: toJson(stateSuccessCriteria || null),
      time_limit_ms: task.time_limit_ms || null,
      post_task_questions: toJson(task.post_task_questions || []),
      position: task.position,
      enable_interactive_components: task.enable_interactive_components ?? false,
      success_component_states: toJson(task.success_component_states || null),
    }
  })

  const { error: upsertError } = await supabase
    .from('prototype_test_tasks')
    .upsert(upsertData, { onConflict: 'id' })

  if (upsertError) {
    return { data: null, error: new Error(`Failed to save tasks: ${upsertError.message}`) }
  }

  const { data: updatedTasks, error } = await supabase
    .from('prototype_test_tasks')
    .select(`
      id, study_id, title, instruction, start_frame_id, flow_type,
      success_criteria_type, success_frame_ids, success_pathway,
      state_success_criteria,
      time_limit_ms, post_task_questions, position, created_at,
      enable_interactive_components, success_component_states,
      start_frame:prototype_test_frames!prototype_test_tasks_start_frame_id_fkey(
        id, name, figma_node_id, thumbnail_url
      )
    `)
    .eq('study_id', studyId)
    .order('position', { ascending: true })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  invalidatePrototypeTasksCache(studyId)

  return { data: updatedTasks as unknown as PrototypeTaskWithFrame[], error: null }
}

export async function reorderPrototypeTasks(
  supabase: SupabaseClientType,
  studyId: string,
  taskPositions: Array<{ id: string; position: number }>
): Promise<{ success: boolean; error: Error | null }> {
  const updates = taskPositions.map(({ id, position }) =>
    supabase
      .from('prototype_test_tasks')
      .update({ position })
      .eq('id', id)
      .eq('study_id', studyId)
  )

  const results = await Promise.all(updates)
  const errors = results.filter(r => r.error)

  if (errors.length > 0) {
    return { success: false, error: new Error('Failed to reorder some tasks') }
  }

  invalidatePrototypeTasksCache(studyId)

  return { success: true, error: null }
}
