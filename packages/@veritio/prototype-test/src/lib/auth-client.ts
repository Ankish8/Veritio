"use client"

import { createAuthClient } from "better-auth/react"
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4001",

  fetchOptions: {
    credentials: "include",
  },
})

// Export individual functions and hooks for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  changePassword,
} = authClient
let sessionFetchPromise: Promise<string | null> | null = null
let sessionFetchTimestamp = 0
const SESSION_CACHE_TTL = 5000 // 5 seconds
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

  // Don't redirect if we're already on auth pages
  const currentPath = window.location.pathname
  if (currentPath.startsWith("/sign-in") || currentPath.startsWith("/sign-up")) {
    return
  }

  isRedirecting = true

  // Clear the stale auth token
  clearAuthToken()

  // Redirect to sign-in with current path as redirect target
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
