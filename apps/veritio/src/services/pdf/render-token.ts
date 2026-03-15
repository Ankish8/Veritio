/**
 * Render Token Service
 *
 * Generates and validates short-lived JWT tokens for PDF render pages.
 * These tokens allow Puppeteer to access render pages without user session cookies.
 */

import * as jose from 'jose'
import type { RenderTokenPayload, RenderTokenData } from './types'

// ============================================================================
// Configuration
// ============================================================================

const TOKEN_EXPIRY_SECONDS = 5 * 60 // 5 minutes
const TOKEN_ALGORITHM = 'HS256'

function getSecret(): Uint8Array {
  const secret = process.env.PDF_RENDER_SECRET
  if (!secret) {
    throw new Error('PDF_RENDER_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate a short-lived JWT token for accessing PDF render pages
 */
export async function generateRenderToken(
  payload: RenderTokenPayload
): Promise<string> {
  const secret = getSecret()

  const jwt = await new jose.SignJWT({
    studyId: payload.studyId,
    userId: payload.userId,
    sections: payload.sections,
    studyType: payload.studyType,
  })
    .setProtectedHeader({ alg: TOKEN_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_EXPIRY_SECONDS}s`)
    .sign(secret)

  return jwt
}

// ============================================================================
// Token Validation
// ============================================================================

/**
 * Validate a render token and return the payload
 * Returns null if the token is invalid or expired
 */
export async function validateRenderToken(
  token: string
): Promise<RenderTokenData | null> {
  try {
    const secret = getSecret()

    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: [TOKEN_ALGORITHM],
    })

    // Validate required fields
    if (
      typeof payload.studyId !== 'string' ||
      typeof payload.userId !== 'string' ||
      !Array.isArray(payload.sections) ||
      typeof payload.studyType !== 'string'
    ) {
      return null
    }

    return {
      studyId: payload.studyId,
      userId: payload.userId,
      sections: payload.sections as string[],
      studyType: payload.studyType as 'card_sort' | 'tree_test' | 'survey',
      exp: payload.exp as number,
      iat: payload.iat as number,
    }
  } catch {
    // Token is invalid or expired
    return null
  }
}

/**
 * Check if a section is allowed by the token
 */
export function isSectionAllowed(
  tokenData: RenderTokenData,
  section: string
): boolean {
  return tokenData.sections.includes(section)
}

/**
 * Check if the study ID matches the token
 */
export function isStudyAllowed(
  tokenData: RenderTokenData,
  studyId: string
): boolean {
  return tokenData.studyId === studyId
}
