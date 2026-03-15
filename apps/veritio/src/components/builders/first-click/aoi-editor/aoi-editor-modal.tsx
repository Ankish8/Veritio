'use client'

import { useState, useCallback } from 'react'
import { X, Save } from 'lucide-react'
import type { FirstClickTaskWithDetails } from '@/stores/study-builder'
import type { FirstClickAOI } from '@veritio/study-types'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AOICanvas } from './aoi-canvas'

interface AOIEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: FirstClickTaskWithDetails
  onSave: (aois: FirstClickAOI[]) => void
}

export function AOIEditorModal({
  open,
  onOpenChange,
  task,
  onSave,
}: AOIEditorModalProps) {
  const [localAOIs, setLocalAOIs] = useState<FirstClickAOI[]>(task.aois ?? [])

  // Reset local state when dialog opens
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (newOpen) {
      setLocalAOIs(task.aois ?? [])
    }
    onOpenChange(newOpen)
  }, [task.aois, onOpenChange])

  const handleSave = useCallback(() => {
    onSave(localAOIs)
  }, [localAOIs, onSave])

  const handleCancel = useCallback(() => {
    setLocalAOIs(task.aois ?? [])
    onOpenChange(false)
  }, [task.aois, onOpenChange])

  if (!task.image) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col w-[98vw] h-[98vh] max-w-[98vw] max-h-[98vh] p-0 gap-0" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <DialogTitle className="text-lg font-semibold">
              Set correct areas for Task {task.position + 1}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {task.instruction || 'No instruction'}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AOICanvas
            image={task.image}
            aois={localAOIs}
            onAOIsChange={setLocalAOIs}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

