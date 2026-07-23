import { SignJWT, jwtVerify } from 'jose'

const STREAM_TOKEN_ISSUER = 'veritio'
const STREAM_TOKEN_AUDIENCE = 'stream-subscription'
const STREAM_TOKEN_TTL = '10m'

export interface StreamTokenClaims {
  userId: string
  expiresAt?: number
}

function getStreamSecret(): Uint8Array | null {
  const secret =
    process.env.STREAM_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET
  return secret ? new TextEncoder().encode(secret) : null
}

/**
 * Short-lived JWT the browser attaches (`?token=`) to the stream WebSocket
 * upgrade. Minted by POST /api/streams/token behind authMiddleware — the
 * better-auth cookie is httpOnly and scoped to the app domain, so it can't
 * ride a cross-domain WS upgrade to the backend; this ticket can.
 */
export async function signStreamToken(userId: string): Promise<string | null> {
  const secret = getStreamSecret()
  if (!secret) return null

  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(STREAM_TOKEN_TTL)
    .setIssuer(STREAM_TOKEN_ISSUER)
    .setAudience(STREAM_TOKEN_AUDIENCE)
    .setSubject(userId)
    .sign(secret)
}

export async function verifyStreamToken(token: string): Promise<StreamTokenClaims | null> {
  const secret = getStreamSecret()
  if (!secret) return null

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: STREAM_TOKEN_ISSUER,
      audience: STREAM_TOKEN_AUDIENCE,
    })
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null
    return { userId: payload.sub, expiresAt: payload.exp }
  } catch {
    return null
  }
}
