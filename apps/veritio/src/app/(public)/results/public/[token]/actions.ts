'use server'

import crypto from 'crypto'
import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { consumeDistributedRateLimits } from '@/middlewares/rate-limit'

const publicResultsTokenSchema = z.string().min(16).max(128).regex(/^[A-Za-z0-9_-]+$/)
const publicResultsPasswordSchema = z.string().min(1).max(256)
const GENERIC_FAILURE = { valid: false, error: 'invalid_credentials' } as const
const DUMMY_BCRYPT_HASH = '$2b$10$C6UzMDM.H6dfI/f/IKcEe.yr2Rntv6wqfTnj7eYl5F0dYv5X5J5L2'

function getCookieSecret(): string {
  const secret = process.env.PUBLIC_RESULTS_COOKIE_SECRET || process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error('PUBLIC_RESULTS_COOKIE_SECRET or BETTER_AUTH_SECRET must be configured')
  return secret
}

function signToken(token: string): string {
  return crypto.createHmac('sha256', getCookieSecret()).update(token).digest('hex')
}

function constantTimeEqual(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(received)
  const paddedReceived = Buffer.alloc(expectedBuffer.length)
  receivedBuffer.copy(paddedReceived, 0, 0, expectedBuffer.length)

  return crypto.timingSafeEqual(expectedBuffer, paddedReceived) && receivedBuffer.length === expectedBuffer.length
}

function getRequestIp(requestHeaders: Headers): string {
  return (
    requestHeaders.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    requestHeaders.get('cf-connecting-ip') ||
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    requestHeaders.get('x-real-ip') ||
    'unknown'
  )
}

/** Verify an access cookie for a given token (called from server component) */
export async function verifyAccessCookie(token: string, cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue || !publicResultsTokenSchema.safeParse(token).success) return false
  return constantTimeEqual(signToken(token), cookieValue)
}

/** Server action: validate password, set httpOnly cookie on success */
export async function verifyPublicResultsPassword(
  token: string,
  password: string
): Promise<{ valid: boolean; error?: 'invalid_credentials' | 'rate_limited'; retryAfterSeconds?: number }> {
  if (!publicResultsTokenSchema.safeParse(token).success || !publicResultsPasswordSchema.safeParse(password).success) {
    return GENERIC_FAILURE
  }

  const requestHeaders = await headers()
  const rateLimit = await consumeDistributedRateLimits([
    { tier: 'public-results-password-ip', identifier: `public-results-password:ip:${getRequestIp(requestHeaders)}` },
    { tier: 'public-results-password-token', identifier: `public-results-password:token:${token}` },
  ])
  if (!rateLimit.allowed) {
    return { valid: false, error: 'rate_limited', retryAfterSeconds: rateLimit.retryAfterSeconds }
  }

  const supabase = createServiceRoleClient()

  const { data: study } = await (supabase as any)
    .from('studies')
    .select('sharing_settings')
    .eq('public_results_token', token)
    .single()

  const publicResults = (study?.sharing_settings as any)?.publicResults
  const passwordHash = publicResults?.passwordHash || publicResults?.password || DUMMY_BCRYPT_HASH
  const bcryptjs = await import('bcryptjs')
  const passwordValid = await bcryptjs.default.compare(password, passwordHash)

  if (!study || !publicResults || !passwordValid) return GENERIC_FAILURE

  // Set httpOnly cookie scoped to this token's path
  const cookieStore = await cookies()
  cookieStore.set(`pr_access_${token}`, signToken(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/results/public/${token}`,
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return { valid: true }
}
