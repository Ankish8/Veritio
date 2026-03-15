import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  QuestionNote,
  QuestionNoteInsert,
} from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

export async function listNotesByQuestion(
  supabase: SupabaseClientType,
  questionId: string
): Promise<{ data: QuestionNote[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('study_question_notes')
    .select('*')
    .eq('question_id', questionId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: data || [], error: null }
}

export async function listNotesByStudy(
  supabase: SupabaseClientType,
  studyId: string
): Promise<{ data: QuestionNote[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('study_question_notes')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: data || [], error: null }
}

export async function createNote(
  supabase: SupabaseClientType,
  data: {
    studyId: string
    questionId: string
    userId: string
    authorName: string
    content: string
  }
): Promise<{ data: QuestionNote | null; error: Error | null }> {
  const insert: QuestionNoteInsert = {
    study_id: data.studyId,
    question_id: data.questionId,
    user_id: data.userId,
    author_name: data.authorName,
    content: data.content,
  }

  const { data: note, error } = await supabase
    .from('study_question_notes')
    .insert(insert)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: note, error: null }
}

export async function deleteNote(
  supabase: SupabaseClientType,
  noteId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { data: existingNote, error: fetchError } = await supabase
    .from('study_question_notes')
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
    .from('study_question_notes')
    .delete()
    .eq('id', noteId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  return { success: true, error: null }
}

export async function updateNote(
  supabase: SupabaseClientType,
  noteId: string,
  userId: string,
  content: string
): Promise<{ data: QuestionNote | null; error: Error | null }> {
  const { data: existingNote, error: fetchError } = await supabase
    .from('study_question_notes')
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
    .from('study_question_notes')
    .update({ content })
    .eq('id', noteId)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: note, error: null }
}
