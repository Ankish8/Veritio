'use client'

import { useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { X, Tag, Loader2, Plus } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { PARTICIPANT_STATUS } from '@/lib/supabase/panel-types'
import type { PanelParticipantInsert } from '@/lib/supabase/panel-types'
import type { PanelTagWithCount } from '@/services/panel'

interface CreateParticipantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: PanelParticipantInsert & { tag_ids?: string[] }) => Promise<void>
  availableTags: PanelTagWithCount[]
  onCreateTag?: (name: string, color: string) => Promise<{ id: string; name: string; color: string }>
}

const TAG_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
]

export function CreateParticipantDialog({
  open,
  onOpenChange,
  onSubmit,
  availableTags,
  onCreateTag,
}: CreateParticipantDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<PanelParticipantInsert & { tag_ids?: string[] }>({
    email: '',
    first_name: '',
    last_name: '',
    status: 'active',
    source: 'manual',
    tag_ids: [],
  })
  const [showNewTagInput, setShowNewTagInput] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [isCreatingTag, setIsCreatingTag] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSubmit(formData)
      toast.success('Participant created successfully')
      onOpenChange(false)
      // Reset form
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        status: 'active',
        source: 'manual',
        tag_ids: [],
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create participant')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleTag = (tagId: string) => {
    const currentTags = formData.tag_ids || []
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter((id) => id !== tagId)
      : [...currentTags, tagId]
    setFormData({ ...formData, tag_ids: newTags })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl">Add Participant</DialogTitle>
            <DialogDescription>
              Create a new participant record in your panel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="participant@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                autoFocus
              />
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name" className="text-sm font-medium">
                  First Name
                </Label>
                <Input
                  id="first-name"
                  placeholder="John"
                  value={formData.first_name || ''}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name" className="text-sm font-medium">
                  Last Name
                </Label>
                <Input
                  id="last-name"
                  placeholder="Doe"
                  value={formData.last_name || ''}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as any })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARTICIPANT_STATUS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-3.5 w-3.5" />
                Tags
              </Label>
              <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/30 min-h-[60px]">
                {availableTags.map((tag) => {
                  const isSelected = formData.tag_ids?.includes(tag.id)
                  return (
                    <Badge
                      key={tag.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-all hover:scale-105',
                        isSelected && 'border-transparent'
                      )}
                      style={
                        isSelected
                          ? { backgroundColor: tag.color, borderColor: tag.color }
                          : { borderColor: tag.color + '60', color: tag.color }
                      }
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                      {isSelected && <X className="h-3 w-3 ml-1" />}
                    </Badge>
                  )
                })}

                {/* New Tag Input */}
                {showNewTagInput && onCreateTag ? (
                  <div className="flex items-center gap-2 w-full mt-2">
                    <Input
                      placeholder="Tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="h-8 text-sm flex-1"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      {TAG_COLORS.slice(0, 5).map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={cn(
                            'w-5 h-5 rounded-full border-2 transition-transform',
                            newTagColor === color ? 'scale-110 border-foreground' : 'border-transparent'
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewTagColor(color)}
                        />
                      ))}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => {
                        setShowNewTagInput(false)
                        setNewTagName('')
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8"
                      disabled={!newTagName.trim() || isCreatingTag}
                      onClick={async () => {
                        if (!newTagName.trim()) return
                        setIsCreatingTag(true)
                        try {
                          const newTag = await onCreateTag(newTagName.trim(), newTagColor)
                          setFormData((prev) => ({
                            ...prev,
                            tag_ids: [...(prev.tag_ids || []), newTag.id],
                          }))
                          setNewTagName('')
                          setShowNewTagInput(false)
                          toast.success(`Tag "${newTag.name}" created`)
                        } catch {
                          toast.error('Failed to create tag')
                        } finally {
                          setIsCreatingTag(false)
                        }
                      }}
                    >
                      {isCreatingTag ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                    </Button>
                  </div>
                ) : onCreateTag ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowNewTagInput(true)}
                  >
                    <Plus className="h-3 w-3" />
                    New Tag
                  </Button>
                ) : availableTags.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No tags available</span>
                ) : null}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.email}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Participant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
