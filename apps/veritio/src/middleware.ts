import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

  // Root path is shared: the marketing landing for logged-out visitors, the app
  // dashboard (which lives at '/') for logged-in users. Cookie-presence is a fast
  // heuristic — the dashboard itself still enforces real auth server-side.
  if (pathname === '/') {
    const hasSession =
      request.cookies.get('better-auth.session_token')?.value ??
      request.cookies.get('__Secure-better-auth.session_token')?.value
    if (!hasSession) {
      return NextResponse.rewrite(new URL('/', 'https://landing-mu-neon.vercel.app'))
    }
    return NextResponse.next()
  }

  // Only protect admin routes (matcher already scopes us to '/' and '/admin/*')
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const superadminUserId = process.env.SUPERADMIN_USER_ID
  if (!superadminUserId) {
    // If SUPERADMIN_USER_ID is not configured, deny all admin access
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Better Auth uses "better-auth.session_token" cookie (or "__Secure-better-auth.session_token" with secure cookies)
  const sessionToken =
    request.cookies.get('better-auth.session_token')?.value ??
    request.cookies.get('__Secure-better-auth.session_token')?.value

  if (!sessionToken) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Verify session by querying the session table via Supabase REST API
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.redirect(new URL('/', request.url))
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
      return NextResponse.redirect(new URL('/', request.url))
    }

    const session = await response.json()

    if (!session?.userId) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Check if session is expired
    const expiresAt = new Date(session.expiresAt).getTime()
    if (expiresAt < Date.now()) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Check if user is superadmin
    if (session.userId !== superadminUserId) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/', request.url))
  }
}

export const config = {
  // Only the two routes that need per-request logic: the shared root
  // (landing-vs-dashboard rewrite) and the admin gate. Everything else —
  // including every /api/* proxy call and participant /s/* page — skips the
  // edge-middleware invocation entirely.
  matcher: ['/', '/admin/:path*'],
}
