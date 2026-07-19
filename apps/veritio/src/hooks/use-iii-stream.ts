'use client'

/**
 * Shared browser→backend stream client (iii-browser-sdk).
 *
 * Replaces the hand-rolled WebSocket + `{type:'join', data:{...}}` envelope
 * the stream hooks used against the old engine's StreamModule. Browsers now
 * connect through the engine's RBAC listener (same public URL/port 4004 →
 * NEXT_PUBLIC_MOTIA_WS_URL) and subscribe by registering a local callback +
 * a `stream` trigger; the engine invokes the callback on each change.
 *
 * ONE lazy singleton connection per tab, authenticated with a short-lived
 * JWT from POST /api/streams/token (the httpOnly session cookie can't ride a
 * cross-domain WS upgrade). All dashboard stream consumers are authenticated,
 * so a single authed connection serves assistantChat (allows anyone) and
 * participantActivity (requires a user) alike.
 *
 * FAIL-SOFT CONTRACT: nothing here throws to callers. A dead connection just
 * means callbacks never fire — chat hooks then fall back to their HTTP
 * response path, and the realtime-results panel shows "connection lost".
 */

import { registerWorker } from 'iii-browser-sdk'
import type { IIIConnectionState, ISdk } from 'iii-browser-sdk'

const WS_URL = process.env.NEXT_PUBLIC_MOTIA_WS_URL || 'ws://localhost:4004'

export interface StreamChangeEvent {
  type: 'stream'
  streamName: string
  groupId: string
  id?: string | null
  event: { type: string; data: unknown }
  timestamp: number
}

type TokenFetcher = () => Promise<string | null>

let worker: ISdk | null = null
let connecting: Promise<ISdk | null> | null = null
let subscriberCount = 0

/** Default token fetcher — same-origin POST carries the better-auth cookie. */
async function defaultFetchToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/streams/token', { method: 'POST', credentials: 'include' })
    if (!res.ok) return null
    const data = (await res.json()) as { token?: string }
    return data.token ?? null
  } catch {
    return null
  }
}

async function ensureWorker(fetchToken: TokenFetcher): Promise<ISdk | null> {
  if (worker) return worker
  if (connecting) return connecting

  connecting = (async () => {
    let url = WS_URL
    try {
      const token = await fetchToken()
      if (token) url = `${WS_URL}?token=${encodeURIComponent(token)}`
    } catch {
      // Proceed anonymously — fine for assistantChat; participantActivity
      // will simply not authorize (handled server-side).
    }
    try {
      const w = registerWorker(url, {
        reconnectionConfig: { maxRetries: 5 },
      })
      worker = w
      return w
    } catch {
      return null
    } finally {
      connecting = null
    }
  })()

  return connecting
}

export interface SubscribeOptions {
  onEvent: (change: StreamChangeEvent) => void
  onStatus?: (state: IIIConnectionState) => void
  fetchToken?: TokenFetcher
}

/**
 * Subscribe to changes on (streamName, groupId). Returns an unsubscribe
 * function that is always safe to call. Never throws.
 */
export function subscribeToStream(
  streamName: string,
  groupId: string,
  options: SubscribeOptions
): () => void {
  let cancelled = false
  let cleanup: (() => void) | null = null

  subscriberCount += 1

  void (async () => {
    const w = await ensureWorker(options.fetchToken ?? defaultFetchToken)
    if (!w || cancelled) return

    try {
      // Unique per-subscription function id (engine prefixes it per session).
      const fnId = `on-stream-${streamName}-${groupId}-${crypto.randomUUID()}`
      const fn = w.registerFunction(fnId, async (change: unknown) => {
        if (!cancelled) options.onEvent(change as StreamChangeEvent)
        return {}
      })
      const trigger = w.registerTrigger({
        type: 'stream',
        function_id: fnId,
        config: { stream_name: streamName, group_id: groupId },
      })

      const stopStatus = options.onStatus
        ? w.addConnectionStateListener(options.onStatus)
        : null

      cleanup = () => {
        try {
          trigger.unregister()
          fn.unregister()
          stopStatus?.()
        } catch {
          // best-effort teardown
        }
      }
      if (cancelled) cleanup()
    } catch {
      // Registration failed — fail soft; caller relies on its fallback path.
    }
  })()

  return () => {
    if (cancelled) return
    cancelled = true
    cleanup?.()
    subscriberCount = Math.max(0, subscriberCount - 1)
    // Tear the shared connection down once nothing is listening, so a fresh
    // (re-authenticated) connection is built on the next subscribe.
    if (subscriberCount === 0 && worker) {
      try {
        ;(worker as unknown as { shutdown?: () => void }).shutdown?.()
      } catch {
        // ignore
      }
      worker = null
    }
  }
}

/** Unwrap the engine's (sometimes double-wrapped) change event to the app
 *  SSE-style payload the assistant hooks consume. Mirrors the unwrap the
 *  old raw-WS handler did inline. */
export function unwrapStreamEvent<T = unknown>(change: StreamChangeEvent): T | null {
  const detail = change?.event as { type?: string; data?: unknown; event?: unknown } | undefined
  if (!detail) return null
  let raw: unknown = detail.data ?? detail.event
  if (raw && typeof raw === 'object' && (raw as { type?: string }).type === 'event') {
    const inner = raw as { data?: unknown; event?: unknown }
    raw = inner.data ?? inner.event ?? raw
  }
  return (raw as T) ?? null
}
