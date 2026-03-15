'use client'

/**
 * EditTagDialog Component
 *
 * Dialog for editing an existing study tag.
 */

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
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
import { STUDY_TAG_GROUPS, TAG_COLORS } from '@/types/study-tags'
import type { StudyTag, StudyTagGroup } from '@/types/study-tags'

interface EditTagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, color: string, group: StudyTagGroup) => Promise<void>
  tag: StudyTag | null
}

export function EditTagDialog({
  open,
  onOpenChange,
  onSave,
  tag,
}: EditTagDialogProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(TAG_COLORS[0])
  const [group, setGroup] = useState<StudyTagGroup>('custom')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when tag changes
  useEffect(() => {
    if (tag) {
      setName(tag.name)
      setColor(tag.color)
      setGroup((tag.tag_group as StudyTagGroup) || 'custom')
      setError(null)
    }
  }, [tag])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Tag name is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave(name.trim(), color, group)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tag')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>
              Update the tag details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="tag-name">Name</Label>
              <Input
                id="tag-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Mobile App, Q1 2025, Checkout Flow"
                autoFocus
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full transition-all ${
                      color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-primary' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Group */}
            <div className="space-y-2">
              <Label htmlFor="tag-group">Category</Label>
              <Select value={group} onValueChange={(v) => setGroup(v as StudyTagGroup)}>
                <SelectTrigger id="tag-group">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STUDY_TAG_GROUPS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: `${color}20`,
                    color: color,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {name || 'Tag Name'}
                </span>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
