/**
 * Pagination utilities for fetching large tables.
 * Minimal stub mirroring apps/veritio/src/services/results/pagination.ts
 * to resolve imports from within the @veritio/prototype-test package.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/types'

// Use `any` to accept SupabaseClient with any Database schema (app vs package)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientType = SupabaseClient<any>

const PAGE_SIZE = 1000
export interface FetchOptions {
  cursorColumn?: string
  columns?: string
}
export async function fetchAllRows<T extends Record<string, unknown>>(
  supabase: SupabaseClientType,
  table: string,
  studyId: string,
  options: FetchOptions | string = {},
  logger?: { info: (msg: string, data?: Record<string, unknown>) => void; warn: (msg: string, data?: Record<string, unknown>) => void; error: (msg: string, data?: Record<string, unknown>) => void }
): Promise<T[]> {
  const opts: FetchOptions = typeof options === 'string'
    ? { cursorColumn: options }
    : options

  const cursorColumn = opts.cursorColumn ?? 'created_at'
  const columns = opts.columns ?? '*'

  let allRows: T[] = []
  let cursor: string | null = null
  let hasMore = true

  while (hasMore) {
    let query = supabase
      .from(table as keyof Database['public']['Tables'])
      .select(columns)
      .eq('study_id', studyId)
      .order(cursorColumn, { ascending: true })
      .limit(PAGE_SIZE)

    if (cursor) {
      query = query.gt(cursorColumn, cursor)
    }

    const { data, error } = await query

    if (error) {
      logger?.error(`Error fetching ${table}`, { error })
      break
    }

    if (data && data.length > 0) {
      allRows = [...allRows, ...(data as unknown as T[])]
      const lastRow = (data as unknown as Record<string, unknown>[])[data.length - 1]
      cursor = lastRow[cursorColumn] as string
      hasMore = data.length === PAGE_SIZE
    } else {
      hasMore = false
    }
  }

  return allRows
}
export async function fetchAllPrototypeTestResponses(
  supabase: SupabaseClientType,
  studyId: string
): Promise<any[]> {
  return fetchAllRows<any>(supabase, 'prototype_test_task_attempts', studyId, {
    cursorColumn: 'id',
    columns: '*',
  })
}
export async function fetchAllParticipants(
  supabase: SupabaseClientType,
  studyId: string
): Promise<any[]> {
  return fetchAllRows<any>(supabase, 'participants', studyId, {
    cursorColumn: 'started_at',
  })
}
export async function fetchAllFlowResponses(
  supabase: SupabaseClientType,
  studyId: string
): Promise<any[]> {
  return fetchAllRows<any>(supabase, 'study_flow_responses', studyId, {
    cursorColumn: 'id',
    columns: 'id, participant_id, question_id, response_value, response_time_ms, study_id',
  })
}
export const FLOW_QUESTION_COLUMNS = `
  id, study_id, section, custom_section_id, position, question_type,
  question_text, description, is_required, config, display_logic
`.replace(/\s+/g, ' ').trim()
