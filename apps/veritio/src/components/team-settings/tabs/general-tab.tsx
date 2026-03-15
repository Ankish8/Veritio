'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, AlertTriangle, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useOrganizations } from '@/hooks/use-organizations'
import { toast } from '@/components/ui/sonner'
import type { Organization } from '@/lib/supabase/collaboration-types'

interface GeneralTabProps {
  organizationId: string
  organization: Organization
  canManage: boolean
  canDelete: boolean
}

export function GeneralTab({
  organizationId,
  organization,
  canManage,
  canDelete,
}: GeneralTabProps) {
  const router = useRouter()
  const { updateOrganization, deleteOrganization } = useOrganizations()

  const [orgName, setOrgName] = useState(organization.name)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sync form state when organization changes
  useEffect(() => {
    setOrgName(organization.name)
  }, [organization.name])

  const handleSaveSettings = async () => {
    if (!orgName.trim() || isSaving) return
    setIsSaving(true)
    try {
      await updateOrganization(organizationId, { name: orgName.trim() })
      toast.success('Organization settings updated')
    } catch {
      toast.error('Failed to update settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteOrganization = async () => {
    if (!canDelete || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteOrganization(organizationId)
      toast.success('Organization deleted')
      router.push('/')
    } catch {
      toast.error('Failed to delete organization')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Organization Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Information
          </CardTitle>
          <CardDescription>
            Manage your organization&apos;s basic information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <div className="flex gap-2">
              <Input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Organization name"
                disabled={!canManage || isSaving}
                className="max-w-md"
              />
              {canManage && (
                <Button
                  onClick={handleSaveSettings}
                  disabled={!orgName.trim() || isSaving || orgName === organization.name}
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Organization ID</Label>
            <Input value={organizationId} disabled className="font-mono text-sm max-w-md" />
            <p className="text-xs text-muted-foreground">
              Used for API integrations and support requests.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone - only for owners */}
      {canDelete && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect this organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-600">Delete Organization</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this organization and all associated data
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting}>
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Delete Organization
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Organization?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete <strong>{organization.name}</strong> and all
                      associated projects, studies, and data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteOrganization}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Organization
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
