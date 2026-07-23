import type { SupabaseClient } from '@supabase/supabase-js'

export interface LiveWebsiteTaskInput {
  id: string
  title: string
  instructions: string
  target_url: string
  success_url: string | null
  success_criteria_type: 'self_reported' | 'url_match' | 'exact_path'
  success_path: Record<string, unknown> | null
  time_limit_seconds: number | null
  order_position: number
  post_task_questions?: unknown
}

export async function getTasks(supabase: SupabaseClient, studyId: string) {
  const { data, error } = await (supabase.from('live_website_tasks' as any) as any)
    .select('*')
    .eq('study_id', studyId)
    .order('order_position')

  if (error) throw error
  return data || []
}

export async function saveTasks(
  supabase: SupabaseClient,
  studyId: string,
  tasks: LiveWebsiteTaskInput[],
  logger?: {
    info: (msg: string, data?: Record<string, unknown>) => void
    error: (msg: string, data?: Record<string, unknown>) => void
  }
) {
  const existing = await getTasks(supabase, studyId)
  const incomingIds = new Set(tasks.map((task) => task.id))
  const staleIds = existing.map((task: { id: string }) => task.id).filter((id: string) => !incomingIds.has(id))

  if (tasks.length > 0) {
    const rows = tasks.map((task, index) => ({
      id: task.id,
      study_id: studyId,
      title: task.title,
      instructions: task.instructions || '',
      target_url: task.target_url,
      success_url: task.success_url,
      success_criteria_type: task.success_criteria_type || 'self_reported',
      success_path: task.success_path || null,
      time_limit_seconds: task.time_limit_seconds,
      order_position: index,
      post_task_questions: task.post_task_questions ?? [],
    }))

    const { error: upsertError } = await (supabase.from('live_website_tasks' as any) as any).upsert(rows, { onConflict: 'id' })

    if (upsertError) {
      logger?.error('Failed to upsert tasks', { error: upsertError })
      throw upsertError
    }
  }

  // Delete only tasks the user removed, and only after the incoming snapshot
  // has been accepted. Existing IDs are upserted, preserving response rows.
  if (staleIds.length > 0) {
    const { error: deleteError } = await (supabase.from('live_website_tasks' as any) as any)
      .delete()
      .eq('study_id', studyId)
      .in('id', staleIds)
    if (deleteError) {
      logger?.error('Failed to delete removed tasks', { error: deleteError })
      throw deleteError
    }
  }

  logger?.info('Saved live website tasks', {
    studyId,
    taskCount: tasks.length,
  })
}

// ============================================================================
// Variant support
// ============================================================================

export interface LiveWebsiteVariantInput {
  id: string
  study_id: string
  name: string
  position: number
  url: string
  weight: number
}

export interface LiveWebsiteTaskVariantInput {
  id?: string
  task_id: string
  variant_id: string
  study_id: string
  starting_url?: string | null
  success_criteria_type: 'self_reported' | 'url_match' | 'exact_path' | null
  success_url?: string | null
  success_path?: Record<string, unknown> | null
  time_limit_seconds?: number | null
}

export async function getVariants(supabase: SupabaseClient, studyId: string) {
  const { data, error } = await (supabase.from('live_website_variants' as any) as any).select('*').eq('study_id', studyId).order('position')

  if (error) throw error
  return data || []
}

export async function saveVariants(supabase: SupabaseClient, studyId: string, variants: LiveWebsiteVariantInput[]) {
  const existing = await getVariants(supabase, studyId)
  const incomingIds = new Set(variants.map((variant) => variant.id))
  const staleIds = existing.map((variant: { id: string }) => variant.id).filter((id: string) => !incomingIds.has(id))

  if (variants.length > 0) {
    const rows = variants.map((v, i) => ({
      id: v.id,
      study_id: studyId,
      name: v.name,
      position: i,
      url: v.url,
      weight: v.weight,
    }))

    const { error } = await (supabase.from('live_website_variants' as any) as any).upsert(rows, {
      onConflict: 'id',
    })

    if (error) throw error
  }

  if (staleIds.length > 0) {
    const { error } = await (supabase.from('live_website_variants' as any) as any)
      .delete()
      .eq('study_id', studyId)
      .in('id', staleIds)
    if (error) throw error
  }
}

export async function getTaskVariants(supabase: SupabaseClient, studyId: string) {
  const { data, error } = await (supabase.from('live_website_task_variants' as any) as any).select('*').eq('study_id', studyId)

  if (error) throw error
  return data || []
}

