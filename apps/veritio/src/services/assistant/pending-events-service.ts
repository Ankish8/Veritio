/**
 * Pending Events Service
 *
 * Manages assistant pending events — trigger events queued for surfacing
 * in the AI assistant chat. Three-state lifecycle:
 *   pending -> surfaced (injected into chat) -> dismissed (user acknowledged)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

 
const fromPendingEvents = (supabase: SupabaseClientType) => (supabase as any).from('assistant_pending_events')

export interface PendingEvent {
  id: string
  user_id: string
  trigger_id: string
  toolkit: string
  trigger_slug: string
  event_type: string
  event_summary: string
  event_payload: Record<string, unknown>
  status: 'pending' | 'surfaced' | 'dismissed'
  surfaced_in_conversation_id: string | null
  created_at: string
  surfaced_at: string | null
}

interface ServiceResult<T> {
  data: T
  error: Error | null
}

const handleError = (err: unknown): Error =>
  new Error(err instanceof Error ? err.message : 'Unknown error')

/**
 * Get count of pending events for a user.
 */
export async function getPendingEventCount(
  supabase: SupabaseClientType,
  userId: string
): Promise<ServiceResult<number>> {
  try {
    const { count, error } = await fromPendingEvents(supabase)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending')

    if (error) return { data: 0, error: new Error(error.message) }
    return { data: count ?? 0, error: null }
  } catch (err) {
    return { data: 0, error: handleError(err) }
  }
}

/**
 * Get all pending events for a user.
 */
export async function getPendingEvents(
  supabase: SupabaseClientType,
  userId: string
): Promise<ServiceResult<PendingEvent[]>> {
  try {
    const { data, error } = await fromPendingEvents(supabase)
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) return { data: [], error: new Error(error.message) }
    return { data: (data ?? []) as PendingEvent[], error: null }
  } catch (err) {
    return { data: [], error: handleError(err) }
  }
}

/**
 * Mark events as surfaced in a conversation.
 */
export async function surfaceEvents(
  supabase: SupabaseClientType,
  userId: string,
  eventIds: string[],
  conversationId: string
): Promise<{ error: Error | null }> {
  if (eventIds.length === 0) return { error: null }

  try {
    const { error } = await fromPendingEvents(supabase)
      .update({
        status: 'surfaced',
        surfaced_at: new Date().toISOString(),
        surfaced_in_conversation_id: conversationId,
      })
      .eq('user_id', userId)
      .in('id', eventIds)

    return { error: error ? new Error(error.message) : null }
  } catch (err) {
    return { error: handleError(err) }
  }
}

/**
 * Dismiss all pending/surfaced events for a user.
 */
export async function dismissEvents(
  supabase: SupabaseClientType,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await fromPendingEvents(supabase)
      .update({ status: 'dismissed' })
      .eq('user_id', userId)
      .in('status', ['pending', 'surfaced'])

    return { error: error ? new Error(error.message) : null }
  } catch (err) {
    return { error: handleError(err) }
  }
}

/**
 * Dismiss a single pending event by ID.
 */
export async function dismissEvent(
  supabase: SupabaseClientType,
  userId: string,
  eventId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await fromPendingEvents(supabase)
      .update({ status: 'dismissed' })
      .eq('user_id', userId)
      .eq('id', eventId)
      .in('status', ['pending', 'surfaced'])

    return { error: error ? new Error(error.message) : null }
  } catch (err) {
    return { error: handleError(err) }
  }
}
