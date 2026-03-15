import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  StudySegment,
  StudySegmentInsert,
  StudySegmentUpdate,
  SegmentCondition,
  SegmentConditionsV2,
} from '@veritio/study-types'

// Conditions can be V1 (flat array) or V2 (groups with OR logic)
type SegmentConditions = SegmentCondition[] | SegmentConditionsV2
import { toJson } from '../lib/supabase/json-utils'

// Note: Segment matching logic has been extracted to @/lib/segment-matching
// for shared use between frontend and backend

type SupabaseClientType = SupabaseClient<Database>

export async function listSegments(
  supabase: SupabaseClientType,
  studyId: string
): Promise<{ data: StudySegment[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('study_segments')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: data || [], error: null }
}

export async function getSegment(
  supabase: SupabaseClientType,
  segmentId: string
): Promise<{ data: StudySegment | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('study_segments')
    .select('*')
    .eq('id', segmentId)
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data, error: null }
}

export async function createSegment(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string,
  data: {
    name: string
    description?: string | null
    conditions: SegmentConditions
    participantCount?: number
  }
): Promise<{ data: StudySegment | null; error: Error | null }> {
  const insert: StudySegmentInsert = {
    study_id: studyId,
    user_id: userId,
    name: data.name,
    description: data.description || null,
    conditions: toJson(data.conditions),
    participant_count: data.participantCount || 0,
  }

  const { data: segment, error } = await supabase
    .from('study_segments')
    .insert(insert)
    .select()
    .single()

  if (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      return { data: null, error: new Error('A segment with this name already exists') }
    }
    return { data: null, error: new Error(error.message) }
  }

  return { data: segment, error: null }
}

export async function updateSegment(
  supabase: SupabaseClientType,
  segmentId: string,
  data: {
    name?: string
    description?: string | null
    conditions?: SegmentConditions
    participantCount?: number
  }
): Promise<{ data: StudySegment | null; error: Error | null }> {
  const update: StudySegmentUpdate = {}

  if (data.name !== undefined) update.name = data.name
  if (data.description !== undefined) update.description = data.description
  if (data.conditions !== undefined) {
    update.conditions = toJson(data.conditions)
  }
  if (data.participantCount !== undefined) update.participant_count = data.participantCount

  const { data: segment, error } = await supabase
    .from('study_segments')
    .update(update)
    .eq('id', segmentId)
    .select()
    .single()

  if (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      return { data: null, error: new Error('A segment with this name already exists') }
    }
    return { data: null, error: new Error(error.message) }
  }

  return { data: segment, error: null }
}

export async function deleteSegment(
  supabase: SupabaseClientType,
  segmentId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase
    .from('study_segments')
    .delete()
    .eq('id', segmentId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  return { success: true, error: null }
}

export async function updateSegmentCount(
  supabase: SupabaseClientType,
  segmentId: string,
  count: number
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase
    .from('study_segments')
    .update({ participant_count: count })
    .eq('id', segmentId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  return { success: true, error: null }
}
