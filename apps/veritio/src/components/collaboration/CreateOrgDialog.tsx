'use client'


import { useState, useCallback, useEffect, type FormEvent } from 'react'
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
import { useOrganizations } from '@/hooks/use-organizations'
import type { Organization } from '@/lib/supabase/collaboration-types'
import { toast } from '@/components/ui/sonner'


interface CreateOrgDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (org: Organization) => void
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
}

function validateForm(name: string, slug: string): { name?: string; slug?: string } {
  const errors: { name?: string; slug?: string } = {}

  if (!name || name.length < 2) {
    errors.name = 'Name must be at least 2 characters'
  } else if (name.length > 50) {
    errors.name = 'Name must be less than 50 characters'
  }

  if (!slug || slug.length < 2) {
    errors.slug = 'Slug must be at least 2 characters'
  } else if (slug.length > 30) {
    errors.slug = 'Slug must be less than 30 characters'
  } else if (!/^[a-z0-9-]+$/.test(slug)) {
    errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens'
  }

  return errors
}

export function CreateOrgDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateOrgDialogProps) {
  const { createOrganization } = useOrganizations()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({})

  useEffect(() => {
    if (name) {
      setSlug(generateSlug(name))
    }
  }, [name])

  useEffect(() => {
    if (!open) {
      setName('')
      setSlug('')
      setErrors({})
      setError(null)
    }
  }, [open])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const validationErrors = validateForm(name, slug)
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors)
        return
      }

      setIsSubmitting(true)
      setError(null)
      setErrors({})

      try {
        const org = await createOrganization({ name, slug })
        toast.success('Team created!', {
          description: `"${org.name}" is ready. You can now invite members.`,
        })
        onCreated?.(org)
        onOpenChange(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create organization')
      } finally {
        setIsSubmitting(false)
      }
    },
    [createOrganization, name, slug, onCreated, onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            Create a new team to collaborate with others on your projects and studies.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name</Label>
            <Input
              id="name"
              placeholder="Acme Research"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Team URL</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">veritio.io/</span>
              <Input
                id="slug"
                placeholder="acme-research"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={isSubmitting}
                className="flex-1"
              />
            </div>
            {errors.slug && (
              <p className="text-sm text-destructive">{errors.slug}</p>
            )}
            <p className="text-xs text-muted-foreground">
              This will be used in URLs for your team&apos;s shared resources.
            </p>
          </div>

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
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
