import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@veritio/study-types'
import type { ABTestVariant, ParticipantVariantAssignment } from '../lib/supabase/study-flow-types'

type SupabaseClientType = SupabaseClient<Database>
type ABTestVariantsInsert = Database['public']['Tables']['ab_test_variants']['Insert']
type ABTestVariantsUpdate = Database['public']['Tables']['ab_test_variants']['Update']

/** Deterministic hash (DJB2) for consistent variant assignment */
function djb2Hash(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
  }
  return Math.abs(hash)
}

/** Deterministic variant assignment: same participant always gets same variant for same test */
export function assignVariant(
  participantId: string,
  abTestId: string,
  splitPercentage: number
): 'A' | 'B' {
  const hash = djb2Hash(`${participantId}:${abTestId}`)
  return (hash % 100) < splitPercentage ? 'A' : 'B'
}

export interface CreateABTestInput {
  study_id: string
  entity_type: 'question' | 'section'
  entity_id: string
  variant_a_content: Json
  variant_b_content: Json
  split_percentage?: number
  is_enabled?: boolean
}

export interface UpdateABTestInput {
  variant_a_content?: Json
  variant_b_content?: Json
  split_percentage?: number
  is_enabled?: boolean
}

/** Create a new A/B test variant (idempotent — returns existing record on conflict) */
export async function createABTest(
  supabase: SupabaseClientType,
  input: CreateABTestInput
): Promise<{ data: ABTestVariant | null; error: Error | null }> {
  // First, check if an A/B test already exists for this entity
  // This handles most race conditions at the application level
  const { data: existing } = await supabase
    .from('ab_test_variants')
    .select('*')
    .eq('study_id', input.study_id)
    .eq('entity_id', input.entity_id)
    .maybeSingle()

  if (existing) {
    return {
      data: transformABTestFromDb(existing),
      error: null,
    }
  }

  const insertData: ABTestVariantsInsert = {
    study_id: input.study_id,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    variant_a_content: input.variant_a_content,
    variant_b_content: input.variant_b_content,
    split_percentage: input.split_percentage ?? 50,
    is_enabled: input.is_enabled ?? true,
  }

  const { data, error } = await supabase
    .from('ab_test_variants')
    .insert(insertData)
    .select()
    .single()

  // Race condition: another request may have created the record between check and insert
  const isUniqueViolation =
    error?.code === '23505' ||
    error?.message?.toLowerCase().includes('duplicate key')

  if (isUniqueViolation) {
    const { data: raceWinner } = await supabase
      .from('ab_test_variants')
      .select('*')
      .eq('study_id', input.study_id)
      .eq('entity_id', input.entity_id)
      .single()

    if (raceWinner) {
      return {
        data: transformABTestFromDb(raceWinner),
        error: null,
      }
    }
  }

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return {
    data: transformABTestFromDb(data),
    error: null,
  }
}

export async function getABTestsForStudy(
  supabase: SupabaseClientType,
  studyId: string
): Promise<{ data: ABTestVariant[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('ab_test_variants')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: [], error: new Error(error.message) }
  }

  return {
    data: (data || []).map(transformABTestFromDb),
    error: null,
  }
}

export async function getABTest(
  supabase: SupabaseClientType,
  abTestId: string
): Promise<{ data: ABTestVariant | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('ab_test_variants')
    .select('*')
    .eq('id', abTestId)
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return {
    data: transformABTestFromDb(data),
    error: null,
  }
}

export async function updateABTest(
  supabase: SupabaseClientType,
  abTestId: string,
  input: UpdateABTestInput
): Promise<{ data: ABTestVariant | null; error: Error | null }> {
  const updateData: ABTestVariantsUpdate = {}
  if (input.variant_a_content !== undefined) updateData.variant_a_content = input.variant_a_content
  if (input.variant_b_content !== undefined) updateData.variant_b_content = input.variant_b_content
  if (input.split_percentage !== undefined) updateData.split_percentage = input.split_percentage
  if (input.is_enabled !== undefined) updateData.is_enabled = input.is_enabled

  const { data, error } = await supabase
    .from('ab_test_variants')
    .update(updateData)
    .eq('id', abTestId)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return {
    data: transformABTestFromDb(data),
    error: null,
  }
}

export async function deleteABTest(
  supabase: SupabaseClientType,
  abTestId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase
    .from('ab_test_variants')
    .delete()
    .eq('id', abTestId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  return { success: true, error: null }
}

export async function saveVariantAssignment(
  supabase: SupabaseClientType,
  participantId: string,
  abTestId: string,
  assignedVariant: 'A' | 'B'
): Promise<{ data: ParticipantVariantAssignment | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('participant_variant_assignments')
    .upsert({
      participant_id: participantId,
      ab_test_variant_id: abTestId,
      assigned_variant: assignedVariant,
    }, {
      onConflict: 'participant_id,ab_test_variant_id',
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return {
    data: {
      id: data.id,
      participant_id: data.participant_id,
      ab_test_variant_id: data.ab_test_variant_id,
      assigned_variant: data.assigned_variant as 'A' | 'B',
      assigned_at: data.assigned_at,
    },
    error: null,
  }
}

export async function getParticipantAssignments(
  supabase: SupabaseClientType,
  participantId: string
): Promise<{ data: ParticipantVariantAssignment[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('participant_variant_assignments')
    .select('*')
    .eq('participant_id', participantId)

  if (error) {
    return { data: [], error: new Error(error.message) }
  }

  return {
    data: (data || []).map((row) => ({
      id: row.id,
      participant_id: row.participant_id,
      ab_test_variant_id: row.ab_test_variant_id,
      assigned_variant: row.assigned_variant as 'A' | 'B',
      assigned_at: row.assigned_at,
    })),
    error: null,
  }
}

/** Assign variants for all enabled A/B tests in a study. Returns entity_id -> variant map. */
export async function assignAllVariantsForParticipant(
  supabase: SupabaseClientType,
  studyId: string,
  participantId: string
): Promise<{ data: Map<string, 'A' | 'B'>; error: Error | null }> {
  const { data: abTests, error: fetchError } = await getABTestsForStudy(supabase, studyId)
  if (fetchError) {
    return { data: new Map(), error: fetchError }
  }

  const enabledTests = abTests.filter((test) => test.is_enabled)
  const assignments = new Map<string, 'A' | 'B'>()

  await Promise.all(
    enabledTests.map(async (test) => {
      const variant = assignVariant(participantId, test.id, test.split_percentage)
      assignments.set(test.entity_id, variant)
      await saveVariantAssignment(supabase, participantId, test.id, variant)
    })
  )

  return { data: assignments, error: null }
}

function transformABTestFromDb(row: any): ABTestVariant {
  return {
    id: row.id,
    study_id: row.study_id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    variant_a_content: row.variant_a_content,
    variant_b_content: row.variant_b_content,
    split_percentage: row.split_percentage,
    is_enabled: row.is_enabled,
    created_at: row.created_at,
  }
}
