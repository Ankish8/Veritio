/**
 * Veritio AI Assistant -- Rate Limiting
 *
 * Simple daily message rate limit using the assistant_rate_limits table.
 * Resets at midnight UTC each day.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { RateLimitInfo } from './types'

 
const fromRateLimits = (supabase: SupabaseClient) => (supabase as any).from('assistant_rate_limits')

const DEFAULT_DAILY_LIMIT = 50
const getDailyLimit = (): number => {
  const env = process.env.ASSISTANT_RATE_LIMIT_PER_DAY
  if (!env) return DEFAULT_DAILY_LIMIT
  const parsed = parseInt(env, 10)
  return !isNaN(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_LIMIT
}

const todayKey = (): string => new Date().toISOString().slice(0, 10)
const endOfDayUTC = (): string => {
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  return tomorrow.toISOString()
}

/**
 * Check if a user is within their daily rate limit.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ allowed: boolean; info: RateLimitInfo }> {
  const limit = getDailyLimit()
  const date = todayKey()

  const { data } = await fromRateLimits(supabase)
    .select('message_count')
    .eq('user_id', userId)
    .eq('window_date', date)
    .single()

  const currentCount = (data?.message_count as number) ?? 0
  const remaining = Math.max(0, limit - currentCount)

  return {
    allowed: currentCount < limit,
    info: {
      remaining,
      limit,
      resetsAt: endOfDayUTC(),
    },
  }
}

/**
 * Increment the message count for the current day.
 * Uses an atomic DB function to avoid race conditions from the
 * previous non-atomic read-then-write approach.
 */
export async function incrementMessageCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const date = todayKey()

  // Preferred: atomic upsert via DB function (INSERT ... ON CONFLICT DO UPDATE)
  const { error } = await (supabase as any).rpc('increment_assistant_message_count', {
    p_user_id: userId,
    p_window_date: date,
  })

  if (!error) return

  // Fallback: Supabase JS upsert. On conflict the row is replaced, so we
  // read first to compute the new count. Still slightly racy but covers the
  // case where the RPC function hasn't been deployed yet.
  const { data: existing } = await fromRateLimits(supabase)
    .select('message_count')
    .eq('user_id', userId)
    .eq('window_date', date)
    .single()

  const newCount = ((existing?.message_count as number) ?? 0) + 1

  await fromRateLimits(supabase)
    .upsert(
      { user_id: userId, window_date: date, message_count: newCount },
      { onConflict: 'user_id,window_date' },
    )
}
