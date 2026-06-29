/**
 * Polar SDK client (server-side). Reads POLAR_ACCESS_TOKEN + POLAR_SERVER from env.
 * POLAR_SERVER=sandbox (default) during testing; set to 'production' at go-live and
 * swap in the production access token + product IDs. Returns null when unconfigured
 * so callers can degrade gracefully (e.g. before Polar is set up).
 */
import { Polar } from '@polar-sh/sdk'

let cached: Polar | null = null

export function getPolar(): Polar | null {
  const accessToken = process.env.POLAR_ACCESS_TOKEN
  if (!accessToken) return null
  if (!cached) {
    cached = new Polar({
      accessToken,
      server: process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox',
    })
  }
  return cached
}

export function isPolarConfigured(): boolean {
  return !!process.env.POLAR_ACCESS_TOKEN
}

export function polarServer(): 'production' | 'sandbox' {
  return process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox'
}
