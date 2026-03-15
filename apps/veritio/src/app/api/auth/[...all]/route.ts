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
    console.error('[AUTH GET ERROR]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const stack = error instanceof Error ? error.stack : undefined
    return Response.json({ error: message, stack }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuth()
    const handler = toNextJsHandler(auth)
    return handler.POST(request)
  } catch (error: unknown) {
    console.error('[AUTH POST ERROR]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const stack = error instanceof Error ? error.stack : undefined
    return Response.json({ error: message, stack }, { status: 500 })
  }
}
