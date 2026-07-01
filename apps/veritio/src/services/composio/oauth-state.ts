import crypto from 'crypto'

export interface ComposioOAuthStateData {
  userId: string
  toolkit: string
  returnUrl?: string
  timestamp: number
}

const DEFAULT_STATE_MAX_AGE_MS = 10 * 60 * 1000

function getStateSecret(): string | null {
  return process.env.COMPOSIO_OAUTH_STATE_SECRET
    || process.env.BETTER_AUTH_SECRET
    || process.env.COMPOSIO_API_KEY
    || null
}

function sign(value: string): string | null {
  const secret = getStateSecret()
  if (!secret) return null
  return crypto.createHmac('sha256', secret).update(value).digest('hex')
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false
  const aBuffer = Buffer.from(a, 'hex')
  const bBuffer = Buffer.from(b, 'hex')
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer)
}

export function createComposioOAuthState(input: Omit<ComposioOAuthStateData, 'timestamp'>): string {
  const payload: ComposioOAuthStateData = {
    userId: input.userId,
    toolkit: input.toolkit,
    ...(input.returnUrl ? { returnUrl: input.returnUrl } : {}),
    timestamp: Date.now(),
  }

  const payloadSegment = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = sign(payloadSegment)
  if (!signature) {
    throw new Error('COMPOSIO_OAUTH_STATE_SECRET, BETTER_AUTH_SECRET, or COMPOSIO_API_KEY must be set')
  }

  return `${payloadSegment}.${signature}`
}

export function verifyComposioOAuthState(
  state: string,
  maxAgeMs = DEFAULT_STATE_MAX_AGE_MS
): { data: ComposioOAuthStateData | null; error: Error | null } {
  try {
    const [payloadSegment, signature, ...extra] = state.split('.')
    if (!payloadSegment || !signature || extra.length > 0) {
      return { data: null, error: new Error('Invalid OAuth state') }
    }

    const expectedSignature = sign(payloadSegment)
    if (!expectedSignature || !timingSafeEqualHex(signature, expectedSignature)) {
      return { data: null, error: new Error('Invalid OAuth state signature') }
    }

    const parsed = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf8')) as Partial<ComposioOAuthStateData>
    if (
      !parsed.userId ||
      !parsed.toolkit ||
      typeof parsed.timestamp !== 'number' ||
      (parsed.returnUrl !== undefined && typeof parsed.returnUrl !== 'string')
    ) {
      return { data: null, error: new Error('Invalid OAuth state payload') }
    }

    const age = Date.now() - parsed.timestamp
    if (!Number.isFinite(age) || age < 0 || age > maxAgeMs) {
      return { data: null, error: new Error('OAuth state expired') }
    }

    return {
      data: {
        userId: parsed.userId,
        toolkit: parsed.toolkit,
        ...(parsed.returnUrl ? { returnUrl: parsed.returnUrl } : {}),
        timestamp: parsed.timestamp,
      },
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Invalid OAuth state'),
    }
  }
}