export async function saveTaskVariants(supabase: SupabaseClient, studyId: string, taskVariants: LiveWebsiteTaskVariantInput[]) {
  const existing = await getTaskVariants(supabase, studyId)
  const existingIdsByPair = new Map<string, string>(
    existing.map((row: { id: string; task_id: string; variant_id: string }) => [`${row.task_id}:${row.variant_id}`, row.id])
  )

  const rows = taskVariants.map((tv) => ({
    id: tv.id ?? existingIdsByPair.get(`${tv.task_id}:${tv.variant_id}`) ?? crypto.randomUUID(),
    task_id: tv.task_id,
    variant_id: tv.variant_id,
    study_id: studyId,
    starting_url: tv.starting_url || null,
    success_criteria_type: tv.success_criteria_type || null,
    success_url: tv.success_url || null,
    success_path: tv.success_path || null,
    time_limit_seconds: tv.time_limit_seconds || null,
  }))

  if (rows.length > 0) {
    const { error } = await (supabase.from('live_website_task_variants' as any) as any).upsert(rows, { onConflict: 'id' })

    if (error) throw error
  }

  const incomingIds = new Set(rows.map((row) => row.id))
  const staleIds = existing.map((row: { id: string }) => row.id).filter((id: string) => !incomingIds.has(id))
  if (staleIds.length > 0) {
    const { error } = await (supabase.from('live_website_task_variants' as any) as any)
      .delete()
      .eq('study_id', studyId)
      .in('id', staleIds)
    if (error) throw error
  }
}

/**
 * Count-aware weighted variant selection.
 * Instead of pure random (which gives poor distribution at small sample sizes),
 * this checks existing assignment counts and picks the variant that is most
 * "behind" its target ratio. Ties are broken randomly to avoid deterministic
 * patterns when counts are equal (e.g. the very first participant).
 */
export async function assignVariantToParticipant(
  supabase: SupabaseClient,
  participantId: string,
  studyId: string,
  variants: LiveWebsiteVariantInput[]
): Promise<string | null> {
  if (!variants || variants.length === 0) return null
  if (variants.length === 1) {
    await insertVariantAssignment(supabase, participantId, studyId, variants[0].id)
    return variants[0].id
  }

  const totalWeight = variants.reduce((sum, v) => sum + (Number(v.weight) || 0), 0)
  if (totalWeight === 0) {
    // All weights zero — equal distribution via count balancing
    const equalVariants = variants.map((v) => ({ ...v, weight: 1 }))
    return assignByCountBalance(supabase, participantId, studyId, equalVariants, variants.length)
  }

  return assignByCountBalance(supabase, participantId, studyId, variants, totalWeight)
}

/**
 * Picks the variant most "behind" its target ratio based on existing counts.
 * target ratio = weight / totalWeight
 * deficit = targetRatio - (currentCount / totalAssigned)
 * The variant with the largest deficit gets selected.
 * Ties broken with random jitter to avoid always picking the first variant.
 */
async function assignByCountBalance(
  supabase: SupabaseClient,
  participantId: string,
  studyId: string,
  variants: LiveWebsiteVariantInput[],
  totalWeight: number
): Promise<string | null> {
  // Fetch current assignment counts per variant
  const { data: countRows } = await (supabase.from('live_website_participant_variants' as any) as any)
    .select('variant_id')
    .eq('study_id', studyId)

  const countMap = new Map<string, number>()
  for (const row of countRows || []) {
    countMap.set(row.variant_id, (countMap.get(row.variant_id) || 0) + 1)
  }
  const totalAssigned = (countRows || []).length

  // Calculate deficit for each variant (how far behind its target ratio it is)
  let maxDeficit = -Infinity
  const candidates: LiveWebsiteVariantInput[] = []

  for (const variant of variants) {
    const weight = Number(variant.weight) || 0
    const targetRatio = weight / totalWeight
    const currentRatio = totalAssigned > 0 ? (countMap.get(variant.id) || 0) / totalAssigned : 0
    const deficit = targetRatio - currentRatio

    if (deficit > maxDeficit + 0.0001) {
      // Clear winner — start fresh
      maxDeficit = deficit
      candidates.length = 0
      candidates.push(variant)
    } else if (Math.abs(deficit - maxDeficit) <= 0.0001) {
      // Tie — add to candidates for random tie-break
      candidates.push(variant)
    }
  }

  // Random tie-break among candidates with equal deficit
  const selected = candidates[Math.floor(Math.random() * candidates.length)]
  if (!selected) return null

  await insertVariantAssignment(supabase, participantId, studyId, selected.id)
  return selected.id
}

async function insertVariantAssignment(supabase: SupabaseClient, participantId: string, studyId: string, variantId: string): Promise<void> {
  const { error } = await (supabase.from('live_website_participant_variants' as any) as any).insert({
    participant_id: participantId,
    study_id: studyId,
    variant_id: variantId,
  })
  // 23505 = unique violation: this participant is already assigned (idempotent
  // retry / race) — safe to ignore. Any other error must surface, otherwise an
  // A/B assignment silently fails and results are quietly skewed.
  if (error && (error as { code?: string }).code !== '23505') {
    throw new Error(`Failed to assign live-website variant: ${error.message}`)
  }
}

export async function generateSnippetId(supabase: SupabaseClient, studyId: string): Promise<string> {
  const snippetId = crypto.randomUUID().slice(0, 12)

  const { data: study } = await supabase.from('studies').select('settings').eq('id', studyId).single()

  const currentSettings = study?.settings && typeof study.settings === 'object' ? (study.settings as Record<string, unknown>) : {}

  await supabase
    .from('studies')
    .update({
      settings: { ...currentSettings, snippetId },
    })
    .eq('id', studyId)

  return snippetId
}
