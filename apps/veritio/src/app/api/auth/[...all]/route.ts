import 'server-only'

import { toNextJsHandler } from "better-auth/next-js"

// Lazy load auth to avoid Turbopack bundling issues with pg
async function getAuth() {
  const { auth } = await import("@veritio/auth/auth-instance")
  return auth
}

export async function GET(request: Request) {
  try {
    const auth = await getAuth()
    const handler = toNextJsHandler(auth)
    return handler.GET(request)
  } catch (error: unknown) {
    console.error('[AUTH GET ERROR]', error instanceof Error ? error.message : 'Unknown error')
    return Response.json({ error: 'Authentication error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  console.log('[AUTH POST]', url.pathname)
  try {
    const auth = await getAuth()
    const handler = toNextJsHandler(auth)
    const response = await handler.POST(request)
    console.log('[AUTH POST DONE]', url.pathname, response.status)
    return response
  } catch (error: unknown) {
    console.error('[AUTH POST ERROR]', error instanceof Error ? error.message : 'Unknown error')
    return Response.json({ error: 'Authentication error' }, { status: 500 })
  }
}
