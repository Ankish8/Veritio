import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import type {
  FirstImpressionDesign,
  FirstImpressionDesignQuestion,
} from '../lib/supabase/study-flow-types'
import { cache, cacheKeys, cacheTTL } from '../lib/cache/memory-cache'

type SupabaseClientType = SupabaseClient<Database>

// Table helper needed because types.ts is manually maintained
function firstImpressionDesignsTable(supabase: SupabaseClientType): any {
  return (supabase as SupabaseClient).from('first_impression_designs')
}

interface FirstImpressionDesignRow {
  id: string
  study_id: string
  name: string | null
  position: number
  image_url: string | null
  original_filename: string | null
  source_type: 'upload' | 'figma'
  figma_file_key: string | null
  figma_node_id: string | null
  width: number | null
  height: number | null
  mobile_image_url: string | null
  mobile_width: number | null
  mobile_height: number | null
  display_mode: 'fit' | 'fill' | 'actual' | 'hidpi'
  background_color: string
  weight: number
  is_practice: boolean
  questions: FirstImpressionDesignQuestion[] | null
  created_at: string
  updated_at: string
}

interface FirstImpressionDesignInsert {
  study_id: string
  name?: string | null
  position?: number
  image_url?: string | null
  original_filename?: string | null
  source_type?: 'upload' | 'figma'
  figma_file_key?: string | null
  figma_node_id?: string | null
  width?: number | null
  height?: number | null
  mobile_image_url?: string | null
  mobile_width?: number | null
  mobile_height?: number | null
  display_mode?: 'fit' | 'fill' | 'actual' | 'hidpi'
  background_color?: string
  weight?: number
  is_practice?: boolean
  questions?: FirstImpressionDesignQuestion[]
}

interface FirstImpressionDesignUpdate {
  name?: string | null
  position?: number
  image_url?: string | null
  original_filename?: string | null
  source_type?: 'upload' | 'figma'
  figma_file_key?: string | null
  figma_node_id?: string | null
  width?: number | null
  height?: number | null
  mobile_image_url?: string | null
  mobile_width?: number | null
  mobile_height?: number | null
  display_mode?: 'fit' | 'fill' | 'actual' | 'hidpi'
  background_color?: string
  weight?: number
  is_practice?: boolean
  questions?: FirstImpressionDesignQuestion[]
}

export function invalidateFirstImpressionCache(studyId: string): void {
  cache.delete(cacheKeys.firstImpressionDesigns(studyId))
}

export async function listDesigns(
  supabase: SupabaseClientType,
  studyId: string
): Promise<{ data: FirstImpressionDesign[] | null; error: Error | null }> {
  const cacheKey = cacheKeys.firstImpressionDesigns(studyId)
  const cached = cache.get<FirstImpressionDesign[]>(cacheKey)
  if (cached) {
    return { data: cached, error: null }
  }

  const { data, error } = await firstImpressionDesignsTable(supabase)
    .select('*')
    .eq('study_id', studyId)
    .order('position', { ascending: true })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const designs: FirstImpressionDesign[] = (data as FirstImpressionDesignRow[]).map((row) => ({
    ...row,
    questions: (row.questions as FirstImpressionDesignQuestion[]) || [],
  }))

  cache.set(cacheKey, designs, cacheTTL.medium)

  return { data: designs, error: null }
}

