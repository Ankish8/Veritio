'use client'

import { useState } from 'react'
import { UserPlus, ChevronDown, Check, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { MemberList, InviteMembersDialog } from '@/components/collaboration'
import { cn } from '@/lib/utils'
import type { OrganizationRole } from '@/lib/supabase/collaboration-types'

interface MembersTabProps {
  organizationId: string
  organizationName: string
  currentUserId: string
  currentUserRole: OrganizationRole
  canManage: boolean
}

const ROLES: OrganizationRole[] = ['viewer', 'editor', 'manager', 'admin', 'owner']


const PERMISSIONS: { label: string; minRole: OrganizationRole }[] = [
  { label: 'View projects & results', minRole: 'viewer' },
  { label: 'Edit study content', minRole: 'editor' },
  { label: 'Comment on studies', minRole: 'editor' },
  { label: 'Create projects & studies', minRole: 'manager' },
  { label: 'Launch & close studies', minRole: 'manager' },
  { label: 'Manage team members', minRole: 'admin' },
  { label: 'Delete organization', minRole: 'owner' },
]

const ROLE_LEVELS: Record<OrganizationRole, number> = {
  viewer: 1, editor: 2, manager: 3, admin: 4, owner: 5,
}

function hasPermission(role: OrganizationRole, minRole: OrganizationRole) {
  return ROLE_LEVELS[role] >= ROLE_LEVELS[minRole]
}

function RolesTable() {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="py-2.5 px-4 text-left font-medium text-muted-foreground w-[45%]">Permission</th>
            {ROLES.map((role) => (
              <th key={role} className="py-2.5 px-3 text-center font-medium text-muted-foreground capitalize text-xs">
                {role}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSIONS.map((perm, i) => (
            <tr key={perm.label} className={cn('border-b last:border-0', i % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
              <td className="py-2.5 px-4 text-muted-foreground">{perm.label}</td>
              {ROLES.map((role) => (
                <td key={role} className="py-2.5 px-3 text-center">
                  {hasPermission(role, perm.minRole) ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  ) : (
                    <Minus className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MembersTab({
  organizationId,
  organizationName,
  currentUserId,
  currentUserRole,
  canManage,
}: MembersTabProps) {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [rolesOpen, setRolesOpen] = useState(false)

  return (
    <div className="max-w-3xl space-y-6">
      {/* Section header with invite action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Team Members</h2>
          <p className="text-sm text-muted-foreground">
            People with access to this organization and its projects.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Members
          </Button>
        )}
      </div>

      <Separator />

      {/* Member list */}
      <MemberList
        organizationId={organizationId}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />

      <Separator />

      {/* Roles & permissions collapsible */}
      <Collapsible open={rolesOpen} onOpenChange={setRolesOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-full">
            <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', rolesOpen && 'rotate-180')} />
            <span>What can each role do?</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <RolesTable />
        </CollapsibleContent>
      </Collapsible>

      {/* Invite dialog */}
      <InviteMembersDialog
        organizationId={organizationId}
        organizationName={organizationName}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </div>
  )
}
