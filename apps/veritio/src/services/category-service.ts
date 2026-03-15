import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import type { Category } from './types'
import { createCrudService, categoriesConfig, type CategoryBulkItem } from '../lib/crud-factory/index'

type SupabaseClientType = SupabaseClient<Database>

const categoryCrudService = createCrudService(categoriesConfig)

export function invalidateCategoriesCache(studyId: string): void {
  categoryCrudService.invalidateCache(studyId)
}

export async function listCategories(
  supabase: SupabaseClientType,
  studyId: string,
  userId?: string
): Promise<{ data: Category[] | null; error: Error | null }> {
  return categoryCrudService.list(supabase, studyId, userId)
}

export async function getCategory(
  supabase: SupabaseClientType,
  categoryId: string,
  studyId: string
): Promise<{ data: Category | null; error: Error | null }> {
  return categoryCrudService.get(supabase, categoryId, studyId)
}

export async function createCategory(
  supabase: SupabaseClientType,
  studyId: string,
  input: { label: string; description?: string | null; position?: number }
): Promise<{ data: Category | null; error: Error | null }> {
  return categoryCrudService.create(supabase, studyId, input)
}

export async function updateCategory(
  supabase: SupabaseClientType,
  categoryId: string,
  studyId: string,
  input: { label?: string; description?: string | null; position?: number }
): Promise<{ data: Category | null; error: Error | null }> {
  return categoryCrudService.update(supabase, categoryId, studyId, input)
}

export async function deleteCategory(
  supabase: SupabaseClientType,
  categoryId: string,
  studyId: string
): Promise<{ success: boolean; error: Error | null }> {
  return categoryCrudService.delete(supabase, categoryId, studyId)
}

export async function bulkUpdateCategories(
  supabase: SupabaseClientType,
  studyId: string,
  categories: Array<{ id: string; label?: string; description?: string | null; position?: number }>
): Promise<{ data: Category[] | null; error: Error | null }> {
  return categoryCrudService.bulkUpdate(supabase, studyId, categories as CategoryBulkItem[])
}
