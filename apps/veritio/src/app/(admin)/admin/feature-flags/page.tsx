'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/shared/admin-page-header'
import { AdminErrorState } from '@/components/admin/shared/admin-error-state'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { getAuthFetchInstance } from '@/lib/swr'

interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string | null
  enabled: boolean
  scope: string
  updated_at: string
}

interface FeatureFlagsResponse {
  flags: FeatureFlag[]
}

export default function AdminFeatureFlagsPage() {
  const { data, error, isLoading, mutate } = useSWR<FeatureFlagsResponse>(
    '/api/admin/feature-flags',
    { refreshInterval: 60000 }
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formKey, setFormKey] = useState('')
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formEnabled, setFormEnabled] = useState(false)
  const [formScope, setFormScope] = useState('global')

  const resetForm = () => {
    setFormKey('')
    setFormName('')
    setFormDescription('')
    setFormEnabled(false)
    setFormScope('global')
  }

  const handleCreateFlag = async () => {
    if (!formKey.trim() || !formName.trim()) {
      toast.error('Key and name are required')
      return
    }

    setSaving(true)
    try {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: formKey.trim(),
          name: formName.trim(),
          description: formDescription.trim() || null,
          enabled: formEnabled,
          scope: formScope,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create feature flag')
      }

      toast.success('Feature flag created')
      setDialogOpen(false)
      resetForm()
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create feature flag')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleFlag = async (flag: FeatureFlag) => {
    try {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: flag.id, key: flag.key, name: flag.name, enabled: !flag.enabled }),
      })

      if (!response.ok) {
        throw new Error('Failed to update feature flag')
      }

      mutate()
      toast.success(`${flag.name} ${!flag.enabled ? 'enabled' : 'disabled'}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update flag')
    }
  }

  const handleDeleteFlag = async () => {
    if (!deleteId) return

    try {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch(`/api/admin/feature-flags/${deleteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete feature flag')
      }

      toast.success('Feature flag deleted')
      setDeleteId(null)
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete flag')
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <AdminPageHeader title="Feature Flags" />
        <AdminErrorState message={error.message} onRetry={() => mutate()} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Feature Flags"
        description="Toggle features on and off across the platform"
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Flag
          </Button>
        }
      />

      <div className="rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Enabled</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                : data?.flags.map((flag) => (
                    <TableRow key={flag.id}>
                      <TableCell>
                        <code className="text-sm font-mono text-foreground">{flag.key}</code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{flag.name}</span>
                          {flag.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={() => handleToggleFlag(flag)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{flag.scope}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(flag.updated_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(flag.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>

        {!isLoading && (!data?.flags || data.flags.length === 0) && (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">No feature flags configured</p>
          </div>
        )}
      </div>

      {/* Add Flag Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Feature Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Key</label>
              <Input
                placeholder="e.g. enable_new_dashboard"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
              <Input
                placeholder="e.g. New Dashboard"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
              <Input
                placeholder="Optional description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Enabled</label>
              <Switch checked={formEnabled} onCheckedChange={setFormEnabled} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Scope</label>
              <Select value={formScope} onValueChange={setFormScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFlag} disabled={saving}>
              {saving ? 'Creating...' : 'Create Flag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature Flag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feature flag? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFlag}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
