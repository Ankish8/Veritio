import 'server-only'

import { headers, cookies } from 'next/headers'

// Lazy load auth to avoid Turbopack bundling issues with pg
async function getAuth() {
  const { auth } = await import('./auth')
  return auth
}

export async function getServerSession() {
  const auth = await getAuth()

  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()

    if (allCookies.length === 0) {
      return null
    }

    const cookieHeader = allCookies
      .map(c => `${c.name}=${c.value}`)
      .join('; ')

    const requestHeaders = new Headers()
    requestHeaders.set('cookie', cookieHeader)

    const nextHeaders = await headers()
    const host = nextHeaders.get('host')
    const origin = nextHeaders.get('origin')
    if (host) requestHeaders.set('host', host)
    if (origin) requestHeaders.set('origin', origin)

    return await auth.api.getSession({
      headers: requestHeaders,
    })
  } catch {
    return null
  }
}

export async function getServerUser() {
  const session = await getServerSession()
  return session?.user || null
}

export async function getServerUserId() {
  const session = await getServerSession()
  return session?.user?.id || null
}

export async function requireAuth() {
  const session = await getServerSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function isAuthenticated() {
  const session = await getServerSession()
  return !!session?.user
}
