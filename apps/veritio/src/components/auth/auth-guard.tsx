"use client"

import { useEffect } from "react"
import { redirectToSignInAfterSessionExpired } from "@/lib/auth/session-redirect"
import { useCurrentUser } from "@/hooks/use-current-user"
import { DashboardSkeleton } from "@/components/dashboard/skeletons"

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Client-side auth guard that redirects to sign-in when unauthenticated.
 * Uses useCurrentUser() (API-based) instead of Better Auth's useSession()
 * which has a known bug returning null (Issue #7008).
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading } = useCurrentUser()

  const loadingFallback = fallback ?? <DashboardSkeleton />

  // Redirect to sign-in when auth check completes with no user
  useEffect(() => {
    if (!isLoading && !user) {
      redirectToSignInAfterSessionExpired()
    }
  }, [isLoading, user])

  if (isLoading) {
    return loadingFallback
  }

  if (user) {
    return <>{children}</>
  }

  return loadingFallback
}
