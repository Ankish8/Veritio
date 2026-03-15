"use client"

import { createContext, useContext, ReactNode, useMemo } from "react"
import { useSession } from "@veritio/auth/client"

/**
 * User object from Better Auth session
 */
interface User {
  id: string
  email: string
  name: string | null
  image?: string | null
  emailVerified: boolean
}

/**
 * Auth context type - provides user info and loading state
 */
interface AuthContextType {
  user: User | null
  isLoaded: boolean
  isSignedIn: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

/**
 * Auth Provider component - wraps the app to provide auth context
 *
 * Replaces ClerkProvider from @clerk/nextjs
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()

  const value = useMemo<AuthContextType>(() => ({
    user: session?.user ? {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image || null,
      emailVerified: session.user.emailVerified,
    } : null,
    isLoaded: !isPending,
    isSignedIn: !!session?.user,
  }), [session, isPending])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access auth context
 *
 * Replaces useUser() from @clerk/nextjs
 *
 * @example
 * ```tsx
 * const { user, isSignedIn, isLoaded } = useAuthContext()
 * if (!isLoaded) return <Spinner />
 * if (!isSignedIn) return <SignInPrompt />
 * return <div>Hello {user.name}</div>
 * ```
 */
export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider")
  }
  return context
}

/**
 * Hook to get the current user
 * Throws if not authenticated
 *
 * @example
 * ```tsx
 * const user = useCurrentUser()
 * return <div>Hello {user.name}</div>
 * ```
 */
export function useCurrentUser() {
  const { user, isLoaded, isSignedIn } = useAuthContext()
  if (!isLoaded) {
    throw new Error("Auth not loaded yet")
  }
  if (!isSignedIn || !user) {
    throw new Error("User not authenticated")
  }
  return user
}
