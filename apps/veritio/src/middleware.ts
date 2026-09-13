import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  createAppContentSecurityPolicy,
  createCspNonce,
} from '../../../packages/config/security-headers/index.mjs'

import { resolveLandingOrigin } from '@/lib/landing-origin'
import {
  MARKETING_ATTRIBUTION_COOKIE,
  readMarketingAttribution,
  serializeMarketingAttribution,
} from '@/lib/marketing-attribution'

function preserveMarketingAttribution(request: NextRequest, response: NextResponse) {
  if (request.cookies.has(MARKETING_ATTRIBUTION_COOKIE)) return response

  const attribution = readMarketingAttribution(request.nextUrl.searchParams)
  if (!attribution) return response

  response.cookies.set({
    name: MARKETING_ATTRIBUTION_COOKIE,
    value: serializeMarketingAttribution(attribution),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}

function createRequestSecurityContext(request: NextRequest) {
  const nonce = createCspNonce()
  const policy = createAppContentSecurityPolicy({
    landingOrigin: resolveLandingOrigin(),
    livePreviewOrigin: process.env.NEXT_PUBLIC_LIVE_PREVIEW_ORIGIN,
    development: process.env.NODE_ENV !== 'production',
    nonce,
  })
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  // Next reads the request CSP header and applies this nonce to framework and
  // next/script tags. The response header makes the browser enforce the same policy.
  requestHeaders.set('Content-Security-Policy', policy)

  return {
    policy,
    next: () => NextResponse.next({ request: { headers: requestHeaders } }),
    rewrite: (url: URL) => NextResponse.rewrite(url, { request: { headers: requestHeaders } }),
  }
}

function secureResponse(response: NextResponse, policy: string) {
  response.headers.set('Content-Security-Policy', policy)
  return response
}

/**
 * Server-side middleware to protect admin routes.
 * Verifies Better Auth session cookie and checks superadmin status
 * before allowing access to /admin paths.
 *
 * This runs on the Edge runtime, so we query Supabase REST API directly
 * instead of importing heavy server-side auth modules.
 */
export async function middleware(request: NextRequest) {
  // NOTE: www→apex redirect lives in next.config.ts redirects() (routing
  // layer, host-conditional) so this function no longer runs on every request.
  const { pathname } = request.nextUrl
  const security = createRequestSecurityContext(request)

  // Root path is shared: the marketing landing for logged-out visitors, the app
  // dashboard (which lives at '/') for logged-in users. Cookie-presence is a fast
  // heuristic — the dashboard itself still enforces real auth server-side.
  if (pathname === '/') {
    const hasSession =
      request.cookies.get('better-auth.session_token')?.value ??
      request.cookies.get('__Secure-better-auth.session_token')?.value
    if (!hasSession) {
      return preserveMarketingAttribution(
        request,
        secureResponse(
          security.rewrite(new URL('/', resolveLandingOrigin())),
          security.policy,
        ),
      )
    }
    return preserveMarketingAttribution(
      request,
      secureResponse(security.next(), security.policy),
    )
  }

  // Only protect admin routes (matcher already scopes us to '/' and '/admin/*')
  if (!pathname.startsWith('/admin')) {
    return preserveMarketingAttribution(
      request,
      secureResponse(security.next(), security.policy),
    )
  }

  const superadminUserId = process.env.SUPERADMIN_USER_ID
  if (!superadminUserId) {
    // If SUPERADMIN_USER_ID is not configured, deny all admin access
    return secureResponse(
      NextResponse.redirect(new URL('/', request.url)),
      security.policy,
    )
  }

  // Better Auth uses "better-auth.session_token" cookie (or "__Secure-better-auth.session_token" with secure cookies)
  const sessionToken =
    request.cookies.get('better-auth.session_token')?.value ??
    request.cookies.get('__Secure-better-auth.session_token')?.value

  if (!sessionToken) {
    return secureResponse(
      NextResponse.redirect(new URL('/', request.url)),
      security.policy,
    )
  }

  // Verify session by querying the session table via Supabase REST API
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return secureResponse(
      NextResponse.redirect(new URL('/', request.url)),
      security.policy,
    )
  }

  // Better Auth cookie format is "token.signature" — only the token part is stored in the DB
  const tokenPart = sessionToken.includes('.') ? sessionToken.split('.')[0] : sessionToken

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/session?token=eq.${encodeURIComponent(tokenPart)}&select=userId,expiresAt`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Accept': 'application/vnd.pgrst.object+json',
        },
      }
    )

    if (!response.ok) {
      return secureResponse(
        NextResponse.redirect(new URL('/', request.url)),
        security.policy,
      )
    }

    const session = await response.json()

    if (!session?.userId) {
      return secureResponse(
        NextResponse.redirect(new URL('/', request.url)),
        security.policy,
      )
    }

    // Check if session is expired
    const expiresAt = new Date(session.expiresAt).getTime()
    if (expiresAt < Date.now()) {
      return secureResponse(
        NextResponse.redirect(new URL('/', request.url)),
        security.policy,
      )
    }

    // Check if user is superadmin
    if (session.userId !== superadminUserId) {
      return secureResponse(
        NextResponse.redirect(new URL('/', request.url)),
        security.policy,
      )
    }

    return secureResponse(security.next(), security.policy)
  } catch {
    return secureResponse(
      NextResponse.redirect(new URL('/', request.url)),
      security.policy,
    )
  }
}

export const config = {
  // Capture first-touch campaign parameters on marketing and auth pages while
  // keeping API, participant, asset, and render traffic out of Edge middleware.
  matcher: [
    '/((?!api(?:/|$)|s(?:/|$)|render(?:/|$)|_next(?:/|$)|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
