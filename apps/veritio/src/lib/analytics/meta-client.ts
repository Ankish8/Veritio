'use client'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    __veritioMetaQueue?: unknown[][]
  }
}

export type MetaBrowserEventName =
  | 'PageView'
  | 'ViewContent'
  | 'Lead'
  | 'CompleteRegistration'
  | 'InitiateCheckout'
  | 'Purchase'

export type MetaCustomData = Record<string, string | number | boolean | string[] | number[] | null | undefined>

export function createMetaEventId(eventName: string): string {
  const safeName = eventName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`
  return `${safeName}_${random}`
}

function cleanCustomData(data?: MetaCustomData): MetaCustomData | undefined {
  if (!data) return undefined
  const out: MetaCustomData = {}
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null && value !== '') out[key] = value
  }
  return Object.keys(out).length ? out : undefined
}

export function trackMetaEvent(
  eventName: MetaBrowserEventName,
  customData?: MetaCustomData,
  eventId = createMetaEventId(eventName),
): string {
  if (typeof window === 'undefined') return eventId
  const cleaned = cleanCustomData(customData)
  const args = ['track', eventName, cleaned ?? {}, { eventID: eventId }]
  if (typeof window.fbq === 'function') window.fbq(...args)
  else {
    window.__veritioMetaQueue ||= []
    window.__veritioMetaQueue.push(args)
  }
  return eventId
}

export async function sendMetaConversion(input: {
  eventName: Extract<MetaBrowserEventName, 'CompleteRegistration' | 'Lead' | 'Purchase'>
  eventId: string
  email?: string
  externalId?: string
  customData?: MetaCustomData
  eventSourceUrl?: string
}): Promise<void> {
  try {
    await fetch('/api/meta/conversions', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch {
    // Conversion tracking must never block the product flow.
  }
}
