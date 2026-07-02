/**
 * Redis L2 layer for the memory cache.
 *
 * The in-process LRU (L1) stays authoritative for sync reads; this module
 * mirrors writes into Redis so cache entries survive restarts and are shared
 * across instances (API process, queue workers). Invalidations are broadcast
 * over pub/sub so every instance drops its L1 copy.
 *
 * Fail-open by design: every Redis operation is fire-and-forget or guarded by
 * the connection state. If Redis is unreachable (or not configured, e.g. on
 * the Next.js/Vercel side), behavior degrades to the previous L1-only cache.
 */

import type Redis from 'ioredis'
// '#redis-client' resolves per environment (package.json "imports"): the real
// ioredis-backed client on the server, a never-executed stub in the browser
import { getRedisClient } from '#redis-client'

const KEY_PREFIX = 'veritio:cache:'
const INVALIDATE_CHANNEL = 'veritio:cache:invalidate'

export interface InvalidateMessage {
  type: 'key' | 'prefix' | 'clear'
  value?: string
}

let initAttempted = false
let publisher: Redis | null = null
let subscriber: Redis | null = null
let clientFactoryForTests: (() => Redis) | null = null

function redisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL || process.env.REDIS_HOST)
}

function l2Enabled(): boolean {
  // Never in the browser: client bundles get an ioredis stub, and browser
  // code must stay L1-only regardless of bundling
  if (typeof window !== 'undefined') return false
  return redisConfigured() && process.env.CACHE_REDIS_L2_DISABLED !== 'true'
}

/**
 * Idempotent lazy init. `onInvalidate` receives broadcast invalidations from
 * other instances and must only touch the local L1 (never re-publish).
 */
export function initRedisL2(onInvalidate: (msg: InvalidateMessage) => void): void {
  if (initAttempted || !l2Enabled()) return
  initAttempted = true

  try {
    publisher = (clientFactoryForTests ?? getRedisClient)()
    if (publisher.status === 'wait') {
      publisher.connect().catch(() => {})
    }

    subscriber = publisher.duplicate()
    subscriber.on('error', () => {}) // logged by the base client's handler pattern
    subscriber.subscribe(INVALIDATE_CHANNEL).catch(() => {})
    subscriber.on('message', (_channel, raw) => {
      try {
        const msg = JSON.parse(raw) as InvalidateMessage
        if (msg && (msg.type === 'clear' || typeof msg.value === 'string')) {
          onInvalidate(msg)
        }
      } catch {
        // Malformed message — ignore
      }
    })
  } catch {
    publisher = null
    subscriber = null
  }
}

function readyPublisher(): Redis | null {
  return publisher && publisher.status === 'ready' ? publisher : null
}

/** Fire-and-forget write with TTL. */
export function l2Set(key: string, value: unknown, ttlMs: number): void {
  const client = readyPublisher()
  if (!client) return

  try {
    // Wrapped so a cached `null`/primitive round-trips unambiguously
    const payload = JSON.stringify({ v: value })
    client.set(KEY_PREFIX + key, payload, 'PX', Math.max(1, Math.round(ttlMs))).catch(() => {})
  } catch {
    // Non-serializable value — L1 keeps working, skip L2
  }
}

/** Read with remaining TTL so L1 can be hydrated without extending lifetime. */
export async function l2Get<T>(key: string): Promise<{ value: T; ttlMs: number } | null> {
  const client = readyPublisher()
  if (!client) return null

  try {
    const [raw, pttl] = await Promise.all([
      client.get(KEY_PREFIX + key),
      client.pttl(KEY_PREFIX + key),
    ])
    if (raw === null) return null

    const parsed = JSON.parse(raw) as { v: T }
    return { value: parsed.v, ttlMs: pttl > 0 ? pttl : 0 }
  } catch {
    return null
  }
}

function publish(msg: InvalidateMessage): void {
  const client = readyPublisher()
  if (!client) return
  client.publish(INVALIDATE_CHANNEL, JSON.stringify(msg)).catch(() => {})
}

export function l2Delete(key: string): void {
  const client = readyPublisher()
  if (client) client.del(KEY_PREFIX + key).catch(() => {})
  publish({ type: 'key', value: key })
}

export function l2DeletePrefix(prefix: string): void {
  const client = readyPublisher()
  if (client) {
    deleteByScan(client, KEY_PREFIX + prefix + '*').catch(() => {})
  }
  publish({ type: 'prefix', value: prefix })
}

export function l2Clear(): void {
  const client = readyPublisher()
  if (client) {
    deleteByScan(client, KEY_PREFIX + '*').catch(() => {})
  }
  publish({ type: 'clear' })
}

async function deleteByScan(client: Redis, match: string): Promise<void> {
  let cursor = '0'
  do {
    const [next, keys] = await client.scan(cursor, 'MATCH', match, 'COUNT', 200)
    cursor = next
    if (keys.length > 0) {
      await client.del(...keys)
    }
  } while (cursor !== '0')
}

/** Test hook: substitute the Redis client (avoids brittle module mocking). */
export function __setRedisClientFactoryForTests(factory: () => Redis): void {
  clientFactoryForTests = factory
}

/** Test hook: reset module state so init can run again with fresh mocks. */
export function __resetRedisL2ForTests(): void {
  initAttempted = false
  publisher = null
  try {
    subscriber?.disconnect()
  } catch {
    // already closed
  }
  subscriber = null
}
