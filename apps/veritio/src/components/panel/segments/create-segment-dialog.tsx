'use client'

import { useState, useCallback, useEffect } from 'react'
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
import { Loader2, Users, Eye } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { usePanelSegments } from '@/hooks/panel/use-panel-segments'
import { SegmentConditionBuilder } from './segment-condition-builder'
import type { PanelSegment, SegmentCondition } from '@/lib/supabase/panel-types'

interface CreateSegmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  segment?: PanelSegment | null // For edit mode
  onSuccess?: () => void
}

export function CreateSegmentDialog({
  open,
  onOpenChange,
  segment,
  onSuccess,
}: CreateSegmentDialogProps) {
  const { createSegment, updateSegment, previewSegment } = usePanelSegments()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewCount, setPreviewCount] = useState<number | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [conditions, setConditions] = useState<SegmentCondition[]>([])

  const isEditMode = !!segment

  // Reset form when dialog opens or segment changes
  useEffect(() => {
    if (open) {
      if (segment) {
        setName(segment.name)
        setDescription(segment.description || '')
        setConditions(segment.conditions || [])
      } else {
        setName('')
        setDescription('')
        setConditions([])
      }
      setPreviewCount(null)
    }
  }, [open, segment])

  const handlePreview = useCallback(async () => {
    if (conditions.length === 0) {
      toast.error('Add at least one condition to preview')
      return
    }

    setIsPreviewing(true)
    try {
      const result = await previewSegment(conditions)
      setPreviewCount(result.count)
    } catch {
      toast.error('Failed to preview segment')
    } finally {
      setIsPreviewing(false)
    }
  }, [conditions, previewSegment])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Name is required')
      return
    }

    if (conditions.length === 0) {
      toast.error('Add at least one condition')
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditMode && segment) {
        await updateSegment(segment.id, {
          name: name.trim(),
          description: description.trim() || null,
          conditions,
        })
        toast.success('Segment updated')
      } else {
        await createSegment({
          name: name.trim(),
          description: description.trim() || null,
          conditions,
        })
        toast.success('Segment created')
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save segment')
    } finally {
      setIsSubmitting(false)
    }
  }, [name, description, conditions, isEditMode, segment, createSegment, updateSegment, onOpenChange, onSuccess])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isEditMode ? 'Edit Segment' : 'Create Segment'}
            </DialogTitle>
            <DialogDescription>
              Define conditions to dynamically filter participants. All conditions must match (AND logic).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Name & Description */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="segment-name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="segment-name"
                  placeholder="e.g., Power Users"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="segment-description" className="text-sm font-medium">
                  Description
                </Label>
                <Input
                  id="segment-description"
                  placeholder="Brief description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Conditions */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Conditions</Label>
              <SegmentConditionBuilder
                conditions={conditions}
                onChange={setConditions}
              />
            </div>

            {/* Preview */}
            {conditions.length > 0 && (
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    {previewCount !== null ? (
                      <>
                        <p className="font-semibold text-lg">{previewCount}</p>
                        <p className="text-xs text-muted-foreground">matching participants</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">Preview segment</p>
                        <p className="text-xs text-muted-foreground">See how many participants match</p>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={isPreviewing || conditions.length === 0}
                >
                  {isPreviewing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || conditions.length === 0}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditMode ? 'Save Changes' : 'Create Segment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
