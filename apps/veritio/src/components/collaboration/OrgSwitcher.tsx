'use client'


import { useState, useCallback, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Check, ChevronDown, Building2, User2, Plus, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCurrentOrganization, type OrganizationWithRole } from '@/hooks/use-organizations'
import { cn } from '@/lib/utils'
import { CreateOrgDialog } from './CreateOrgDialog'

interface OrgSwitcherProps {
  className?: string
  onOrgChange?: (org: OrganizationWithRole) => void
  showCreateOption?: boolean
  showSettingsLink?: boolean
}

const roleColors: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  manager: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  viewer: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300',
}

const roleNames: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  editor: 'Editor',
  viewer: 'Viewer',
}

/**
 * Returns a safe top-level redirect path when switching workspaces.
 * Deep pages (with dynamic IDs in the URL) become stale on org switch
 * because the IDs belong to the old workspace. List/root pages are fine
 * since SWR re-keys on org ID.
 *
 * Returns null if the current page is already safe (no redirect needed).
 */
function getSafeRedirect(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean)

  // /projects/[id]/... → /projects
  if (segments[0] === 'projects' && segments.length > 1) {
    return '/projects'
  }

  // /panel/{section}/[id]/... → /panel/{section}
  if (segments[0] === 'panel' && segments.length > 2) {
    return `/panel/${segments[1]}`
  }

  // /settings/team/[id]/... → /settings
  if (segments[0] === 'settings' && segments[1] === 'team' && segments.length > 2) {
    return '/settings'
  }

  return null
}

export function OrgSwitcher({
  className,
  onOrgChange,
  showCreateOption = true,
  showSettingsLink = true,
}: OrgSwitcherProps) {
  const { currentOrg, organizations, setCurrentOrg, isLoading, isHydrated } = useCurrentOrganization()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true) // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  const handleSelect = useCallback(
    (org: OrganizationWithRole) => {
      if (currentOrg?.id === org.id) return

      setCurrentOrg(org)
      onOrgChange?.(org)

      const safeRedirect = getSafeRedirect(pathname)
      if (safeRedirect) {
        router.push(safeRedirect)
      }
    },
    [setCurrentOrg, onOrgChange, currentOrg?.id, pathname, router]
  )

  const personalWorkspace = organizations.find((o) => o.is_personal)
  const teamOrganizations = organizations.filter((o) => !o.is_personal)

  useEffect(() => {
    if (!currentOrg && personalWorkspace && !isLoading && isHydrated) {
      setCurrentOrg(personalWorkspace)
    }
  }, [currentOrg, personalWorkspace, isLoading, isHydrated, setCurrentOrg])

  const displayName = currentOrg?.is_personal ? 'Personal' : currentOrg?.name || 'Select workspace'

  const triggerButton = (
    <button
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 h-10 text-sm text-sidebar-foreground hover:bg-sidebar-primary/10 hover:text-sidebar-accent-foreground transition-colors duration-200 outline-hidden',
        className
      )}
    >
      {currentOrg?.is_personal ? (
        <User2 className="h-4 w-4 shrink-0" />
      ) : (
        <Building2 className="h-4 w-4 shrink-0" />
      )}
      <span className="truncate">{displayName}</span>
      <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-sidebar-foreground/50" />
    </button>
  )

  if (!isMounted) {
    return triggerButton
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {triggerButton}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[240px]">
          {personalWorkspace && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Personal
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => handleSelect(personalWorkspace)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <User2 className="h-4 w-4" />
                  <span>Personal Workspace</span>
                </div>
                {currentOrg?.id === personalWorkspace.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            </>
          )}

          {teamOrganizations.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Teams
              </DropdownMenuLabel>
              {teamOrganizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleSelect(org)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="truncate max-w-[120px]">{org.name}</span>
                    <span
                      className={cn(
                        'text-[12px] px-1.5 py-0.5 rounded-full font-medium',
                        roleColors[org.user_role]
                      )}
                    >
                      {roleNames[org.user_role]}
                    </span>
                  </div>
                  {currentOrg?.id === org.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </>
          )}

          {(showCreateOption || showSettingsLink) && (
            <>
              {(personalWorkspace || teamOrganizations.length > 0) && (
                <DropdownMenuSeparator />
              )}
              {showCreateOption && (
                <DropdownMenuItem
                  onClick={() => setCreateDialogOpen(true)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Team</span>
                </DropdownMenuItem>
              )}
              {showSettingsLink && currentOrg && !currentOrg.is_personal && (
                <DropdownMenuItem
                  onClick={() => {
                    window.location.href = `/settings/team/${currentOrg.id}`
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  <span>Team Settings</span>
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrgDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(org) => {
          setCreateDialogOpen(false)
          handleSelect({
            ...org,
            is_personal: false,
            user_role: 'owner',
          } as OrganizationWithRole)
        }}
      />
    </>
  )
}
