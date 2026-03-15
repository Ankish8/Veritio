'use server'

import crypto from 'crypto'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'

const COOKIE_SECRET = process.env.BETTER_AUTH_SECRET || 'public-results-fallback-secret'

function signToken(token: string): string {
  return crypto.createHmac('sha256', COOKIE_SECRET).update(token).digest('hex')
}

/** Verify an access cookie for a given token (called from server component) */
export async function verifyAccessCookie(token: string, cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false
  return cookieValue === signToken(token)
}

/** Server action: validate password, set httpOnly cookie on success */
export async function verifyPublicResultsPassword(
  token: string,
  password: string
): Promise<{ valid: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  const { data: study } = await (supabase as any)
    .from('studies')
    .select('sharing_settings')
    .eq('public_results_token', token)
    .single()

  if (!study) return { valid: false, error: 'not_found' }

  const publicResults = (study.sharing_settings as any)?.publicResults
  if (!publicResults) return { valid: false, error: 'not_found' }

  let passwordValid = false
  if (publicResults.passwordHash) {
    const bcryptjs = await import('bcryptjs')
    passwordValid = await bcryptjs.default.compare(password, publicResults.passwordHash)
  } else if (publicResults.password) {
    passwordValid = password === publicResults.password
  }

  if (!passwordValid) return { valid: false, error: 'invalid_password' }

  // Set httpOnly cookie scoped to this token's path
  const cookieStore = await cookies()
  cookieStore.set(`pr_access_${token}`, signToken(token), {
    httpOnly: true,
    sameSite: 'lax',
    path: `/results/public/${token}`,
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return { valid: true }
}
