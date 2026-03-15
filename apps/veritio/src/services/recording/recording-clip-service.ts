import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

export interface RecordingClip {
  id: string
  recording_id: string
  start_ms: number
  end_ms: number
  title: string
  description: string | null
  thumbnail_url: string | null
  thumbnail_storage_path: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface RecordingClipInsert {
  recording_id: string
  start_ms: number
  end_ms: number
  title: string
  description?: string | null
  thumbnail_url?: string | null
  thumbnail_storage_path?: string | null
  created_by: string
}

export interface RecordingClipUpdate {
  title?: string
  description?: string | null
  start_ms?: number
  end_ms?: number
  thumbnail_url?: string | null
  thumbnail_storage_path?: string | null
}

export async function listClipsByRecording(
  supabase: SupabaseClientType,
  recordingId: string
): Promise<{ data: RecordingClip[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('recording_clips')
    .select('*')
    .eq('recording_id', recordingId)
    .order('start_ms', { ascending: true })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: (data || []) as RecordingClip[], error: null }
}

export async function getClipById(
  supabase: SupabaseClientType,
  clipId: string
): Promise<{ data: RecordingClip | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('recording_clips')
    .select('*')
    .eq('id', clipId)
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: data as RecordingClip, error: null }
}

export async function createClip(
  supabase: SupabaseClientType,
  data: {
    recordingId: string
    startMs: number
    endMs: number
    title: string
    description?: string | null
    thumbnailUrl?: string | null
    thumbnailStoragePath?: string | null
    userId: string
  }
): Promise<{ data: RecordingClip | null; error: Error | null }> {
  if (data.endMs <= data.startMs) {
    return { data: null, error: new Error('End time must be after start time') }
  }

  const insert: RecordingClipInsert = {
    recording_id: data.recordingId,
    start_ms: data.startMs,
    end_ms: data.endMs,
    title: data.title,
    description: data.description,
    thumbnail_url: data.thumbnailUrl,
    thumbnail_storage_path: data.thumbnailStoragePath,
    created_by: data.userId,
  }

  const { data: clip, error } = await supabase
    .from('recording_clips')
    .insert(insert as any)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return {
    data: clip as RecordingClip,
    error: null,
  }
}

export async function updateClip(
  supabase: SupabaseClientType,
  clipId: string,
  userId: string,
  updates: RecordingClipUpdate
): Promise<{ data: RecordingClip | null; error: Error | null }> {
  const { data: existingClip, error: fetchError } = await supabase
    .from('recording_clips')
    .select('created_by')
    .eq('id', clipId)
    .single()

  if (fetchError) {
    return { data: null, error: new Error('Clip not found') }
  }

  if ((existingClip as any).created_by !== userId) {
    return { data: null, error: new Error('Not authorized to update this clip') }
  }

  if (updates.start_ms !== undefined && updates.end_ms !== undefined) {
    if (updates.end_ms <= updates.start_ms) {
      return { data: null, error: new Error('End time must be after start time') }
    }
  }

  const { data: clip, error } = await supabase
    .from('recording_clips')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', clipId)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return {
    data: clip as RecordingClip,
    error: null,
  }
}

export async function deleteClip(
  supabase: SupabaseClientType,
  clipId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { data: existingClip, error: fetchError } = await supabase
    .from('recording_clips')
    .select('created_by')
    .eq('id', clipId)
    .single()

  if (fetchError) {
    return { success: false, error: new Error('Clip not found') }
  }

  if ((existingClip as any).created_by !== userId) {
    return { success: false, error: new Error('Not authorized to delete this clip') }
  }

  const { error } = await supabase
    .from('recording_clips')
    .delete()
    .eq('id', clipId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  return { success: true, error: null }
}
