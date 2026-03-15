import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { createCrudService, tasksConfig, type TaskBulkItem, type TaskWithCorrectNode } from '../lib/crud-factory/index'

export type { TaskWithCorrectNode } from '../lib/crud-factory/index'

type SupabaseClientType = SupabaseClient<Database>

const taskCrudService = createCrudService(tasksConfig)

export function invalidateTasksCache(studyId: string): void {
  taskCrudService.invalidateCache(studyId)
}

export async function listTasks(
  supabase: SupabaseClientType,
  studyId: string,
  userId?: string
): Promise<{ data: TaskWithCorrectNode[] | null; error: Error | null }> {
  return taskCrudService.list(supabase, studyId, userId)
}

export async function getTask(
  supabase: SupabaseClientType,
  taskId: string,
  studyId: string
): Promise<{ data: TaskWithCorrectNode | null; error: Error | null }> {
  return taskCrudService.get(supabase, taskId, studyId)
}

export async function createTask(
  supabase: SupabaseClientType,
  studyId: string,
  input: { question: string; correct_node_id?: string | null; correct_node_ids?: string[]; position?: number }
): Promise<{ data: TaskWithCorrectNode | null; error: Error | null }> {
  return taskCrudService.create(supabase, studyId, input)
}

export async function updateTask(
  supabase: SupabaseClientType,
  taskId: string,
  studyId: string,
  input: { question?: string; correct_node_id?: string | null; correct_node_ids?: string[]; position?: number }
): Promise<{ data: TaskWithCorrectNode | null; error: Error | null }> {
  return taskCrudService.update(supabase, taskId, studyId, input)
}

export async function deleteTask(
  supabase: SupabaseClientType,
  taskId: string,
  studyId: string
): Promise<{ success: boolean; error: Error | null }> {
  return taskCrudService.delete(supabase, taskId, studyId)
}

export async function bulkUpdateTasks(
  supabase: SupabaseClientType,
  studyId: string,
  tasks: Array<{ id: string; question: string; correct_node_id?: string | null; correct_node_ids?: string[]; position: number; post_task_questions?: unknown[] }>
): Promise<{ data: TaskWithCorrectNode[] | null; error: Error | null }> {
  return taskCrudService.bulkUpdate(supabase, studyId, tasks as TaskBulkItem[])
}
