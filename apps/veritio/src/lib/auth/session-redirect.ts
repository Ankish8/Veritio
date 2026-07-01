'use client'

let isRedirectingToSignIn = false

export function redirectToSignInAfterSessionExpired(): void {
  if (typeof window === 'undefined') return
  if (isRedirectingToSignIn) return

  const currentPath = window.location.pathname
  if (currentPath.startsWith('/sign-in') || currentPath.startsWith('/sign-up')) {
    return
  }

  isRedirectingToSignIn = true

  void import('@veritio/auth/client')
    .then(({ clearAuthToken }) => clearAuthToken())
    .catch(() => {})

  const searchParams = new URLSearchParams()
  if (currentPath !== '/') {
    searchParams.set('redirect', currentPath)
  }

  const signInUrl = `/sign-in${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  window.location.href = signInUrl
}
