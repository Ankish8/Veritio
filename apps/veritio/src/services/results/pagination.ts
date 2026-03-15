import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, StudyFlowResponseRow, Participant } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

const PAGE_SIZE = 1000

export interface FetchOptions {
  cursorColumn?: string
  columns?: string
}

// Cursor-based pagination (O(1) per page vs O(n) for offset)
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

/** @deprecated Use fetchAllRows with cursor-based pagination instead */
export async function fetchAllRowsWithOffset<T>(
  supabase: SupabaseClientType,
  table: string,
  studyId: string,
  orderBy?: { column: string; ascending?: boolean },
  logger?: { info: (msg: string, data?: Record<string, unknown>) => void; warn: (msg: string, data?: Record<string, unknown>) => void; error: (msg: string, data?: Record<string, unknown>) => void }
): Promise<T[]> {
  let allRows: T[] = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    let query: any = (supabase as any)
      .from(table)
      .select('*')
      .eq('study_id', studyId)
      .range(offset, offset + PAGE_SIZE - 1)

    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true })
    }

    const { data, error } = await query

    if (error) {
      logger?.error(`Error fetching ${table}`, { error })
      break
    }

    if (data && data.length > 0) {
      allRows = [...allRows, ...data as unknown as T[]]
      offset += PAGE_SIZE
      hasMore = data.length === PAGE_SIZE
    } else {
      hasMore = false
    }
  }

  return allRows
}

// Optimized column sets (minimum columns for common use cases)

export const PARTICIPANT_OVERVIEW_COLUMNS = `
  id, study_id, status, started_at, completed_at, rejected_at,
  screening_result, identifier_type, identifier_value,
  url_tags, city, region, country, categories_created, metadata
`.replace(/\s+/g, ' ').trim()

export const FLOW_RESPONSE_COLUMNS = `
  id, participant_id, question_id, response_value, response_time_ms, study_id
`.replace(/\s+/g, ' ').trim()

export const TREE_TEST_RESPONSE_COLUMNS = `
  id, participant_id, task_id, study_id, path_taken, selected_node_id,
  is_correct, is_direct, is_skipped, backtrack_count,
  total_time_ms, time_to_first_click_ms
`.replace(/\s+/g, ' ').trim()

export const CARD_SORT_RESPONSE_COLUMNS = `
  id, participant_id, study_id, card_placements, custom_categories,
  total_time_ms, card_movement_percentage, standardized_placements
`.replace(/\s+/g, ' ').trim()

export const CARD_SORT_RESPONSE_OVERVIEW_COLUMNS = `
  id, participant_id, study_id, card_placements, custom_categories,
  total_time_ms, card_movement_percentage
`.replace(/\s+/g, ' ').trim()

export const FLOW_QUESTION_COLUMNS = `
  id, study_id, section, custom_section_id, position, question_type,
  question_text, description, is_required, config, display_logic
`.replace(/\s+/g, ' ').trim()

export const CATEGORY_STANDARDIZATION_COLUMNS = `
  id, study_id, standardized_name, original_names, agreement_score, created_by, created_at, updated_at
`.replace(/\s+/g, ' ').trim()

export async function fetchAllFlowResponses(
  supabase: SupabaseClientType,
  studyId: string
): Promise<StudyFlowResponseRow[]> {
  return fetchAllRows<StudyFlowResponseRow>(supabase, 'study_flow_responses', studyId, {
    cursorColumn: 'id',
    columns: FLOW_RESPONSE_COLUMNS,
  })
}

export async function fetchAllParticipants(
  supabase: SupabaseClientType,
  studyId: string,
  options?: { includeMetadata?: boolean }
): Promise<Participant[]> {
  const columns = options?.includeMetadata
    ? '*'
    : PARTICIPANT_OVERVIEW_COLUMNS

  return fetchAllRows<Participant>(supabase, 'participants', studyId, {
    cursorColumn: 'started_at',
    columns,
  })
}

export async function fetchAllTreeTestResponses(
  supabase: SupabaseClientType,
  studyId: string
): Promise<any[]> {
  return fetchAllRows<any>(supabase, 'tree_test_responses', studyId, {
    cursorColumn: 'id',
    columns: TREE_TEST_RESPONSE_COLUMNS,
  })
}

export async function fetchAllCardSortResponses(
  supabase: SupabaseClientType,
  studyId: string,
  options?: { includeStandardized?: boolean }
): Promise<any[]> {
  const columns = options?.includeStandardized
    ? CARD_SORT_RESPONSE_COLUMNS
    : CARD_SORT_RESPONSE_OVERVIEW_COLUMNS

  return fetchAllRows<any>(supabase, 'card_sort_responses', studyId, {
    cursorColumn: 'id',
    columns,
  })
}

export async function fetchAllCategoryStandardizations(
  supabase: SupabaseClientType,
  studyId: string
): Promise<any[]> {
  return fetchAllRows<any>(supabase, 'category_standardizations', studyId, {
    cursorColumn: 'id',
    columns: CATEGORY_STANDARDIZATION_COLUMNS,
  })
}

export async function fetchAllFlowQuestions(
  supabase: SupabaseClientType,
  studyId: string
): Promise<any[]> {
  return fetchAllRows<any>(supabase, 'study_flow_questions', studyId, {
    cursorColumn: 'id',
    columns: FLOW_QUESTION_COLUMNS,
  })
}

export async function fetchAllPrototypeTestResponses(
  supabase: SupabaseClientType,
  studyId: string
): Promise<any[]> {
  return fetchAllRows<any>(supabase, 'prototype_test_task_attempts', studyId, {
    cursorColumn: 'id',
    columns: '*', // Need all columns for full metrics
  })
}
