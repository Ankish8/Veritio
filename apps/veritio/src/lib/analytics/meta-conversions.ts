import crypto from 'node:crypto'

export type MetaServerEventName =
  | 'PageView'
  | 'ViewContent'
  | 'Lead'
  | 'CompleteRegistration'
  | 'InitiateCheckout'
  | 'Purchase'

export interface MetaServerEventInput {
  eventName: MetaServerEventName
  eventId?: string | null
  eventTime?: number
  eventSourceUrl?: string | null
  email?: string | null
  externalId?: string | null
  fbp?: string | null
  fbc?: string | null
  clientIpAddress?: string | null
  clientUserAgent?: string | null
  customData?: Record<string, unknown>
}

function configuredPixelId(): string | null {
  return process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || null
}

function configuredGraphVersion(): string {
  const raw = process.env.META_GRAPH_API_VERSION || 'v25.0'
  return raw.startsWith('v') ? raw : `v${raw}`
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function normalizeEmail(email?: string | null): string | null {
  const normalized = email?.trim().toLowerCase()
  return normalized || null
}

function prune<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(prune).filter((item) => item !== undefined && item !== null) as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val === undefined || val === null || val === '') continue
      out[key] = prune(val)
    }
    return out as T
  }
  return value
}

export function createServerMetaEventId(eventName: string, seed?: string | null): string {
  const safeName = eventName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  return `${safeName}_${seed || crypto.randomUUID()}`
}

export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return (
    headers.get('cf-connecting-ip') ||
    forwarded ||
    headers.get('x-real-ip') ||
    null
  )
}

export function getCookieValue(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const [rawKey, ...rawValue] = part.trim().split('=')
    if (rawKey === name) return decodeURIComponent(rawValue.join('='))
  }
  return null
}

export async function trackMetaServerEvent(input: MetaServerEventInput): Promise<{ ok: boolean; skipped?: string }> {
  const pixelId = configuredPixelId()
  const accessToken = process.env.META_CONVERSIONS_ACCESS_TOKEN || process.env.META_CAPI_ACCESS_TOKEN || null

  if (!pixelId) return { ok: true, skipped: 'missing_pixel_id' }
  if (!accessToken) return { ok: true, skipped: 'missing_access_token' }

  const email = normalizeEmail(input.email)
  const event = prune({
    event_name: input.eventName,
    event_time: input.eventTime || Math.floor(Date.now() / 1000),
    event_id: input.eventId || createServerMetaEventId(input.eventName),
    action_source: 'website',
    event_source_url: input.eventSourceUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://veritio.io',
    user_data: {
      em: email ? [sha256(email)] : undefined,
      external_id: input.externalId ? [sha256(input.externalId.trim())] : undefined,
      fbp: input.fbp,
      fbc: input.fbc,
      client_ip_address: input.clientIpAddress,
      client_user_agent: input.clientUserAgent,
    },
    custom_data: input.customData,
  })

  const body = prune({
    data: [event],
    test_event_code: process.env.META_TEST_EVENT_CODE || process.env.META_CONVERSIONS_TEST_EVENT_CODE,
  })

  try {
    const url = new URL(`https://graph.facebook.com/${configuredGraphVersion()}/${pixelId}/events`)
    url.searchParams.set('access_token', accessToken)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = (await res.json().catch(() => null)) as { events_received?: number; error?: unknown } | null
    if (!res.ok || json?.error) {
      console.warn('[meta-capi] event rejected', { eventName: input.eventName, status: res.status, response: json })
      return { ok: false }
    }
    return { ok: true }
  } catch (error) {
    console.warn('[meta-capi] event send failed', { eventName: input.eventName, error })
    return { ok: false }
  }
}
