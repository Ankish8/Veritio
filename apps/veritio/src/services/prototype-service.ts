import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import type {
  PrototypeTestPrototype,
  PrototypeTestFrame,
  PrototypeTestPrototypeInsert,
  PrototypeTestFrameInsert,
} from '@veritio/study-types'
import { cache, cacheKeys, cacheTTL } from '../lib/cache/memory-cache'
import { deleteStaleRecords } from '../lib/supabase/sync-helper'
import { invalidatePrototypeCache } from './cache-utils'
import { parseFigmaUrl } from '@/lib/figma/url-parser'

export { parseFigmaUrl, type ParsedFigmaUrl } from '@/lib/figma/url-parser'

type SupabaseClientType = SupabaseClient<Database>

export { invalidatePrototypeCache } from './cache-utils'

export async function getPrototype(
  supabase: SupabaseClientType,
  studyId: string,
  _userId?: string
): Promise<{ data: PrototypeTestPrototype | null; error: Error | null }> {
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
  cache.set(cacheKey, prototype, cacheTTL.medium)

  return { data: prototype, error: null }
}

export async function upsertPrototype(
  supabase: SupabaseClientType,
  studyId: string,
  input: { figma_url: string; name?: string; password?: string | null }
): Promise<{ data: PrototypeTestPrototype | null; error: Error | null }> {
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

  if (!data) {
    return { data: null, error: null }
  }

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

  invalidatePrototypeCache(studyId)

  return { success: true, error: null }
}

export async function listFrames(
  supabase: SupabaseClientType,
  studyId: string,
  _userId?: string
): Promise<{ data: PrototypeTestFrame[] | null; error: Error | null }> {
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
    /** The Figma page name containing this frame */
    page_name?: string
    is_overlay?: boolean
    overlay_type?: string | null
  }>
): Promise<{ data: PrototypeTestFrame[] | null; error: Error | null }> {
  // Delete stale frames that are no longer in the incoming sync.
  const incomingNodeIds = [...new Set(frames.map(f => f.figma_node_id))]

  const { error: deleteError } = await deleteStaleRecords(
    supabase,
    'prototype_test_frames',
    'prototype_id',
    prototypeId,
    'figma_node_id',
    incomingNodeIds,
  )

  if (deleteError) {
    return { data: null, error: new Error(`Failed to delete stale frames: ${deleteError.message}`) }
  }

  if (frames.length === 0) {
    invalidatePrototypeCache(studyId)
    return { data: [], error: null }
  }

  // Round dimensions to integers as DB columns are integer type
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
    is_overlay: frame.is_overlay ?? false,
    overlay_type: frame.overlay_type ?? null,
  }))

  const { error: upsertError } = await supabase
    .from('prototype_test_frames')
    .upsert(upsertData, { onConflict: 'prototype_id,figma_node_id' })

  if (upsertError) {
    return { data: null, error: new Error(`Failed to save frames: ${upsertError.message}`) }
  }

  await supabase
    .from('prototype_test_prototypes')
    .update({ frame_count: frames.length })
    .eq('id', prototypeId)

  const { data: updatedFrames, error } = await supabase
    .from('prototype_test_frames')
    .select(`
      id, prototype_id, study_id, figma_node_id, name, page_name,
      width, height, is_overlay, overlay_type, thumbnail_url, position, created_at, updated_at
    `)
    .eq('prototype_id', prototypeId)
    .order('position', { ascending: true })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

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

  await supabase
    .from('prototype_test_prototypes')
    .update({ frame_count: 0 })
    .eq('id', prototypeId)

  invalidatePrototypeCache(studyId)

  return { success: true, error: null }
}

export interface ComponentVariantInsert {
  component_set_id: string
  component_set_name: string
  variant_id: string
  variant_name: string
  variant_properties: Record<string, string>
  image_url: string
  image_width?: number
  image_height?: number
}

export async function bulkUpsertComponentVariants(
  supabase: SupabaseClientType,
  studyId: string,
  prototypeId: string,
  variants: ComponentVariantInsert[]
): Promise<{ success: boolean; error: Error | null }> {
  if (variants.length === 0) {
    return { success: true, error: null }
  }

  const upsertData = variants.map((variant) => ({
    study_id: studyId,
    prototype_id: prototypeId,
    component_set_id: variant.component_set_id,
    component_set_name: variant.component_set_name,
    variant_id: variant.variant_id,
    variant_name: variant.variant_name,
    variant_properties: variant.variant_properties,
    image_url: variant.image_url,
    image_width: variant.image_width || null,
    image_height: variant.image_height || null,
    last_synced_at: new Date().toISOString(),
  }))

  // Note: Table not in generated types yet, using type assertion
  const { error } = await (supabase as any)
    .from('prototype_test_component_variants')
    .upsert(upsertData, { onConflict: 'prototype_id,variant_id' })

  if (error) {
    return { success: false, error: new Error(`Failed to save component variants: ${error.message}`) }
  }

  return { success: true, error: null }
}

export async function getComponentVariants(
  supabase: SupabaseClientType,
  studyId: string,
  prototypeId: string
): Promise<{ data: ComponentVariantInsert[] | null; error: Error | null }> {
  // Note: Table not in generated types yet, using type assertion
  const { data, error } = await (supabase as any)
    .from('prototype_test_component_variants')
    .select('*')
    .eq('study_id', studyId)
    .eq('prototype_id', prototypeId)

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: data as ComponentVariantInsert[], error: null }
}

export interface ComponentInstanceInsert {
  instance_id: string
  frame_node_id: string
  component_id: string
  component_set_id?: string
  relative_x: number
  relative_y: number
  width: number
  height: number
  frame_width?: number
  frame_height?: number
  instance_name?: string
}

export async function bulkUpsertComponentInstances(
  supabase: SupabaseClientType,
  studyId: string,
  prototypeId: string,
  instances: ComponentInstanceInsert[]
): Promise<{ success: boolean; error: Error | null }> {
  if (instances.length === 0) {
    return { success: true, error: null }
  }

  const upsertData = instances.map((instance) => ({
    study_id: studyId,
    prototype_id: prototypeId,
    instance_id: instance.instance_id,
    frame_node_id: instance.frame_node_id,
    component_id: instance.component_id,
    component_set_id: instance.component_set_id || null,
    relative_x: instance.relative_x,
    relative_y: instance.relative_y,
    width: instance.width,
    height: instance.height,
    frame_width: instance.frame_width || null,
    frame_height: instance.frame_height || null,
    instance_name: instance.instance_name || null,
    last_synced_at: new Date().toISOString(),
  }))

  // Note: Table not in generated types yet, using type assertion
  const { error } = await (supabase as any)
    .from('prototype_test_component_instances')
    .upsert(upsertData, { onConflict: 'prototype_id,instance_id' })

  if (error) {
    return { success: false, error: new Error(`Failed to save component instances: ${error.message}`) }
  }

  return { success: true, error: null }
}

export async function getComponentInstances(
  supabase: SupabaseClientType,
  studyId: string,
  prototypeId: string
): Promise<{ data: ComponentInstanceInsert[] | null; error: Error | null }> {
  // Note: Table not in generated types yet, using type assertion
  const { data, error } = await (supabase as any)
    .from('prototype_test_component_instances')
    .select('*')
    .eq('study_id', studyId)
    .eq('prototype_id', prototypeId)

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: data as ComponentInstanceInsert[], error: null }
}
