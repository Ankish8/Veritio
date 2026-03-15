/**
 * Veritio AI Assistant -- Conversation Service
 *
 * CRUD operations for assistant conversations and messages.
 * Tables are not yet in generated DB types, so we cast via `(supabase as any)`.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AssistantMessage, Conversation, MessageRole, MessageMetadata } from './types'

 
const fromConversations = (supabase: SupabaseClient) => (supabase as any).from('assistant_conversations')
 
const fromMessages = (supabase: SupabaseClient) => (supabase as any).from('assistant_messages')

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

 
function mapConversation(row: any): Conversation {
  return {
    id: row.id,
    studyId: row.study_id,
    userId: row.user_id,
    title: row.title,
    mode: row.mode || 'results',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createConversation(
  supabase: SupabaseClient,
  userId: string,
  studyId?: string | null,
  title?: string,
  mode: 'results' | 'builder' | 'create' = 'results',
): Promise<Conversation | null> {
  const { data, error } = await fromConversations(supabase)
    .insert({
      user_id: userId,
      study_id: studyId ?? null,
      title: title || null,
      mode,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create conversation: ${error.message}`)
  return mapConversation(data)
}

export async function getConversation(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<Conversation | null> {
  const { data, error } = await fromConversations(supabase)
    .select('*')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .single()

  if (error) return null
  return mapConversation(data)
}

export async function listConversations(
  supabase: SupabaseClient,
  userId: string,
  studyId?: string | null,
  mode?: 'results' | 'builder' | 'create',
): Promise<Conversation[]> {
  let query = fromConversations(supabase)
    .select('*')
    .eq('user_id', userId)

  if (studyId) {
    query = query.eq('study_id', studyId)
  } else {
    query = query.is('study_id', null)
  }

  if (mode) {
    query = query.eq('mode', mode)
  }

  const { data, error } = await query.order('updated_at', { ascending: false })

  if (error) throw new Error(`Failed to list conversations: ${error.message}`)
  return (data ?? []).map(mapConversation)
}

export async function updateConversationTitle(
  supabase: SupabaseClient,
  conversationId: string,
  title: string,
): Promise<void> {
  const { error } = await fromConversations(supabase)
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  if (error) throw new Error(`Failed to update conversation title: ${error.message}`)
}

export async function updateConversationStudyId(
  supabase: SupabaseClient,
  conversationId: string,
  studyId: string,
): Promise<void> {
  const { error } = await fromConversations(supabase)
    .update({ study_id: studyId, updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  if (error) throw new Error(`Failed to update conversation study_id: ${error.message}`)
}

export async function deleteConversation(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<void> {
  // Messages are cascade-deleted via FK
  const { error } = await fromConversations(supabase)
    .delete()
    .eq('id', conversationId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to delete conversation: ${error.message}`)
}

export async function touchConversation(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<void> {
  await fromConversations(supabase)
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function addMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: MessageRole,
  content: string | null,
  options?: {
    toolCalls?: unknown
    toolCallId?: string
    metadata?: MessageMetadata
  },
): Promise<AssistantMessage> {
  const { data, error } = await fromMessages(supabase)
    .insert({
      conversation_id: conversationId,
      role,
      content,
      tool_calls: options?.toolCalls ?? null,
      tool_call_id: options?.toolCallId ?? null,
      metadata: options?.metadata ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add message: ${error.message}`)

  const row = data as Record<string, unknown>
  return mapRowToMessage(row)
}

export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string,
  options?: { limit?: number },
): Promise<AssistantMessage[]> {
  // When limit is set, fetch most recent N messages (desc + reverse)
  if (options?.limit) {
    const { data, error } = await fromMessages(supabase)
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(options.limit)

    if (error) throw new Error(`Failed to get messages: ${error.message}`)
    return ((data ?? []) as Record<string, unknown>[]).reverse().map(mapRowToMessage)
  }

  const { data, error } = await fromMessages(supabase)
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to get messages: ${error.message}`)

  return ((data ?? []) as Record<string, unknown>[]).map(mapRowToMessage)
}

export async function getMessage(
  supabase: SupabaseClient,
  messageId: string,
): Promise<AssistantMessage | null> {
  const { data, error } = await fromMessages(supabase)
    .select('*')
    .eq('id', messageId)
    .single()

  if (error) return null
  return mapRowToMessage(data as Record<string, unknown>)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapRowToMessage(row: Record<string, unknown>): AssistantMessage {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    role: row.role as MessageRole,
    content: (row.content as string) ?? null,
    toolCalls: row.tool_calls ?? null,
    toolCallId: (row.tool_call_id as string) ?? null,
    metadata: (row.metadata as MessageMetadata) ?? null,
    createdAt: row.created_at as string,
  }
}