export async function getDesign(
  supabase: SupabaseClientType,
  designId: string,
  studyId: string
): Promise<{ data: FirstImpressionDesign | null; error: Error | null }> {
  const { data, error } = await firstImpressionDesignsTable(supabase)
    .select('*')
    .eq('id', designId)
    .eq('study_id', studyId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Design not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  const row = data as FirstImpressionDesignRow
  const design: FirstImpressionDesign = {
    ...row,
    questions: (row.questions as FirstImpressionDesignQuestion[]) || [],
  }

  return { data: design, error: null }
}

export async function createDesign(
  supabase: SupabaseClientType,
  studyId: string,
  input: Omit<FirstImpressionDesignInsert, 'study_id'>
): Promise<{ data: FirstImpressionDesign | null; error: Error | null }> {
  const { data: existingDesigns } = await firstImpressionDesignsTable(supabase)
    .select('position')
    .eq('study_id', studyId)
    .order('position', { ascending: false })
    .limit(1)

  const maxPosition = existingDesigns?.[0]?.position ?? -1
  const newPosition = input.position ?? maxPosition + 1

  const insertData: FirstImpressionDesignInsert = {
    study_id: studyId,
    name: input.name ?? null,
    position: newPosition,
    image_url: input.image_url ?? null,
    original_filename: input.original_filename ?? null,
    source_type: input.source_type ?? 'upload',
    figma_file_key: input.figma_file_key ?? null,
    figma_node_id: input.figma_node_id ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    mobile_image_url: input.mobile_image_url ?? null,
    mobile_width: input.mobile_width ?? null,
    mobile_height: input.mobile_height ?? null,
    display_mode: input.display_mode ?? 'fit',
    background_color: input.background_color ?? '#ffffff',
    weight: input.weight ?? 100,
    is_practice: input.is_practice ?? false,
    questions: input.questions ?? [],
  }

  const { data, error } = await firstImpressionDesignsTable(supabase)
    .insert(insertData)
    .select('*')
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  invalidateFirstImpressionCache(studyId)

  const row = data as FirstImpressionDesignRow
  const design: FirstImpressionDesign = {
    ...row,
    questions: (row.questions as FirstImpressionDesignQuestion[]) || [],
  }

  return { data: design, error: null }
}

export async function updateDesign(
  supabase: SupabaseClientType,
  designId: string,
  studyId: string,
  input: FirstImpressionDesignUpdate
): Promise<{ data: FirstImpressionDesign | null; error: Error | null }> {
  const { data, error } = await firstImpressionDesignsTable(supabase)
    .update(input)
    .eq('id', designId)
    .eq('study_id', studyId)
    .select('*')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Design not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  invalidateFirstImpressionCache(studyId)

  const row = data as FirstImpressionDesignRow
  const design: FirstImpressionDesign = {
    ...row,
    questions: (row.questions as FirstImpressionDesignQuestion[]) || [],
  }

  return { data: design, error: null }
}

export async function deleteDesign(
  supabase: SupabaseClientType,
  designId: string,
  studyId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await firstImpressionDesignsTable(supabase)
    .delete()
    .eq('id', designId)
    .eq('study_id', studyId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  invalidateFirstImpressionCache(studyId)

  return { success: true, error: null }
}

export async function reorderDesigns(
  supabase: SupabaseClientType,
  studyId: string,
  designIds: string[]
): Promise<{ success: boolean; error: Error | null }> {
  const updates = designIds.map((id, index) =>
    firstImpressionDesignsTable(supabase)
      .update({ position: index })
      .eq('id', id)
      .eq('study_id', studyId)
  )

  const results = await Promise.all(updates)
  const errorResult = results.find((r) => r.error)
  if (errorResult?.error) {
    return { success: false, error: new Error(errorResult.error.message) }
  }

  invalidateFirstImpressionCache(studyId)

  return { success: true, error: null }
}

export async function getDesignQuestions(
  supabase: SupabaseClientType,
  designId: string,
  studyId: string
): Promise<{ data: FirstImpressionDesignQuestion[] | null; error: Error | null }> {
  const { data, error } = await getDesign(supabase, designId, studyId)

  if (error) {
    return { data: null, error }
  }

  return { data: data?.questions || [], error: null }
}

export async function updateDesignQuestions(
  supabase: SupabaseClientType,
  designId: string,
  studyId: string,
  questions: FirstImpressionDesignQuestion[]
): Promise<{ data: FirstImpressionDesignQuestion[] | null; error: Error | null }> {
  const { data, error } = await firstImpressionDesignsTable(supabase)
    .update({ questions })
    .eq('id', designId)
    .eq('study_id', studyId)
    .select('questions')
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  invalidateFirstImpressionCache(studyId)

  return { data: (data.questions as FirstImpressionDesignQuestion[]) || [], error: null }
}

export async function addDesignQuestion(
  supabase: SupabaseClientType,
  designId: string,
  studyId: string,
  question: Omit<FirstImpressionDesignQuestion, 'id' | 'position'>
): Promise<{ data: FirstImpressionDesignQuestion | null; error: Error | null }> {
  // Get current questions
  const { data: currentQuestions, error: getError } = await getDesignQuestions(
    supabase,
    designId,
    studyId
  )

  if (getError) {
    return { data: null, error: getError }
  }

  const newQuestion: FirstImpressionDesignQuestion = {
    id: crypto.randomUUID(),
    position: currentQuestions?.length || 0,
    ...question,
  }

  const updatedQuestions = [...(currentQuestions || []), newQuestion]

  const { error: updateError } = await updateDesignQuestions(
    supabase,
    designId,
    studyId,
    updatedQuestions
  )

  if (updateError) {
    return { data: null, error: updateError }
  }

  return { data: newQuestion, error: null }
}

export async function removeDesignQuestion(
  supabase: SupabaseClientType,
  designId: string,
  studyId: string,
  questionId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { data: currentQuestions, error: getError } = await getDesignQuestions(
    supabase,
    designId,
    studyId
  )

  if (getError) {
    return { success: false, error: getError }
  }

  const updatedQuestions = (currentQuestions || [])
    .filter((q) => q.id !== questionId)
    .map((q, index) => ({ ...q, position: index }))

  const { error: updateError } = await updateDesignQuestions(
    supabase,
    designId,
    studyId,
    updatedQuestions
  )

  if (updateError) {
    return { success: false, error: updateError }
  }

  return { success: true, error: null }
}

export function normalizeWeights(
  designs: Array<{ id: string; weight: number }>
): Array<{ id: string; weight: number; normalizedPercentage: number }> {
  const totalWeight = designs.reduce((sum, d) => sum + d.weight, 0)

  if (totalWeight === 0) {
    const equalPercentage = designs.length > 0 ? 100 / designs.length : 0
    return designs.map((d) => ({
      id: d.id,
      weight: d.weight,
      normalizedPercentage: equalPercentage,
    }))
  }

  return designs.map((d) => ({
    id: d.id,
    weight: d.weight,
    normalizedPercentage: (d.weight / totalWeight) * 100,
  }))
}

/** Select a design based on weighted random selection. */
export function selectWeightedDesign(
  designs: Array<{ id: string; weight: number }>
): string | null {
  if (designs.length === 0) return null
  if (designs.length === 1) return designs[0].id

  const totalWeight = designs.reduce((sum, d) => sum + d.weight, 0)
  if (totalWeight === 0) {
    return designs[Math.floor(Math.random() * designs.length)].id
  }

  const random = Math.random() * totalWeight
  let cumulative = 0

  for (const design of designs) {
    cumulative += design.weight
    if (random < cumulative) {
      return design.id
    }
  }

  return designs[designs.length - 1].id
}

export interface ParsedFigmaUrl {
  fileKey: string
  nodeId: string | null
  isValid: boolean
  error?: string
}

export function parseFigmaUrl(url: string): ParsedFigmaUrl {
  try {
    const parsed = new URL(url)

    if (!parsed.hostname.includes('figma.com')) {
      return { fileKey: '', nodeId: null, isValid: false, error: 'URL must be from figma.com' }
    }

    const pathMatch = parsed.pathname.match(/\/(proto|file|design)\/([a-zA-Z0-9]+)/)
    if (!pathMatch || !pathMatch[2]) {
      return { fileKey: '', nodeId: null, isValid: false, error: 'Could not find Figma file key in URL' }
    }

    const fileKey = pathMatch[2]
    const nodeId = parsed.searchParams.get('node-id')

    return {
      fileKey,
      nodeId: nodeId ? decodeURIComponent(nodeId) : null,
      isValid: true,
    }
  } catch {
    return { fileKey: '', nodeId: null, isValid: false, error: 'Invalid URL format' }
  }
}
