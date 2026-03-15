/**
 * Panel Participant Note Service
 *
 * Business logic for managing timestamped notes on participants.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  PanelParticipantNote,
  PanelParticipantNoteInsert,
  PanelParticipantNoteUpdate,
} from '../../lib/supabase/panel-types'

export class PanelNoteService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get all notes for a participant
   */
  async getForParticipant(participantId: string): Promise<PanelParticipantNote[]> {
    const { data, error } = await this.supabase
      .from('panel_participant_notes')
      .select('*')
      .eq('panel_participant_id', participantId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get a single note
   */
  async get(noteId: string): Promise<PanelParticipantNote | null> {
    const { data, error } = await this.supabase
      .from('panel_participant_notes')
      .select('*')
      .eq('id', noteId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Create a new note
   */
  async create(userId: string, input: PanelParticipantNoteInsert): Promise<PanelParticipantNote> {
    const { data, error } = await this.supabase
      .from('panel_participant_notes')
      .insert({
        panel_participant_id: input.panel_participant_id,
        user_id: userId,
        content: input.content.trim(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update a note
   */
  async update(
    noteId: string,
    userId: string,
    input: PanelParticipantNoteUpdate
  ): Promise<PanelParticipantNote> {
    const { data, error } = await this.supabase
      .from('panel_participant_notes')
      .update({ content: input.content.trim() })
      .eq('id', noteId)
      .eq('user_id', userId) // Only note creator can edit
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Delete a note
   */
  async delete(noteId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('panel_participant_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId) // Only note creator can delete

    if (error) throw error
  }

  /**
   * Get note count for a participant
   */
  async getCount(participantId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('panel_participant_notes')
      .select('id', { count: 'exact', head: true })
      .eq('panel_participant_id', participantId)

    if (error) throw error
    return count || 0
  }

  /**
   * Get recent notes across all participants (for activity feed)
   */
  async getRecent(userId: string, limit: number = 10): Promise<
    Array<
      PanelParticipantNote & {
        participant_email: string
        participant_name: string | null
      }
    >
  > {
    const { data, error } = await this.supabase
      .from('panel_participant_notes')
      .select(`
        *,
        panel_participants!inner (
          email,
          first_name,
          last_name,
          user_id
        )
      `)
      .eq('panel_participants.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || []).map((note) => ({
      ...note,
      participant_email: note.panel_participants.email,
      participant_name: [note.panel_participants.first_name, note.panel_participants.last_name]
        .filter(Boolean)
        .join(' ') || null,
    }))
  }

  /**
   * Search notes by content
   */
  async search(
    userId: string,
    query: string,
    limit: number = 20
  ): Promise<
    Array<
      PanelParticipantNote & {
        participant_email: string
      }
    >
  > {
    const { data, error } = await this.supabase
      .from('panel_participant_notes')
      .select(`
        *,
        panel_participants!inner (
          email,
          user_id
        )
      `)
      .eq('panel_participants.user_id', userId)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || []).map((note) => ({
      ...note,
      participant_email: note.panel_participants.email,
    }))
  }
}

export function createPanelNoteService(supabase: SupabaseClient): PanelNoteService {
  return new PanelNoteService(supabase)
}
