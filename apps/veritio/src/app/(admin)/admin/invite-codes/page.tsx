'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { Plus, Trash2, Copy, Eye, Ticket } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/shared/admin-page-header'
import { AdminErrorState } from '@/components/admin/shared/admin-error-state'
import { AdminStatCard } from '@/components/admin/shared/admin-stat-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { getAuthFetchInstance } from '@/lib/swr'

interface InviteCode {
  id: string
  code: string
  label: string | null
  created_by: string
  max_uses: number | null
  uses_count: number
  is_active: boolean
  expires_at: string | null
  created_at: string
  updated_at: string
}

interface InviteCodeUsage {
  id: string
  user_id: string
  user_email: string
  signup_method: string
  used_at: string
}

interface InviteCodesResponse {
  codes: InviteCode[]
  total: number
  stats: {
    total: number
    active: number
    totalRedemptions: number
  }
}

function getCodeStatus(code: InviteCode): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (!code.is_active) return { label: 'Inactive', variant: 'secondary' }
  if (code.expires_at && new Date(code.expires_at) < new Date()) return { label: 'Expired', variant: 'destructive' }
  if (code.max_uses !== null && code.uses_count >= code.max_uses) return { label: 'Exhausted', variant: 'destructive' }
  return { label: 'Active', variant: 'default' }
}

export default function AdminInviteCodesPage() {
  const { data, error, isLoading, mutate } = useSWR<InviteCodesResponse>(
    '/api/admin/invite-codes',
    { refreshInterval: 60000 }
  )

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [usagesCodeId, setUsagesCodeId] = useState<string | null>(null)
  const [usages, setUsages] = useState<InviteCodeUsage[]>([])
  const [usagesLoading, setUsagesLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Create form state
  const [formLabel, setFormLabel] = useState('')
  const [formMaxUses, setFormMaxUses] = useState('')
  const [formExpiresAt, setFormExpiresAt] = useState('')
  const [formCount, setFormCount] = useState('1')

  const resetForm = () => {
    setFormLabel('')
    setFormMaxUses('')
    setFormExpiresAt('')
    setFormCount('1')
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: formLabel.trim() || undefined,
          maxUses: formMaxUses ? parseInt(formMaxUses) : null,
          expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
          count: parseInt(formCount) || 1,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate invite codes')

      const result = await response.json()
      const count = result.codes?.length || 1
      toast.success(`${count} invite code${count > 1 ? 's' : ''} generated`)
      setCreateOpen(false)
      resetForm()
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate codes')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (code: InviteCode) => {
    try {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch(`/api/admin/invite-codes/${code.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !code.is_active }),
      })

      if (!response.ok) throw new Error('Failed to update invite code')

      mutate()
      toast.success(`Code ${!code.is_active ? 'activated' : 'deactivated'}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update code')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch(`/api/admin/invite-codes/${deleteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to deactivate invite code')

      toast.success('Invite code deactivated')
      setDeleteId(null)
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to deactivate code')
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Code copied to clipboard')
  }

  const handleViewUsages = async (codeId: string) => {
    setUsagesCodeId(codeId)
    setUsagesLoading(true)
    try {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch(`/api/admin/invite-codes/${codeId}/usages`)
      if (!response.ok) throw new Error('Failed to load usages')
      const result = await response.json()
      setUsages(result.usages || [])
    } catch {
      toast.error('Failed to load usage details')
      setUsages([])
    } finally {
      setUsagesLoading(false)
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <AdminPageHeader title="Invite Codes" />
        <AdminErrorState message={error.message} onRetry={() => mutate()} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Invite Codes"
        description="Generate and manage platform sign-up invite codes"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Generate Codes
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <AdminStatCard
              icon={<Ticket className="h-4 w-4" />}
              label="Total Codes"
              value={data?.stats.total ?? 0}
            />
            <AdminStatCard
              icon={<Ticket className="h-4 w-4" />}
              label="Active Codes"
              value={data?.stats.active ?? 0}
            />
            <AdminStatCard
              icon={<Ticket className="h-4 w-4" />}
              label="Total Redemptions"
              value={data?.stats.totalRedemptions ?? 0}
            />
          </>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                : data?.codes.map((code) => {
                    const status = getCodeStatus(code)
                    return (
                      <TableRow key={code.id}>
                        <TableCell>
                          <code className="text-sm font-mono text-foreground">{code.code}</code>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {code.label || '\u2014'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{code.uses_count}</span>
                          <span className="text-muted-foreground">
                            {code.max_uses !== null ? ` / ${code.max_uses}` : ' / \u221e'}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {format(new Date(code.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {code.expires_at
                            ? format(new Date(code.expires_at), 'MMM d, yyyy')
                            : 'Never'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={code.is_active}
                            onCheckedChange={() => handleToggleActive(code)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyCode(code.code)}
                              title="Copy code"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewUsages(code.id)}
                              title="View usages"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(code.id)}
                              className="text-muted-foreground hover:text-destructive"
                              title="Deactivate"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
            </TableBody>
          </Table>
        </div>

        {!isLoading && (!data?.codes || data.codes.length === 0) && (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">No invite codes generated yet</p>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invite Codes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Label</label>
              <Input
                placeholder='e.g. "Beta batch 1"'
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Optional label to identify this batch</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Max Uses Per Code</label>
              <Input
                type="number"
                placeholder="Unlimited"
                min={1}
                value={formMaxUses}
                onChange={(e) => setFormMaxUses(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty for unlimited uses</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Expiration Date</label>
              <Input
                type="datetime-local"
                value={formExpiresAt}
                onChange={(e) => setFormExpiresAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty for no expiration</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Number of Codes</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={formCount}
                onChange={(e) => setFormCount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Generate up to 50 codes at once</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Invite Code</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the invite code. Users will no longer be able to sign up with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Usages Sheet */}
      <Sheet open={!!usagesCodeId} onOpenChange={(open) => !open && setUsagesCodeId(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Code Usage Details</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {usagesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : usages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No one has used this code yet
              </p>
            ) : (
              <div className="space-y-3">
                {usages.map((usage) => (
                  <div
                    key={usage.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="text-sm font-medium">{usage.user_email}</p>
                      <p className="text-xs text-muted-foreground">
                        via {usage.signup_method} &middot; {format(new Date(usage.used_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <Badge variant="outline">{usage.signup_method}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
