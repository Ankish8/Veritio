export const LOCAL_LANDING_ORIGIN = 'http://localhost:4003'
export const DEPLOYED_LANDING_ORIGIN = 'https://landing-mu-neon.vercel.app'

interface LandingOriginOptions {
  configuredOrigin?: string | null
  nodeEnv?: string
}

export function resolveLandingOrigin(options: LandingOriginOptions = {}): string {
  const configuredOrigin =
    options.configuredOrigin ?? process.env.NEXT_PUBLIC_LANDING_ORIGIN
  const normalizedOrigin = configuredOrigin?.trim().replace(/\/+$/, '')

  if (normalizedOrigin) return normalizedOrigin

  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV
  return nodeEnv === 'production'
    ? DEPLOYED_LANDING_ORIGIN
    : LOCAL_LANDING_ORIGIN
}
