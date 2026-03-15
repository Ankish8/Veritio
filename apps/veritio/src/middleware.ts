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
  const { pathname } = request.nextUrl

  // Only protect admin routes
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

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/session?token=eq.${encodeURIComponent(sessionToken)}&select=userId,expiresAt`,
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
  matcher: ['/admin/:path*'],
}
