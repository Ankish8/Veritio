import 'server-only'

import { toNextJsHandler } from "better-auth/next-js"

// Lazy load auth to avoid Turbopack bundling issues with pg
async function getAuth() {
  const { auth } = await import("@veritio/auth/auth-instance")
  return auth
}

function errorResponse(scope: string, request: Request, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  const stack = error instanceof Error ? error.stack : undefined
  const url = new URL(request.url)
  // Log path + stack so production failures are debuggable.
  console.error(`[${scope}]`, url.pathname, message, stack)
  // Use `message` (not `error`) so better-fetch surfaces it to the client as
  // result.error.message instead of falling through to the generic UI fallback.
  return Response.json(
    { message: 'Authentication error' },
    { status: 500 },
  )
}

export async function GET(request: Request) {
  try {
    const auth = await getAuth()
    const handler = toNextJsHandler(auth)
    return handler.GET(request)
  } catch (error: unknown) {
    return errorResponse('AUTH GET ERROR', request, error)
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuth()
    const handler = toNextJsHandler(auth)
    return handler.POST(request)
  } catch (error: unknown) {
    return errorResponse('AUTH POST ERROR', request, error)
  }
}
