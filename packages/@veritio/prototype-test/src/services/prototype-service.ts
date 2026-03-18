import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/types'
import type {
  PrototypeTestPrototype,
  PrototypeTestFrame,
  PrototypeTestPrototypeInsert,
  PrototypeTestFrameInsert,
} from '../lib/supabase/types'
import { cache, cacheKeys, cacheTTL } from '../lib/cache/memory-cache'
import { parseFigmaUrl } from '../lib/figma-url-parser'

export { parseFigmaUrl, type ParsedFigmaUrl } from '../lib/figma-url-parser'

// Use `any` to accept SupabaseClient with any Database schema (app vs package)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientType = SupabaseClient<any>
// Cache Invalidation
export function invalidatePrototypeCache(studyId: string): void {
  cache.delete(cacheKeys.prototype(studyId))
  cache.delete(cacheKeys.prototypeFrames(studyId))
}
// Prototype CRUD
export async function getPrototype(
  supabase: SupabaseClientType,
  studyId: string,
  userId?: string
): Promise<{ data: PrototypeTestPrototype | null; error: Error | null }> {
  // Check cache first
  const cacheKey = cacheKeys.prototype(studyId)
  const cached = cache.get<PrototypeTestPrototype>(cacheKey)
  if (cached) {
    return { data: cached, error: null }
  }

  const { data, error } = await supabase
    .from('prototype_test_prototypes')
    .select(`
      id, study_id, figma_url, figma_file_key, figma_node_id, name, password,

      starting_frame_id, last_synced_at, sync_status, sync_error, frame_count, figma_file_modified_at, created_at
    `)
    .eq('study_id', studyId)
    .maybeSingle()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  if (!data) {
    return { data: null, error: null }
  }

  const prototype = data as PrototypeTestPrototype

  // Cache the result
  cache.set(cacheKey, prototype, cacheTTL.medium)

  return { data: prototype, error: null }
}
export async function upsertPrototype(
  supabase: SupabaseClientType,
  studyId: string,
  input: { figma_url: string; name?: string; password?: string | null }
): Promise<{ data: PrototypeTestPrototype | null; error: Error | null }> {
  // Parse the Figma URL
  const parsed = parseFigmaUrl(input.figma_url)
  if (!parsed.isValid) {
    return { data: null, error: new Error(parsed.error || 'Invalid Figma URL') }
  }

  const upsertData: PrototypeTestPrototypeInsert = {
    study_id: studyId,
    figma_url: input.figma_url,
    figma_file_key: parsed.fileKey,
    figma_node_id: parsed.nodeId,
    name: input.name || null,
    password: input.password ?? null,
    sync_status: 'pending',
    sync_error: null,
    frame_count: 0,
  }

  const { data, error } = await supabase
    .from('prototype_test_prototypes')
    .upsert(upsertData, { onConflict: 'study_id' })
    .select(`
      id, study_id, figma_url, figma_file_key, figma_node_id, name, password,
      starting_frame_id, last_synced_at, sync_status, sync_error, frame_count, figma_file_modified_at, created_at
    `)
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  // Invalidate cache
  invalidatePrototypeCache(studyId)

  return { data: data as PrototypeTestPrototype, error: null }
}
export async function updatePrototype(
  supabase: SupabaseClientType,
  studyId: string,
  input: { password?: string | null; starting_frame_id?: string | null }
): Promise<{ data: PrototypeTestPrototype | null; error: Error | null }> {
  const updates: Record<string, unknown> = {}

  if ('password' in input) {
    updates.password = input.password ?? null
  }
  if ('starting_frame_id' in input) {
    updates.starting_frame_id = input.starting_frame_id ?? null
  }

  // Skip if no updates
  if (Object.keys(updates).length === 0) {
    return getPrototype(supabase, studyId)
  }

  const { data, error } = await supabase
    .from('prototype_test_prototypes')
    .update(updates)
    .eq('study_id', studyId)
    .select(`
      id, study_id, figma_url, figma_file_key, figma_node_id, name, password,
      starting_frame_id, last_synced_at, sync_status, sync_error, frame_count, figma_file_modified_at, created_at
    `)
    .maybeSingle()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  // If no prototype exists, return null without error (frontend should check)
  if (!data) {
    return { data: null, error: null }
  }

  // Invalidate cache
  invalidatePrototypeCache(studyId)

  return { data: data as PrototypeTestPrototype, error: null }
}
export async function deletePrototype(
  supabase: SupabaseClientType,
  studyId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase
    .from('prototype_test_prototypes')
    .delete()
    .eq('study_id', studyId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  // Invalidate cache
  invalidatePrototypeCache(studyId)

  return { success: true, error: null }
}
export async function updatePrototypeSyncStatus(
  supabase: SupabaseClientType,
  studyId: string,
  status: 'pending' | 'syncing' | 'completed' | 'failed',
  error?: string
): Promise<{ success: boolean; error: Error | null }> {
  const updates: Partial<PrototypeTestPrototype> = {
    sync_status: status,
    sync_error: error || null,
  }

  if (status === 'completed') {
    updates.last_synced_at = new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from('prototype_test_prototypes')
    .update(updates)
    .eq('study_id', studyId)

  if (updateError) {
    return { success: false, error: new Error(updateError.message) }
  }

  // Invalidate cache
  invalidatePrototypeCache(studyId)

  return { success: true, error: null }
}
// Frame CRUD
export async function listFrames(
  supabase: SupabaseClientType,
  studyId: string,
  userId?: string
): Promise<{ data: PrototypeTestFrame[] | null; error: Error | null }> {
  // Check cache first
  const cacheKey = cacheKeys.prototypeFrames(studyId)
  const cached = cache.get<PrototypeTestFrame[]>(cacheKey)
  if (cached) {
    return { data: cached, error: null }
  }

  const { data: frames, error } = await supabase
    .from('prototype_test_frames')
    .select(`
      id, prototype_id, study_id, figma_node_id, name, page_name,
      width, height, thumbnail_url, position, created_at, updated_at
    `)
    .eq('study_id', studyId)
    .order('position', { ascending: true })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  // Cache the result
  cache.set(cacheKey, frames as PrototypeTestFrame[], cacheTTL.medium)

  return { data: frames as PrototypeTestFrame[], error: null }
}
export async function getFrame(
  supabase: SupabaseClientType,
  frameId: string,
  studyId: string
): Promise<{ data: PrototypeTestFrame | null; error: Error | null }> {
  const { data: frame, error } = await supabase
    .from('prototype_test_frames')
    .select(`
      id, prototype_id, study_id, figma_node_id, name, page_name,
      width, height, thumbnail_url, position, created_at, updated_at
    `)
    .eq('id', frameId)
    .eq('study_id', studyId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Frame not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  return { data: frame as PrototypeTestFrame, error: null }
}
export async function bulkUpsertFrames(
  supabase: SupabaseClientType,
  studyId: string,
  prototypeId: string,
  frames: Array<{
    figma_node_id: string
    name: string
    width?: number
    height?: number
    thumbnail_url?: string
    position: number
    page_name?: string
  }>
): Promise<{ data: PrototypeTestFrame[] | null; error: Error | null }> {
  // Get existing frame node IDs to detect deletions
  const { data: existingFrames } = await supabase
    .from('prototype_test_frames')
    .select('id, figma_node_id')
    .eq('prototype_id', prototypeId)

  const existingNodeIds = new Set((existingFrames || []).map(f => f.figma_node_id))
  const incomingNodeIds = new Set(frames.map(f => f.figma_node_id))

  // Find frames to delete (exist in DB but not in incoming array)
  const nodeIdsToDelete = [...existingNodeIds].filter(id => !incomingNodeIds.has(id))
  if (nodeIdsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('prototype_test_frames')
      .delete()
      .eq('prototype_id', prototypeId)
      .in('figma_node_id', nodeIdsToDelete)

    if (deleteError) {
      return { data: null, error: new Error(`Failed to delete frames: ${deleteError.message}`) }
    }
  }

  // Handle empty frames array
  if (frames.length === 0) {
    invalidatePrototypeCache(studyId)
    return { data: [], error: null }
  }

  // Upsert all frames
  // Note: Round dimensions to integers as DB columns are integer type
  const upsertData: PrototypeTestFrameInsert[] = frames.map((frame) => ({
    prototype_id: prototypeId,
    study_id: studyId,
    figma_node_id: frame.figma_node_id,
    name: frame.name,
    width: frame.width != null ? Math.round(frame.width) : null,
    height: frame.height != null ? Math.round(frame.height) : null,
    thumbnail_url: frame.thumbnail_url || null,
    position: frame.position,
    page_name: frame.page_name || null,
  }))

  const { error: upsertError } = await supabase
    .from('prototype_test_frames')
    .upsert(upsertData, { onConflict: 'prototype_id,figma_node_id' })

  if (upsertError) {
    return { data: null, error: new Error(`Failed to save frames: ${upsertError.message}`) }
  }

  // Update frame count on prototype
  await supabase
    .from('prototype_test_prototypes')
    .update({ frame_count: frames.length })
    .eq('id', prototypeId)

  // Fetch updated frames
  const { data: updatedFrames, error } = await supabase
    .from('prototype_test_frames')
    .select(`
      id, prototype_id, study_id, figma_node_id, name, page_name,
      width, height, thumbnail_url, position, created_at, updated_at
    `)
    .eq('prototype_id', prototypeId)
    .order('position', { ascending: true })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  // Invalidate cache
  invalidatePrototypeCache(studyId)

  return { data: updatedFrames as PrototypeTestFrame[], error: null }
}
export async function deleteAllFrames(
  supabase: SupabaseClientType,
  prototypeId: string,
  studyId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase
    .from('prototype_test_frames')
    .delete()
    .eq('prototype_id', prototypeId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  // Update frame count
  await supabase
    .from('prototype_test_prototypes')
    .update({ frame_count: 0 })
    .eq('id', prototypeId)

  // Invalidate cache
  invalidatePrototypeCache(studyId)

  return { success: true, error: null }
}
