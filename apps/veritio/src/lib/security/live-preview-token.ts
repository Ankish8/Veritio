import { SignJWT, jwtVerify } from 'jose'

const PREVIEW_TOKEN_TTL_SECONDS = 5 * 60
const PREVIEW_TOKEN_ISSUER = 'veritio'
const PREVIEW_TOKEN_AUDIENCE = 'live-website-preview'

export interface LivePreviewTokenPayload {
  url: string
  sub: string
}

function getLivePreviewSecret(): Uint8Array | null {
  const secret = process.env.LIVE_WEBSITE_PREVIEW_SECRET || process.env.BETTER_AUTH_SECRET
  return secret ? new TextEncoder().encode(secret) : null
}

export function getLivePreviewOrigin(fallbackOrigin: string): string {
  const configured = process.env.NEXT_PUBLIC_LIVE_PREVIEW_ORIGIN
  if (!configured) return fallbackOrigin

  try {
    return new URL(configured).origin
  } catch {
    return fallbackOrigin
  }
}

export async function signLivePreviewToken(payload: LivePreviewTokenPayload): Promise<{
  token: string
  expiresAt: string
} | null> {
  const secret = getLivePreviewSecret()
  if (!secret) return null

  const expiresAt = new Date(Date.now() + PREVIEW_TOKEN_TTL_SECONDS * 1000)
  const token = await new SignJWT({
    scope: PREVIEW_TOKEN_AUDIENCE,
    url: payload.url,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(PREVIEW_TOKEN_ISSUER)
    .setAudience(PREVIEW_TOKEN_AUDIENCE)
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${PREVIEW_TOKEN_TTL_SECONDS}s`)
    .sign(secret)

  return { token, expiresAt: expiresAt.toISOString() }
}

export async function verifyLivePreviewToken(token: string): Promise<LivePreviewTokenPayload | null> {
  const secret = getLivePreviewSecret()
  if (!secret) return null

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: PREVIEW_TOKEN_ISSUER,
      audience: PREVIEW_TOKEN_AUDIENCE,
    })

    if (payload.scope !== PREVIEW_TOKEN_AUDIENCE || typeof payload.url !== 'string' || !payload.sub) {
      return null
    }

    return {
      url: payload.url,
      sub: String(payload.sub),
    }
  } catch {
    return null
  }
}
