'use client'


import { useState, useCallback } from 'react'
import { MoreHorizontal, Trash2, ChevronDown, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useOrganizationMembers, type MemberWithUser } from '@/hooks/use-organizations'
import type { OrganizationRole } from '@/lib/supabase/collaboration-types'


interface MemberListProps {
  organizationId: string
  currentUserId: string
  currentUserRole: OrganizationRole
}


const roleLabels: Record<OrganizationRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  editor: 'Editor',
  viewer: 'Viewer',
}

const roleDescriptions: Record<OrganizationRole, string> = {
  owner: 'Full control including deleting the organization.',
  admin: 'Manage team members and organization settings.',
  manager: 'Create projects & studies, and launch or close them.',
  editor: 'Edit study content — cards, questions, and settings.',
  viewer: 'View projects and results only. Cannot make changes.',
}

const roleLevels: Record<OrganizationRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  editor: 2,
  viewer: 1,
}


function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email.slice(0, 2).toUpperCase()
}

function canEditMember(
  currentUserRole: OrganizationRole,
  targetRole: OrganizationRole
): boolean {
  // Only owners and admins can edit members
  if (roleLevels[currentUserRole] < roleLevels.admin) return false
  // Can only edit members with lower privilege
  return roleLevels[currentUserRole] > roleLevels[targetRole]
}


interface MemberRowProps {
  member: MemberWithUser
  currentUserId: string
  currentUserRole: OrganizationRole
  onRoleChange: (userId: string, role: OrganizationRole) => Promise<void>
  onRemove: (userId: string) => void
}

function MemberRow({
  member,
  currentUserId,
  currentUserRole,
  onRoleChange,
  onRemove,
}: MemberRowProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const isSelf = member.user_id === currentUserId
  const canEdit = !isSelf && canEditMember(currentUserRole, member.role)

  const handleRoleChange = async (newRole: OrganizationRole) => {
    setIsUpdating(true)
    try {
      // API expects user_id, not member record id
      await onRoleChange(member.user_id, newRole)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.user?.image || undefined} />
          <AvatarFallback className="bg-muted">
            {getInitials(member.user?.name, member.user?.email || '')}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {member.user?.name || member.user?.email}
            </span>
            {isSelf && (
              <span className="text-xs text-muted-foreground">(you)</span>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {member.user?.email}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-[130px] justify-between font-normal"
                disabled={isUpdating}
              >
                {roleLabels[member.role]}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              {currentUserRole === 'owner' && (
                <DropdownMenuItem
                  onClick={() => handleRoleChange('admin')}
                  className="flex items-start gap-2"
                >
                  <Check className={`h-4 w-4 mt-0.5 shrink-0 ${member.role === 'admin' ? 'opacity-100' : 'opacity-0'}`} />
                  <div className="flex flex-col gap-0.5">
                    <span>Admin</span>
                    <span className="text-xs text-muted-foreground font-normal">Manage team & settings</span>
                  </div>
                </DropdownMenuItem>
              )}
              {(currentUserRole === 'owner' || currentUserRole === 'admin') && (
                <DropdownMenuItem
                  onClick={() => handleRoleChange('manager')}
                  className="flex items-start gap-2"
                >
                  <Check className={`h-4 w-4 mt-0.5 shrink-0 ${member.role === 'manager' ? 'opacity-100' : 'opacity-0'}`} />
                  <div className="flex flex-col gap-0.5">
                    <span>Manager</span>
                    <span className="text-xs text-muted-foreground font-normal">Create & launch studies</span>
                  </div>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => handleRoleChange('editor')}
                className="flex items-start gap-2"
              >
                <Check className={`h-4 w-4 mt-0.5 shrink-0 ${member.role === 'editor' ? 'opacity-100' : 'opacity-0'}`} />
                <div className="flex flex-col gap-0.5">
                  <span>Editor</span>
                  <span className="text-xs text-muted-foreground font-normal">Edit study content</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleRoleChange('viewer')}
                className="flex items-start gap-2"
              >
                <Check className={`h-4 w-4 mt-0.5 shrink-0 ${member.role === 'viewer' ? 'opacity-100' : 'opacity-0'}`} />
                <div className="flex flex-col gap-0.5">
                  <span>Viewer</span>
                  <span className="text-xs text-muted-foreground font-normal">View results only</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm text-muted-foreground px-3 cursor-default underline decoration-dotted underline-offset-2">
                {roleLabels[member.role]}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[200px] text-center">
              <p className="font-medium">{roleLabels[member.role]}</p>
              <p className="text-xs opacity-80 mt-0.5">{roleDescriptions[member.role]}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onRemove(member.user_id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove from team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}


export function MemberList({
  organizationId,
  currentUserId,
  currentUserRole,
}: MemberListProps) {
  const {
    members,
    owners,
    admins,
    managers,
    editors,
    viewers,
    isLoading,
    error,
    updateMemberRole,
    removeMember,
  } = useOrganizationMembers(organizationId)

  const [removingUserId, setRemovingUserId] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const handleRemove = (userId: string) => {
    setRemovingUserId(userId)
  }

  const confirmRemove = useCallback(async () => {
    if (!removingUserId) return

    setIsRemoving(true)
    try {
      await removeMember(removingUserId)
    } finally {
      setIsRemoving(false)
      setRemovingUserId(null)
    }
  }, [removingUserId, removeMember])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-md">
        Failed to load members: {error.message}
      </div>
    )
  }

  const memberToRemove = members.find((m) => m.user_id === removingUserId)

  return (
    <>
      <div className="space-y-1">
        {[...owners, ...admins, ...managers, ...editors, ...viewers].map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onRoleChange={updateMemberRole}
            onRemove={handleRemove}
          />
        ))}

        {members.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No members yet. Invite people to get started!
          </div>
        )}
      </div>

      <AlertDialog
        open={!!removingUserId}
        onOpenChange={(open) => !open && setRemovingUserId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>{memberToRemove?.user?.name || memberToRemove?.user?.email}</strong>{' '}
              from this team? They will lose access to all projects and studies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
