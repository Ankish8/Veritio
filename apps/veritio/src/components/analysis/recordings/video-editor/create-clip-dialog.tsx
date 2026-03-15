'use client'

import { useState, useCallback, useEffect } from 'react'
import { Loader2, Clock } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { formatDuration } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'

export interface CreateClipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  startMs: number
  endMs: number
  onCreateClip: (data: {
    startMs: number
    endMs: number
    title: string
    description?: string
  }) => Promise<unknown>
}

/**
 * Dialog for creating a new clip with title and description.
 *
 * Features:
 * - Shows the selected time range with duration
 * - Title field (required)
 * - Description field (optional)
 * - Loading state during save
 */
export function CreateClipDialog({
  open,
  onOpenChange,
  startMs,
  endMs,
  onCreateClip,
}: CreateClipDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
    }
  }, [open])

  const duration = endMs - startMs

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Please enter a clip title')
      return
    }

    setIsCreating(true)

    try {
      await onCreateClip({
        startMs,
        endMs,
        title: title.trim(),
        description: description.trim() || undefined,
      })

      toast.success('Clip created successfully')
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to create clip', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsCreating(false)
    }
  }, [title, description, startMs, endMs, onCreateClip, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Clip</DialogTitle>
          <DialogDescription>
            Save a highlighted section of the recording as a clip.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Time range display */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 flex items-center gap-2 text-sm">
              <span className="font-medium">{formatDuration(startMs)}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">{formatDuration(endMs)}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {formatDuration(duration)}
            </Badge>
          </div>

          {/* Title field */}
          <div className="space-y-2">
            <Label htmlFor="clip-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="clip-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this clip a descriptive name..."
              autoFocus
              maxLength={200}
            />
          </div>

          {/* Description field */}
          <div className="space-y-2">
            <Label htmlFor="clip-description">Description</Label>
            <Textarea
              id="clip-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about why this moment is important..."
              rows={3}
              maxLength={1000}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !title.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Clip'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
