'use client'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    __veritioMetaQueue?: unknown[][]
  }
}

type MetaValue = string | number | boolean | string[] | number[] | null | undefined
export type MetaCustomData = Record<string, MetaValue>

export function trackMetaEvent(eventName: string, customData?: MetaCustomData): void {
  if (typeof window === 'undefined') return
  const cleaned: MetaCustomData = {}
  for (const [key, value] of Object.entries(customData ?? {})) {
    if (value !== undefined && value !== null && value !== '') cleaned[key] = value
  }
  const args = ['track', eventName, cleaned]
  if (typeof window.fbq === 'function') window.fbq(...args)
  else {
    window.__veritioMetaQueue ||= []
    window.__veritioMetaQueue.push(args)
  }
}
