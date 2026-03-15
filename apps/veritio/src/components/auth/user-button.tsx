/**
 * UserButton Component
 *
 * Displays the current user's avatar with a dropdown menu for account actions.
 * Supports both compact (avatar only) and expanded (avatar + name) modes for sidebar use.
 * Includes optional "What's New" indicator for product updates.
 *
 * Note: Uses useCurrentUser() hook instead of Better Auth's useSession() due to
 * a known bug where useSession() returns null. See:
 * https://github.com/better-auth/better-auth/issues/7008
 */
"use client"

import { useRouter } from "next/navigation"
import { signOut } from "@veritio/auth/client"
import { clearAuthToken } from "@veritio/auth/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, LogOut, ChevronUp, Shield } from "lucide-react"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useAdminCheck } from "@/hooks/use-admin-check"
import { useUserPreferences } from "@/hooks"

interface UserButtonProps {
  afterSignOutUrl?: string
  /** Show expanded view with name and chevron (for sidebar) */
  expanded?: boolean
  /** User name to display in expanded mode */
  userName?: string
  /** Show "What's New" indicator dot */
  hasUnreadUpdates?: boolean
}

/**
 * User button with dropdown menu for account actions.
 *
 * @param afterSignOutUrl - URL to redirect to after sign out (default: "/sign-in")
 * @param expanded - Show expanded view with name and chevron for sidebar
 * @param userName - Custom user name to display in expanded mode
 * @param hasUnreadUpdates - Show "What's New" indicator dot on avatar
 */
export function UserButton({
  afterSignOutUrl = "/sign-in",
  expanded = false,
  userName,
  hasUnreadUpdates = false,
}: UserButtonProps) {
  const router = useRouter()
  // Use our custom hook that fetches from Motia API instead of Better Auth's useSession
  const { user, isLoading, error } = useCurrentUser()
  const { isAdmin } = useAdminCheck()
  const { preferences } = useUserPreferences()

  // Prefer uploaded avatar from user preferences, fall back to OAuth provider image
  const avatarSrc = preferences?.profile?.avatarUrl || user?.image || undefined

  const handleSignOut = async () => {
    try {
      await signOut()
      clearAuthToken()
      router.push(afterSignOutUrl)
    } catch (_error) {
      // Still redirect even if sign out fails
      router.push(afterSignOutUrl)
    }
  }

  // Show loading skeleton while fetching user data
  if (isLoading) {
    return expanded ? (
      <div className="flex w-full items-center gap-3 rounded-md bg-muted/50 animate-pulse h-10" />
    ) : (
      <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
    )
  }

  // No user data available
  if (!user) {
    // If the fetch errored (e.g. backend 503), still show a minimal sign-out button
    // so users aren't stuck with no way to log out during backend outages
    if (error) {
      return (
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent/50 transition-colors"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
          {expanded && <span>Sign out</span>}
        </button>
      )
    }
    // No error = genuinely not authenticated
    return null
  }
  const initials = getInitials(user.name || user.email)
  const displayName = userName || user.name || user.email?.split("@")[0] || "User"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {expanded ? (
          <button
            className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-sidebar-accent/50 transition-colors focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
            aria-label="User menu - click to sign out or access settings"
          >
            <div className="relative shrink-0">
              <Avatar className="h-8 w-8">
                {avatarSrc && <AvatarImage src={avatarSrc} alt={user.name || "User"} />}
                <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {/* What's New indicator */}
              {hasUnreadUpdates && (
                <span className="absolute -top-0.5 -right-0.5 size-2.5 bg-blue-500 rounded-full ring-2 ring-sidebar" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {displayName}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {user.email}
              </p>
            </div>
            <ChevronUp className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
          </button>
        ) : (
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 transition-colors focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
            aria-label="User menu"
          >
            <Avatar className="h-9 w-9">
              {avatarSrc && <AvatarImage src={avatarSrc} alt={user.name || "User"} />}
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            {/* What's New indicator */}
            {hasUnreadUpdates && (
              <span className="absolute -top-0.5 -right-0.5 size-2.5 bg-blue-500 rounded-full ring-2 ring-sidebar" />
            )}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-background border border-border shadow-lg"
      >
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-foreground">
            {user.name || "User"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user.email}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/settings")}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem
            onClick={() => router.push("/admin")}
            className="cursor-pointer"
          >
            <Shield className="mr-2 h-4 w-4" />
            Admin Panel
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Get initials from a name or email
 */
function getInitials(nameOrEmail: string): string {
  if (!nameOrEmail) return "U"

  // If it's an email, use first letter
  if (nameOrEmail.includes("@")) {
    return nameOrEmail[0].toUpperCase()
  }

  // Get initials from name
  const parts = nameOrEmail.trim().split(" ")
  if (parts.length === 1) {
    return parts[0][0].toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
