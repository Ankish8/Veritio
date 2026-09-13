import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  createCspNonce,
  createLandingContentSecurityPolicy,
} from '../../../packages/config/security-headers/index.mjs'

export function middleware(request: NextRequest) {
  const nonce = createCspNonce()
  const policy = createLandingContentSecurityPolicy({ nonce })
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', policy)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', policy)
  return response
}

export const config = {
  matcher: [
    '/((?!api(?:/|$)|_next(?:/|$)|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
