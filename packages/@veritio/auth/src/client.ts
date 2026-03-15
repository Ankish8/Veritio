"use client"

import { createAuthClient } from "better-auth/react"

const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4001"

export const authClient = createAuthClient({
  baseURL,

  fetchOptions: {
    credentials: "include",
  },
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  changePassword,
  linkSocial,
  unlinkAccount,
} = authClient

export const listAccounts = authClient.listAccounts

let sessionFetchPromise: Promise<string | null> | null = null
let sessionFetchTimestamp = 0
const SESSION_CACHE_TTL = 30000

export async function getAuthToken(): Promise<string | null> {
  const now = Date.now()
  if (sessionFetchPromise && now - sessionFetchTimestamp < SESSION_CACHE_TTL) {
    return sessionFetchPromise
  }

  sessionFetchTimestamp = now
  sessionFetchPromise = (async () => {
    try {
      const session = await authClient.getSession()
      const token = session.data?.session?.token || null

      // Invalidate cache on null so next call retries
      if (!token) {
        sessionFetchPromise = null
        sessionFetchTimestamp = 0
      }

      return token
    } catch {
      sessionFetchPromise = null
      sessionFetchTimestamp = 0
      return null
    }
  })()

  return sessionFetchPromise
}

export function clearAuthToken(): void {
  sessionFetchPromise = null
  sessionFetchTimestamp = 0
}

let isRedirecting = false

export function handleSessionExpired(): void {
  if (typeof window === "undefined") return
  if (isRedirecting) return

  const currentPath = window.location.pathname
  if (currentPath.startsWith("/sign-in") || currentPath.startsWith("/sign-up")) {
    return
  }

  isRedirecting = true
  clearAuthToken()

  const searchParams = new URLSearchParams()
  if (currentPath !== "/") {
    searchParams.set("redirect", currentPath)
  }

  const signInUrl = `/sign-in${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
  window.location.href = signInUrl
}

export function resetSessionRedirectGuard(): void {
  isRedirecting = false
}
