'use client'

import { useState } from 'react'
import { Bookmark, Check, Copy } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EscapeHint } from '@/components/ui/keyboard-shortcut-hint'

interface SaveProgressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaveToDevice: () => Promise<void>
  onGetResumeLink: () => Promise<string> // Returns resume URL directly
}

type DialogState = 'options' | 'link-generated' | 'saved-to-device'

export function SaveProgressDialog({
  open,
  onOpenChange,
  onSaveToDevice,
  onGetResumeLink,
}: SaveProgressDialogProps) {
  const [state, setState] = useState<DialogState>('options')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resumeUrl, setResumeUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSaveToDevice = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await onSaveToDevice()
      setState('saved-to-device')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save progress')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGetLink = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const url = await onGetResumeLink()
      setResumeUrl(url)
      setState('link-generated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (resumeUrl) {
      await navigator.clipboard.writeText(resumeUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    // Reset state when closing
    setState('options')
    setError(null)
    setResumeUrl(null)
    setCopied(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {state === 'options' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bookmark className="h-5 w-5" />
                Save Your Progress
              </DialogTitle>
              <DialogDescription>
                Choose how you&apos;d like to save your progress and continue later.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Save to Device Option */}
              <button
                onClick={handleSaveToDevice}
                disabled={isLoading}
                className="flex items-start gap-4 p-4 rounded-lg transition-colors text-left hover:opacity-90"
                style={{
                  border: '1px solid var(--style-border-muted)',
                  backgroundColor: 'var(--style-card-bg)',
                }}
              >
                <div
                  className="flex-shrink-0 p-2 rounded-lg"
                  style={{ backgroundColor: 'var(--brand-subtle)' }}
                >
                  <Bookmark className="h-5 w-5" style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <h3 className="font-medium" style={{ color: 'var(--style-text-primary)' }}>Save to this device</h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--style-text-secondary)' }}>
                    Your progress will be saved in this browser. Return to this same
                    device to continue.
                  </p>
                </div>
              </button>

              {/* Get Link Option */}
              <button
                onClick={handleGetLink}
                disabled={isLoading}
                className="flex items-start gap-4 p-4 rounded-lg transition-colors text-left hover:opacity-90"
                style={{
                  border: '1px solid var(--style-border-muted)',
                  backgroundColor: 'var(--style-card-bg)',
                }}
              >
                <div
                  className="flex-shrink-0 p-2 rounded-lg"
                  style={{ backgroundColor: 'var(--brand-subtle)' }}
                >
                  <Copy className="h-5 w-5" style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <h3 className="font-medium" style={{ color: 'var(--style-text-primary)' }}>Get a resume link</h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--style-text-secondary)' }}>
                    Get a link you can save or share to continue on any device.
                    Valid for 7 days.
                  </p>
                </div>
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
                <EscapeHint />
              </Button>
            </DialogFooter>
          </>
        )}

        {state === 'link-generated' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                Link Ready!
              </DialogTitle>
              <DialogDescription>
                Copy this link to continue your survey later from any device.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {resumeUrl && (
                <div className="space-y-2">
                  <Label className="text-xs" style={{ color: 'var(--style-text-muted)' }}>
                    Your resume link (valid for 7 days):
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={resumeUrl}
                      className="text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="flex-shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div
                className="rounded-lg p-4"
                style={{
                  backgroundColor: 'var(--brand-subtle)',
                  border: '1px solid var(--brand-light)',
                }}
              >
                <p className="text-sm" style={{ color: 'var(--style-text-primary)' }}>
                  Save this link somewhere safe - you can use it to continue from
                  any browser or device.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>
                Done
                <EscapeHint variant="dark" />
              </Button>
            </DialogFooter>
          </>
        )}

        {state === 'saved-to-device' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                Progress Saved!
              </DialogTitle>
              <DialogDescription>
                Your progress has been saved to this device.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div
                className="rounded-lg p-4"
                style={{
                  backgroundColor: 'var(--brand-subtle)',
                  border: '1px solid var(--brand-light)',
                }}
              >
                <p className="text-sm" style={{ color: 'var(--style-text-primary)' }}>
                  When you return to this survey on the same browser, we&apos;ll
                  automatically restore your progress. Your answers are saved locally
                  on this device.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>
                Done
                <EscapeHint variant="dark" />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
