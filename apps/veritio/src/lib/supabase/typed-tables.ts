/**
 * Typed Table Accessors
 *
 * Type-safe wrappers for Supabase tables that aren't in the auto-generated types.
 * These tables exist in the database but were added after the last type generation,
 * or are views that don't get auto-generated types.
 *
 * Usage:
 * ```ts
 * const { data } = await studyTagsTable(supabase)
 *   .select('*')
 *   .eq('organization_id', orgId)
 *
 * // data is typed as StudyTag[] | null
 * ```
 *
 * This provides full type safety for queries and results without needing to
 * regenerate the Supabase types every time a table is added.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { StudyTag, StudyTagAssignment } from '@/types/study-tags'

// ============================================================================
// Database Row Types (for INSERT/UPDATE operations)
// ============================================================================

/**
 * Row type for study_tag_assignments table INSERT
 */
export interface StudyTagAssignmentInsert {
  study_id: string
  tag_id: string
  assigned_by_user_id?: string | null
}

// ============================================================================
// Typed Table Accessors
// ============================================================================

// Re-export the row types for convenience
export type { StudyTag, StudyTagAssignment }

/**
 * Helper type for Supabase query builder with typed result
 * This allows chaining methods while preserving the result type hint
 */
 
type TypedQueryBuilder<T> = ReturnType<SupabaseClient['from']> & { __resultType?: T }

/**
 * Type-safe accessor for the study_tags table
 */
export function studyTagsTable(supabase: SupabaseClient): TypedQueryBuilder<StudyTag> {
  return supabase.from('study_tags')
}

/**
 * Type-safe accessor for the study_tag_assignments table
 */
export function studyTagAssignmentsTable(supabase: SupabaseClient): TypedQueryBuilder<StudyTagAssignment> {
  return supabase.from('study_tag_assignments')
}

// ============================================================================
// Type Casting Helpers
// ============================================================================

/**
 * Helper to cast Supabase query result to typed array
 * Use after querying with the typed table accessors
 *
 * @example
 * ```ts
 * const { data } = await studyTagsTable(supabase).select('*').eq('id', id).single()
 * const tag = asType<StudyTag>(data)
 * ```
 */
export function asType<T>(data: unknown): T | null {
  return data as T | null
}

/**
 * Helper to cast Supabase query result to typed array
 *
 * @example
 * ```ts
 * const { data } = await studyTagsTable(supabase).select('*')
 * const tags = asTypeArray<StudyTag>(data)
 * ```
 */
export function asTypeArray<T>(data: unknown): T[] {
  return (data ?? []) as T[]
}
