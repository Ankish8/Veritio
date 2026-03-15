'use client'


import { useState, useCallback, type FormEvent } from 'react'
import { Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useInvitations } from '@/hooks/use-invitations'
import type { OrganizationRole } from '@/lib/supabase/collaboration-types'

interface InviteMembersDialogProps {
  organizationId: string
  organizationName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvited?: () => void
}

const roleOptions: { value: Exclude<OrganizationRole, 'owner'>; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Can manage team members and all projects' },
  { value: 'manager', label: 'Manager', description: 'Can create and launch studies and projects' },
  { value: 'editor', label: 'Editor', description: 'Can edit existing study content' },
  { value: 'viewer', label: 'Viewer', description: 'Can view projects and results (free)' },
]

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function InviteMembersDialog({
  organizationId,
  organizationName,
  open,
  onOpenChange,
  onInvited,
}: InviteMembersDialogProps) {
  const { createInvitation } = useInvitations(organizationId)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [linkRole, setLinkRole] = useState<Exclude<OrganizationRole, 'owner'>>('viewer')

  const [email, setEmail] = useState('')
  const [emailRole, setEmailRole] = useState<Exclude<OrganizationRole, 'owner'>>('viewer')
  const [emailError, setEmailError] = useState<string | null>(null)

  const handleEmailInvite = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!email) {
        setEmailError('Email is required')
        return
      }
      if (!isValidEmail(email)) {
        setEmailError('Please enter a valid email address')
        return
      }

      setIsSubmitting(true)
      setError(null)
      setSuccess(null)
      setEmailError(null)

      try {
        await createInvitation({
          organization_id: organizationId,
          email: email,
          role: emailRole,
        })
        setSuccess(`Invitation sent to ${email}`)
        setEmail('')
        onInvited?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send invitation')
      } finally {
        setIsSubmitting(false)
      }
    },
    [createInvitation, organizationId, email, emailRole, onInvited]
  )

  const handleGenerateLink = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createInvitation({
        organization_id: organizationId,
        role: linkRole,
        is_link_invitation: true,
        expires_in_days: 7,
      })
      if (result.invite_url) {
        setInviteLink(result.invite_url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link')
    } finally {
      setIsSubmitting(false)
    }
  }, [createInvitation, organizationId, linkRole])

  const copyLink = useCallback(async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }, [inviteLink])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite to {organizationName}</DialogTitle>
          <DialogDescription>
            Add team members by email or share an invite link.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="email" className="pt-2">
          <TabsList variant="underline">
            <TabsTrigger variant="underline" value="email">
              Email
            </TabsTrigger>
            <TabsTrigger variant="underline" value="link">
              Invite Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 pt-4">
            <form onSubmit={handleEmailInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={emailRole}
                  onValueChange={(value) => setEmailRole(value as Exclude<OrganizationRole, 'owner'>)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-fit min-w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col items-start">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 text-sm text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 rounded-md">
                  {success}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send Invitation'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="link" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="link-role">Role for Invited Members</Label>
              <Select
                value={linkRole}
                onValueChange={(value) => setLinkRole(value as Exclude<OrganizationRole, 'owner'>)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-fit min-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col items-start">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {inviteLink ? (
              <div className="space-y-2">
                <Label>Invitation Link</Label>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="font-mono text-sm" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyLink}
                    className="shrink-0"
                  >
                    {linkCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This link expires in 7 days. Anyone with this link can join as {linkRole}.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Generate a shareable link that anyone can use to join your team.
                  The link will expire in 7 days.
                </p>
                <Button
                  onClick={handleGenerateLink}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? 'Generating...' : 'Generate Invite Link'}
                </Button>
              </div>
            )}

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
