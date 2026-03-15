/**
 * Composio Triggers Service
 *
 * Manages event triggers for Composio toolkits.
 */

import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { getComposioClient } from './index'
import * as cache from './cache'

type SupabaseClientType = SupabaseClient<Database>

 
const fromTriggers = (supabase: SupabaseClientType) => (supabase as any).from('composio_triggers')

const CACHE_TTL_MS = 10 * 60 * 1000

export interface ComposioTrigger {
  id: string
  user_id: string
  toolkit: string
  trigger_slug: string
  composio_trigger_id: string | null
  trigger_config: Record<string, unknown>
  status: string
  last_event_at: string | null
  event_count: number
  created_at: string
  updated_at: string
}

export interface AvailableTrigger {
  slug: string
  name: string
  description: string
  configSchema: Record<string, unknown>
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error'
}

export async function createTrigger(
  supabase: SupabaseClientType,
  userId: string,
  toolkit: string,
  triggerSlug: string,
  config?: Record<string, unknown>
): Promise<{ data: ComposioTrigger | null; error: Error | null }> {
  try {
    const client = getComposioClient()
    const result = await client.triggers.create(userId, triggerSlug, {
      triggerConfig: config ?? {},
    })

    const { data, error } = await fromTriggers(supabase)
      .upsert(
        {
          user_id: userId,
          toolkit,
          trigger_slug: triggerSlug,
          composio_trigger_id: result?.triggerId ?? null,
          trigger_config: config ?? {},
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,toolkit,trigger_slug' }
      )
      .select()
      .single()

    if (error) return { data: null, error: new Error(error.message) }
    return { data: data as ComposioTrigger, error: null }
  } catch (err) {
    return { data: null, error: new Error(`Failed to create trigger: ${toErrorMessage(err)}`) }
  }
}

export async function listTriggers(
  supabase: SupabaseClientType,
  userId: string,
  toolkit?: string
): Promise<{ data: ComposioTrigger[]; error: Error | null }> {
  let query = fromTriggers(supabase)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (toolkit) query = query.eq('toolkit', toolkit)

  const { data, error } = await query

  if (error) return { data: [], error: new Error(error.message) }
  return { data: (data || []) as ComposioTrigger[], error: null }
}

export async function deleteTrigger(
  supabase: SupabaseClientType,
  triggerId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { data: trigger, error: fetchError } = await fromTriggers(supabase)
    .select('*')
    .eq('id', triggerId)
    .eq('user_id', userId)
    .single()

  if (fetchError) return { success: false, error: new Error(fetchError.message) }
  if (!trigger) return { success: false, error: new Error('Trigger not found') }

  // Best-effort: delete from Composio SDK
  if (trigger.composio_trigger_id) {
    try {
      const client = getComposioClient()
      await client.triggers.delete(trigger.composio_trigger_id)
    } catch {
      // Continue with DB deletion even if SDK call fails
    }
  }

  const { error } = await fromTriggers(supabase)
    .delete()
    .eq('id', triggerId)
    .eq('user_id', userId)

  if (error) return { success: false, error: new Error(error.message) }
  return { success: true, error: null }
}

// ---------------------------------------------------------------------------
// Available trigger discovery
// ---------------------------------------------------------------------------

export async function listAvailableTriggers(
  toolkit: string
): Promise<{ data: AvailableTrigger[]; error: Error | null }> {
  const cacheKey = `available-triggers:${toolkit}`
  const cached = cache.get<AvailableTrigger[]>(cacheKey)
  if (cached) return { data: cached, error: null }

  try {
    const client = getComposioClient()
    const result = await client.triggers.listTypes({ toolkits: [toolkit] })
    const items = result?.items ?? []

     
    const triggers: AvailableTrigger[] = items.map((item: any) => ({
      slug: item.slug ?? '',
      name: item.name ?? '',
      description: item.description ?? '',
      configSchema: item.config ?? {},
    }))

    cache.set(cacheKey, triggers, CACHE_TTL_MS)
    return { data: triggers, error: null }
  } catch (err) {
    return { data: [], error: new Error(`Failed to list available triggers: ${toErrorMessage(err)}`) }
  }
}

// ---------------------------------------------------------------------------
// Webhook verification
// ---------------------------------------------------------------------------

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.COMPOSIO_WEBHOOK_SECRET
  if (!secret) return true // Skip verification if no secret configured

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

// ---------------------------------------------------------------------------
// Webhook event processing
// ---------------------------------------------------------------------------

interface WebhookEventData {
  triggerId: string
  composioTriggerId: string
  eventType: string
  userId: string
  triggerConfig: Record<string, unknown>
  toolkit: string
  triggerSlug: string
}

export async function handleWebhookEvent(
  supabase: SupabaseClientType,
  payload: Record<string, unknown>,
  signature?: string
): Promise<{ data: WebhookEventData | null; error: Error | null }> {
  if (signature) {
    const isValid = verifyWebhookSignature(JSON.stringify(payload), signature)
    if (!isValid) return { data: null, error: new Error('Invalid webhook signature') }
  }

  const composioTriggerId = payload.triggerId as string | undefined
  if (!composioTriggerId) {
    return { data: null, error: new Error('Missing triggerId in webhook payload') }
  }

  const { data: trigger, error: fetchError } = await fromTriggers(supabase)
    .select('id, event_count, user_id, trigger_config, toolkit, trigger_slug')
    .eq('composio_trigger_id', composioTriggerId)
    .single()

  if (fetchError || !trigger) {
    return { data: null, error: new Error(fetchError?.message ?? 'Trigger not found') }
  }

  const { error } = await fromTriggers(supabase)
    .update({
      event_count: (trigger.event_count ?? 0) + 1,
      last_event_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', trigger.id)

  if (error) return { data: null, error: new Error(error.message) }

  return {
    data: {
      triggerId: trigger.id as string,
      composioTriggerId,
      eventType: (payload.type as string) || 'unknown',
      userId: trigger.user_id as string,
      triggerConfig: (trigger.trigger_config ?? {}) as Record<string, unknown>,
      toolkit: trigger.toolkit as string,
      triggerSlug: trigger.trigger_slug as string,
    },
    error: null,
  }
}
