// IMPORTANT: keep verify logic in sync with apps/veritio/src/lib/security/yjs-token.ts
// The Next.js side mints tokens (signYjsToken); the yjs server only verifies.
// Duplicated here so the yjs Docker image is self-contained — it has its own
// node_modules/jose, and a shared module from src/lib/security/ would not
// resolve `jose` from this directory tree at runtime.
import { jwtVerify } from 'jose'

const YJS_TOKEN_ISSUER = 'veritio'
const YJS_TOKEN_AUDIENCE = 'yjs-collaboration'

export interface YjsTokenClaims {
  userId: string
  email?: string
  name?: string
  studyId: string
  docName: string
  role: string
  canWrite: boolean
  expiresAt?: number
}

function getYjsSecret(): Uint8Array | null {
  const secret = process.env.YJS_JWT_SECRET || process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET
  return secret ? new TextEncoder().encode(secret) : null
}

export async function verifyYjsToken(token: string): Promise<YjsTokenClaims | null> {
  const secret = getYjsSecret()
  if (!secret) return null

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: YJS_TOKEN_ISSUER,
      audience: YJS_TOKEN_AUDIENCE,
    })

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.studyId !== 'string' ||
      typeof payload.docName !== 'string' ||
      typeof payload.role !== 'string' ||
      typeof payload.canWrite !== 'boolean'
    ) {
      return null
    }

    return {
      userId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      studyId: payload.studyId,
      docName: payload.docName,
      role: payload.role,
      canWrite: payload.canWrite,
      expiresAt: payload.exp,
    }
  } catch {
    return null
  }
}
