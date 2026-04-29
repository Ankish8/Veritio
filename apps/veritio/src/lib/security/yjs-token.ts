import { SignJWT, jwtVerify } from 'jose'

const YJS_TOKEN_ISSUER = 'veritio'
const YJS_TOKEN_AUDIENCE = 'yjs-collaboration'

export interface YjsTokenInput {
  userId: string
  email?: string
  name?: string
  studyId: string
  docName: string
  role: string
  canWrite: boolean
}

export interface YjsTokenClaims extends YjsTokenInput {
  expiresAt?: number
}

function getYjsSecret(): Uint8Array | null {
  const secret = process.env.YJS_JWT_SECRET || process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET
  return secret ? new TextEncoder().encode(secret) : null
}

export async function signYjsToken(input: YjsTokenInput): Promise<string | null> {
  const secret = getYjsSecret()
  if (!secret) return null

  return new SignJWT({
    email: input.email,
    name: input.name,
    studyId: input.studyId,
    docName: input.docName,
    role: input.role,
    canWrite: input.canWrite,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .setIssuer(YJS_TOKEN_ISSUER)
    .setAudience(YJS_TOKEN_AUDIENCE)
    .setSubject(input.userId)
    .sign(secret)
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
