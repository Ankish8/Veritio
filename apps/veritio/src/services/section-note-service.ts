import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  SectionNote,
  SectionNoteInsert,
} from '@veritio/study-types'
import type { FlowQuestionSection } from './types'

type SupabaseClientType = SupabaseClient<Database>

// Re-export the type for consumers
export type { SectionNote, SectionNoteInsert }

export async function listNotesBySection(
  supabase: SupabaseClientType,
  studyId: string,
  section: FlowQuestionSection
): Promise<{ data: SectionNote[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('study_section_notes')
    .select('*')
    .eq('study_id', studyId)
    .eq('section', section)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: data || [], error: null }
}

export async function listSectionNotesByStudy(
  supabase: SupabaseClientType,
  studyId: string
): Promise<{ data: SectionNote[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('study_section_notes')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: data || [], error: null }
}

export async function createSectionNote(
  supabase: SupabaseClientType,
  data: {
    studyId: string
    section: FlowQuestionSection
    userId: string
    authorName: string
    content: string
  }
): Promise<{ data: SectionNote | null; error: Error | null }> {
  const insert: SectionNoteInsert = {
    study_id: data.studyId,
    section: data.section,
    user_id: data.userId,
    author_name: data.authorName,
    content: data.content,
  }

  const { data: note, error } = await supabase
    .from('study_section_notes')
    .insert(insert)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: note, error: null }
}

export async function deleteSectionNote(
  supabase: SupabaseClientType,
  noteId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { data: existingNote, error: fetchError } = await supabase
    .from('study_section_notes')
    .select('user_id')
    .eq('id', noteId)
    .single()

  if (fetchError) {
    return { success: false, error: new Error('Note not found') }
  }

  if (existingNote.user_id !== userId) {
    return { success: false, error: new Error('Not authorized to delete this note') }
  }

  const { error } = await supabase
    .from('study_section_notes')
    .delete()
    .eq('id', noteId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  return { success: true, error: null }
}

export async function updateSectionNote(
  supabase: SupabaseClientType,
  noteId: string,
  userId: string,
  content: string
): Promise<{ data: SectionNote | null; error: Error | null }> {
  const { data: existingNote, error: fetchError } = await supabase
    .from('study_section_notes')
    .select('user_id')
    .eq('id', noteId)
    .single()

  if (fetchError) {
    return { data: null, error: new Error('Note not found') }
  }

  if (existingNote.user_id !== userId) {
    return { data: null, error: new Error('Not authorized to update this note') }
  }

  const { data: note, error } = await supabase
    .from('study_section_notes')
    .update({ content })
    .eq('id', noteId)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: note, error: null }
}
